import path from 'path';
import { AtomicStorage } from '../utils/atomicStorage.js';
import { config } from '../config/env.js';

export class UrlRepository {
  constructor(storageDir = config.dataDir) {
    this.storage = new AtomicStorage(path.join(storageDir, 'urls.json'));
    // In-memory indexes for O(1) lookups
    this.urlsById = new Map();
    this.urlsByCode = new Map();
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    const records = await this.storage.read([]);
    this.urlsById.clear();
    this.urlsByCode.clear();

    for (const record of records) {
      this.urlsById.set(record.id, record);
      this.urlsByCode.set(record.code.toLowerCase(), record);
    }
    this.isInitialized = true;
  }

  async _persist() {
    const records = Array.from(this.urlsById.values());
    await this.storage.write(records);
  }

  async findAll({ search = '', status = 'all', sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = {}) {
    await this.init();
    let records = Array.from(this.urlsById.values());
    const now = new Date();

    // Filter by search query
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(
        (u) =>
          u.code.toLowerCase().includes(q) ||
          u.longUrl.toLowerCase().includes(q) ||
          (u.title && u.title.toLowerCase().includes(q))
      );
    }

    // Filter by status
    if (status === 'active') {
      records = records.filter((u) => {
        if (!u.isActive) return false;
        if (u.expiresAt && new Date(u.expiresAt) < now) return false;
        if (u.clickLimit && u.clicks >= u.clickLimit) return false;
        return true;
      });
    } else if (status === 'disabled') {
      records = records.filter((u) => !u.isActive);
    } else if (status === 'expired') {
      records = records.filter((u) => {
        const isTimeExpired = u.expiresAt && new Date(u.expiresAt) < now;
        const isLimitReached = u.clickLimit && u.clicks >= u.clickLimit;
        return isTimeExpired || isLimitReached;
      });
    }

    // Sorting
    records.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'expiresAt') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = records.length;
    const startIndex = (page - 1) * limit;
    const items = records.slice(startIndex, startIndex + limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  async findById(id) {
    await this.init();
    return this.urlsById.get(id) || null;
  }

  async findByCode(code) {
    await this.init();
    if (!code) return null;
    return this.urlsByCode.get(code.toLowerCase()) || null;
  }

  async create(urlData) {
    await this.init();
    const record = {
      ...urlData,
      clicks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.urlsById.set(record.id, record);
    this.urlsByCode.set(record.code.toLowerCase(), record);

    // Queue asynchronous persistent write
    this._persist().catch((err) => {
      console.error('[UrlRepository] Error persisting new URL:', err);
    });

    return record;
  }

  async update(id, updates) {
    await this.init();
    const existing = this.urlsById.get(id);
    if (!existing) return null;

    const oldCode = existing.code.toLowerCase();
    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
      updatedAt: new Date().toISOString()
    };

    if (updates.code && updates.code.toLowerCase() !== oldCode) {
      this.urlsByCode.delete(oldCode);
      this.urlsByCode.set(updated.code.toLowerCase(), updated);
    } else {
      this.urlsByCode.set(updated.code.toLowerCase(), updated);
    }

    this.urlsById.set(id, updated);
    this._persist().catch((err) => {
      console.error('[UrlRepository] Error persisting URL update:', err);
    });

    return updated;
  }

  async incrementClicks(id) {
    await this.init();
    const record = this.urlsById.get(id);
    if (!record) return null;

    record.clicks = (record.clicks || 0) + 1;
    record.updatedAt = new Date().toISOString();

    // Check if one-time use was consumed
    if (record.isOneTimeUse) {
      record.isActive = false;
    }

    this._persist().catch((err) => {
      console.error('[UrlRepository] Error persisting click increment:', err);
    });

    return record;
  }

  async delete(id) {
    await this.init();
    const record = this.urlsById.get(id);
    if (!record) return false;

    this.urlsById.delete(id);
    this.urlsByCode.delete(record.code.toLowerCase());

    await this._persist();
    return true;
  }

  async bulkDelete(ids) {
    await this.init();
    let deletedCount = 0;
    for (const id of ids) {
      const record = this.urlsById.get(id);
      if (record) {
        this.urlsById.delete(id);
        this.urlsByCode.delete(record.code.toLowerCase());
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      await this._persist();
    }
    return deletedCount;
  }

  async bulkUpdateStatus(ids, isActive) {
    await this.init();
    let updatedCount = 0;
    const now = new Date().toISOString();
    for (const id of ids) {
      const record = this.urlsById.get(id);
      if (record) {
        record.isActive = Boolean(isActive);
        record.updatedAt = now;
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      await this._persist();
    }
    return updatedCount;
  }

  async flush() {
    await this.storage.flush();
  }
}

// Singleton repository instance
export const urlRepository = new UrlRepository();
