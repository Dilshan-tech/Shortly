import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { urlRepository } from '../repositories/urlRepository.js';
import { clickRepository } from '../repositories/clickRepository.js';
import { validateUrl } from '../utils/urlValidator.js';
import { generateShortCode, validateCustomAlias } from '../utils/codeGenerator.js';
import { parseClientMetadata } from '../utils/deviceParser.js';
import { config } from '../config/env.js';

// In-memory verification tokens cache for password-protected links: token -> { code, expiresAt }
const verificationTokens = new Map();

// Periodic cleanup of expired verification tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of verificationTokens.entries()) {
    if (data.expiresAt < now) {
      verificationTokens.delete(token);
    }
  }
}, 60000);

export class UrlService {
  constructor(urlRepo = urlRepository, clickRepo = clickRepository) {
    this.urlRepo = urlRepo;
    this.clickRepo = clickRepo;
  }

  /**
   * Helper to attach dynamic shortUrl and strip sensitive fields (passwordHash).
   */
  sanitizeUrl(record) {
    if (!record) return null;
    const { passwordHash, ...safeRecord } = record;
    return {
      ...safeRecord,
      shortUrl: `${config.publicUrl}/${record.code}`
    };
  }

  /**
   * Create a new short URL.
   */
  async createShortUrl({
    longUrl,
    customAlias,
    expiresAt,
    clickLimit,
    password,
    isOneTimeUse = false,
    title = ''
  }) {
    // 1. Validate long URL
    const urlValidation = validateUrl(longUrl);
    if (!urlValidation.valid) {
      const error = new Error(urlValidation.error);
      error.statusCode = 400;
      throw error;
    }
    const destinationUrl = urlValidation.normalizedUrl;

    // 2. Determine short code or validate custom alias
    let code;
    if (customAlias && customAlias.trim()) {
      const trimmedAlias = customAlias.trim();
      const aliasValidation = validateCustomAlias(trimmedAlias);
      if (!aliasValidation.valid) {
        const error = new Error(aliasValidation.error);
        error.statusCode = 400;
        throw error;
      }

      // Check if alias already exists
      const existing = await this.urlRepo.findByCode(trimmedAlias);
      if (existing) {
        const error = new Error(`Alias "${trimmedAlias}" is already taken. Please choose another.`);
        error.statusCode = 409;
        throw error;
      }
      code = trimmedAlias;
    } else {
      // Generate unique short code with collision retries
      let attempts = 0;
      let foundCode = null;
      while (attempts < 5) {
        const candidate = generateShortCode(config.shortCodeLength + Math.floor(attempts / 2));
        const collision = await this.urlRepo.findByCode(candidate);
        if (!collision) {
          foundCode = candidate;
          break;
        }
        attempts++;
      }

      if (!foundCode) {
        const error = new Error('Failed to generate a unique short code. Please try again.');
        error.statusCode = 500;
        throw error;
      }
      code = foundCode;
    }

    // 3. Expiry date validation
    let validExpiresAt = null;
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime())) {
        const error = new Error('Invalid expiration date format.');
        error.statusCode = 400;
        throw error;
      }
      if (expDate <= new Date()) {
        const error = new Error('Expiration date must be in the future.');
        error.statusCode = 400;
        throw error;
      }
      validExpiresAt = expDate.toISOString();
    }

    // 4. Click limit validation
    let validClickLimit = null;
    if (clickLimit !== undefined && clickLimit !== null && clickLimit !== '') {
      const parsedLimit = parseInt(clickLimit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        const error = new Error('Click limit must be a positive integer (minimum 1).');
        error.statusCode = 400;
        throw error;
      }
      validClickLimit = parsedLimit;
    }

    // 5. Password protection hashing
    let passwordHash = null;
    const isPasswordProtected = Boolean(password && password.trim());
    if (isPasswordProtected) {
      if (password.length < 4 || password.length > 64) {
        const error = new Error('Password must be between 4 and 64 characters long.');
        error.statusCode = 400;
        throw error;
      }
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // 6. Create record
    const id = crypto.randomUUID();
    const newRecord = await this.urlRepo.create({
      id,
      code,
      longUrl: destinationUrl,
      title: (title || '').trim().slice(0, 100),
      customAlias: customAlias ? customAlias.trim() : null,
      passwordHash,
      isPasswordProtected,
      expiresAt: validExpiresAt,
      clickLimit: validClickLimit,
      isOneTimeUse: Boolean(isOneTimeUse),
      isActive: true
    });

    return this.sanitizeUrl(newRecord);
  }

  /**
   * Verify password for a password-protected short link.
   * Returns a temporary verification token (valid for 5 minutes).
   */
  async verifyPassword(code, password) {
    if (!code || !password) {
      const error = new Error('Short code and password are required');
      error.statusCode = 400;
      throw error;
    }

    const record = await this.urlRepo.findByCode(code);
    if (!record || !record.isActive) {
      const error = new Error('Link not found or is currently inactive');
      error.statusCode = 404;
      throw error;
    }

    if (!record.isPasswordProtected || !record.passwordHash) {
      const error = new Error('This link is not password protected');
      error.statusCode = 400;
      throw error;
    }

    const matches = await bcrypt.compare(password, record.passwordHash);
    if (!matches) {
      const error = new Error('Incorrect password');
      error.statusCode = 401;
      throw error;
    }

    // Generate short-lived verification token
    const token = crypto.randomBytes(24).toString('hex');
    verificationTokens.set(token, {
      code: record.code.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    return {
      success: true,
      token,
      redirectUrl: `/${record.code}?token=${token}`
    };
  }

  /**
   * Check if a token is valid for a code.
   */
  isValidToken(code, token) {
    if (!token) return false;
    const entry = verificationTokens.get(token);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      verificationTokens.delete(token);
      return false;
    }
    return entry.code === code.toLowerCase();
  }

  /**
   * Process a link redirect request.
   */
  async resolveRedirect(code, req) {
    const record = await this.urlRepo.findByCode(code);
    if (!record) {
      return { status: 'not_found' };
    }

    // Check expiry date
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return { status: 'expired', reason: 'time_expired', record: this.sanitizeUrl(record) };
    }

    // Check click limit
    if (record.clickLimit && record.clicks >= record.clickLimit) {
      return { status: 'expired', reason: 'limit_reached', record: this.sanitizeUrl(record) };
    }

    // Check active
    if (!record.isActive) {
      return { status: 'disabled', record: this.sanitizeUrl(record) };
    }

    // Check password protection
    if (record.isPasswordProtected) {
      const token = req.query?.token;
      if (!this.isValidToken(code, token)) {
        return {
          status: 'password_required',
          code: record.code,
          title: record.title || 'Protected Link'
        };
      }
    }

    // Fast asynchronous tracking: update click count & log event without blocking redirect response
    const clientMeta = parseClientMetadata(
      req.headers['user-agent'] || '',
      req.ip || req.connection?.remoteAddress || '',
      req.headers['referer'] || req.headers['referrer'] || ''
    );

    // Increment click and persist event
    this.urlRepo.incrementClicks(record.id).catch((err) => {
      console.error('[UrlService] Error incrementing clicks:', err);
    });

    this.clickRepo.recordClick({
      urlId: record.id,
      code: record.code,
      ...clientMeta
    }).catch((err) => {
      console.error('[UrlService] Error recording click event:', err);
    });

    return {
      status: 'redirect',
      destinationUrl: record.longUrl
    };
  }

  async getAllUrls(query) {
    const result = await this.urlRepo.findAll(query);
    return {
      items: result.items.map((item) => this.sanitizeUrl(item)),
      pagination: result.pagination
    };
  }

  async getUrlById(id) {
    const record = await this.urlRepo.findById(id);
    return this.sanitizeUrl(record);
  }

  async getUrlByCode(code) {
    const record = await this.urlRepo.findByCode(code);
    return this.sanitizeUrl(record);
  }

  async updateUrl(id, updates) {
    const existing = await this.urlRepo.findById(id);
    if (!existing) {
      const error = new Error('URL record not found');
      error.statusCode = 404;
      throw error;
    }

    const safeUpdates = {};

    if (updates.longUrl && updates.longUrl !== existing.longUrl) {
      const validation = validateUrl(updates.longUrl);
      if (!validation.valid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        throw error;
      }
      safeUpdates.longUrl = validation.normalizedUrl;
    }

    if (updates.title !== undefined) {
      safeUpdates.title = (updates.title || '').trim().slice(0, 100);
    }

    if (updates.isActive !== undefined) {
      safeUpdates.isActive = Boolean(updates.isActive);
    }

    if (updates.expiresAt !== undefined) {
      if (updates.expiresAt === null || updates.expiresAt === '') {
        safeUpdates.expiresAt = null;
      } else {
        const d = new Date(updates.expiresAt);
        if (isNaN(d.getTime())) {
          const error = new Error('Invalid expiration date format');
          error.statusCode = 400;
          throw error;
        }
        safeUpdates.expiresAt = d.toISOString();
      }
    }

    if (updates.clickLimit !== undefined) {
      if (updates.clickLimit === null || updates.clickLimit === '') {
        safeUpdates.clickLimit = null;
      } else {
        const limit = parseInt(updates.clickLimit, 10);
        if (isNaN(limit) || limit < 1) {
          const error = new Error('Click limit must be a positive integer');
          error.statusCode = 400;
          throw error;
        }
        safeUpdates.clickLimit = limit;
      }
    }

    // Password update
    if (updates.password !== undefined) {
      if (updates.password === null || updates.password === '') {
        // Remove password protection
        safeUpdates.isPasswordProtected = false;
        safeUpdates.passwordHash = null;
      } else {
        if (updates.password.length < 4 || updates.password.length > 64) {
          const error = new Error('Password must be between 4 and 64 characters');
          error.statusCode = 400;
          throw error;
        }
        safeUpdates.isPasswordProtected = true;
        safeUpdates.passwordHash = await bcrypt.hash(updates.password.trim(), 10);
      }
    }

    const updated = await this.urlRepo.update(id, safeUpdates);
    return this.sanitizeUrl(updated);
  }

  async deleteUrl(id) {
    const record = await this.urlRepo.findById(id);
    if (!record) {
      const error = new Error('URL record not found');
      error.statusCode = 404;
      throw error;
    }

    await this.urlRepo.delete(id);
    // Delete associated clicks
    await this.clickRepo.deleteByUrlId(id);
    return true;
  }

  async bulkDelete(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const error = new Error('An array of URL IDs is required');
      error.statusCode = 400;
      throw error;
    }
    const count = await this.urlRepo.bulkDelete(ids);
    await this.clickRepo.bulkDeleteByUrlIds(ids);
    return { count };
  }

  async bulkStatus(ids, isActive) {
    if (!Array.isArray(ids) || ids.length === 0) {
      const error = new Error('An array of URL IDs is required');
      error.statusCode = 400;
      throw error;
    }
    const count = await this.urlRepo.bulkUpdateStatus(ids, isActive);
    return { count };
  }
}

export const urlService = new UrlService();
