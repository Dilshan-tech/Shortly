import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository.js';
import { config } from '../config/env.js';
import { anonymizeIp } from '../utils/deviceParser.js';

export class AuthService {
  constructor(userRepo = userRepository) {
    this.userRepo = userRepo;
  }

  /**
   * Validate password complexity:
   * Minimum 8 characters, containing at least one letter and one number
   */
  validatePasswordStrength(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required.' };
    }
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters long.' };
    }
    if (password.length > 128) {
      return { valid: false, error: 'Password cannot exceed 128 characters.' };
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one letter and one number.' };
    }
    return { valid: true };
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email address is required.' };
    }
    const clean = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean) || clean.length > 254) {
      return { valid: false, error: 'Please enter a valid email address.' };
    }
    return { valid: true, email: clean.toLowerCase() };
  }

  /**
   * Hash a raw secret into a SHA-256 string for secure database storage
   */
  _hashTokenSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Generate Access and Refresh token pair with session registration
   */
  async generateTokens(user, { userAgent = '', ip = '' } = {}) {
    const userId = user.id || user._id.toString();

    // 1. Create short-lived Access Token JWT
    const accessToken = jwt.sign(
      {
        sub: userId,
        email: user.email,
        role: user.role || 'user'
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // 2. Create long-lived Refresh Token with unique session secret
    const tokenId = crypto.randomUUID();
    const tokenSecret = crypto.randomBytes(32).toString('hex');
    const tokenHash = this._hashTokenSecret(tokenSecret);

    const refreshToken = jwt.sign(
      {
        sub: userId,
        tokenId,
        secret: tokenSecret
      },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );

    // Calculate expiration timestamp (e.g. 7 days from now)
    const decoded = jwt.decode(refreshToken);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Persist hashed session in MongoDB
    await this.userRepo.addRefreshToken(userId, {
      tokenId,
      tokenHash,
      expiresAt,
      userAgent,
      ip: anonymizeIp(ip)
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwtExpiresIn
    };
  }

  /**
   * Register a new user
   */
  async register({ email, password, name = '', req = null }) {
    const emailValidation = this.validateEmail(email);
    if (!emailValidation.valid) {
      const error = new Error(emailValidation.error);
      error.statusCode = 400;
      throw error;
    }

    const passwordValidation = this.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      const error = new Error(passwordValidation.error);
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = emailValidation.email;

    // Check duplicate email
    const existing = await this.userRepo.findByEmail(cleanEmail);
    if (existing) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }

    const user = await this.userRepo.create({
      email: cleanEmail,
      password,
      name: name.trim()
    });

    const userAgent = req?.headers?.['user-agent'] || '';
    const ip = req?.ip || req?.connection?.remoteAddress || '';
    const tokens = await this.generateTokens(user, { userAgent, ip });

    return {
      user,
      ...tokens
    };
  }

  /**
   * Login user with generic error handling to prevent account enumeration
   */
  async login({ email, password, req = null }) {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.trim().toLowerCase();
    const userWithPassword = await this.userRepo.findByEmail(cleanEmail, { includePassword: true });

    // Always use generic error to prevent email harvesting
    if (!userWithPassword || !userWithPassword.passwordHash) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    if (!userWithPassword.isActive) {
      const error = new Error('Account is disabled. Please contact support.');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, userWithPassword.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const { passwordHash, ...safeUser } = userWithPassword;
    const userAgent = req?.headers?.['user-agent'] || '';
    const ip = req?.ip || req?.connection?.remoteAddress || '';
    const tokens = await this.generateTokens(safeUser, { userAgent, ip });

    return {
      user: safeUser,
      ...tokens
    };
  }

  /**
   * Refresh session and rotate tokens
   */
  async refreshSession(rawRefreshToken, req = null) {
    if (!rawRefreshToken) {
      const error = new Error('Refresh token is required.');
      error.statusCode = 401;
      throw error;
    }

    let payload;
    try {
      payload = jwt.verify(rawRefreshToken, config.jwtRefreshSecret);
    } catch {
      const error = new Error('Invalid or expired refresh token.');
      error.statusCode = 401;
      throw error;
    }

    const { sub: userId, tokenId, secret } = payload;
    if (!userId || !tokenId || !secret) {
      const error = new Error('Malformed refresh token.');
      error.statusCode = 401;
      throw error;
    }

    const tokenHash = this._hashTokenSecret(secret);
    const isValidSession = await this.userRepo.verifyRefreshToken(userId, tokenId, tokenHash);

    if (!isValidSession) {
      const error = new Error('Session has been revoked or expired.');
      error.statusCode = 401;
      throw error;
    }

    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('User not found or account disabled.');
      error.statusCode = 401;
      throw error;
    }

    // Rotate session: remove old refresh token, generate new token pair
    await this.userRepo.removeRefreshToken(userId, tokenId);

    const userAgent = req?.headers?.['user-agent'] || '';
    const ip = req?.ip || req?.connection?.remoteAddress || '';
    const newTokens = await this.generateTokens(user, { userAgent, ip });

    return {
      user,
      ...newTokens
    };
  }

  /**
   * Invalidate a single session on logout
   */
  async logout(rawRefreshToken) {
    if (!rawRefreshToken) return false;
    try {
      const payload = jwt.verify(rawRefreshToken, config.jwtRefreshSecret);
      if (payload?.sub && payload?.tokenId) {
        await this.userRepo.removeRefreshToken(payload.sub, payload.tokenId);
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Invalidate all sessions across devices
   */
  async logoutAll(userId) {
    if (!userId) return false;
    await this.userRepo.clearAllRefreshTokens(userId);
    return true;
  }

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('User not found or account is deactivated.');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  /**
   * Update user name
   */
  async updateProfile(userId, { name }) {
    if (name === undefined || name === null) {
      const error = new Error('Name is required.');
      error.statusCode = 400;
      throw error;
    }
    return this.userRepo.update(userId, { name: name.trim() });
  }

  /**
   * Update email with password confirmation safeguard
   */
  async updateEmail(userId, { newEmail, currentPassword }) {
    if (!newEmail || !currentPassword) {
      const error = new Error('New email address and current password are required.');
      error.statusCode = 400;
      throw error;
    }

    const emailValidation = this.validateEmail(newEmail);
    if (!emailValidation.valid) {
      const error = new Error(emailValidation.error);
      error.statusCode = 400;
      throw error;
    }

    const userWithPassword = await this.userRepo.findById(userId, { includePassword: true });
    if (!userWithPassword || !userWithPassword.passwordHash) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, userWithPassword.passwordHash);
    if (!isMatch) {
      const error = new Error('Current password is incorrect.');
      error.statusCode = 401;
      throw error;
    }

    const cleanEmail = emailValidation.email;
    if (cleanEmail === userWithPassword.email) {
      return userWithPassword;
    }

    // Check uniqueness
    const collision = await this.userRepo.findByEmail(cleanEmail);
    if (collision) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      throw error;
    }

    return this.userRepo.update(userId, { email: cleanEmail });
  }

  /**
   * Change password and invalidate all other sessions
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      const error = new Error('Current password and new password are required.');
      error.statusCode = 400;
      throw error;
    }

    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      const error = new Error(passwordValidation.error);
      error.statusCode = 400;
      throw error;
    }

    const userWithPassword = await this.userRepo.findById(userId, { includePassword: true });
    if (!userWithPassword || !userWithPassword.passwordHash) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, userWithPassword.passwordHash);
    if (!isMatch) {
      const error = new Error('Current password is incorrect.');
      error.statusCode = 401;
      throw error;
    }

    if (currentPassword === newPassword) {
      const error = new Error('New password must be different from current password.');
      error.statusCode = 400;
      throw error;
    }

    // Updates password and invalidates all active refresh tokens
    const updatedUser = await this.userRepo.updatePassword(userId, newPassword);
    return updatedUser;
  }

  /**
   * Delete account with password confirmation and cascading data cleanup
   */
  async deleteAccount(userId, { currentPassword }) {
    if (!currentPassword) {
      const error = new Error('Password confirmation is required to delete your account.');
      error.statusCode = 400;
      throw error;
    }

    const userWithPassword = await this.userRepo.findById(userId, { includePassword: true });
    if (!userWithPassword || !userWithPassword.passwordHash) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, userWithPassword.passwordHash);
    if (!isMatch) {
      const error = new Error('Password confirmation is incorrect.');
      error.statusCode = 401;
      throw error;
    }

    const deleted = await this.userRepo.deleteAccount(userId);
    return deleted;
  }
}

export const authService = new AuthService();
