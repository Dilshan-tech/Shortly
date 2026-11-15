import mongoose from 'mongoose';
import { Url } from '../models/Url.js';
import { isDatabaseConnected } from '../config/database.js';

export class UrlRepository {
  /**
   * Asserts that MongoDB Atlas is connected before executing any database operation.
   * Prevents silently starting or accepting requests when the database is unavailable.
   */
  assertConnected() {
    if (!isDatabaseConnected()) {
      const error = new Error('Database service unavailable. MongoDB Atlas is not connected.');
      error.statusCode = 503;
      throw error;
    }
  }

  async init() {
    this.assertConnected();
    try {
      await Url.init();
    } catch (err) {
      console.warn('⚠️ [UrlRepository] Model index initialization warning:', err.message);
    }
  }

  /**
   * Formats a Mongoose document or plain object into a clean serializable record
   */
  _formatDoc(doc) {
    if (!doc) return null;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    delete obj._id;
    delete obj.__v;
    if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.toISOString();
    if (obj.updatedAt instanceof Date) obj.updatedAt = obj.updatedAt.toISOString();
    if (obj.expiresAt instanceof Date) obj.expiresAt = obj.expiresAt.toISOString();
    return obj;
  }

  /**
   * Build MongoDB ID filter matching either string UUID id or ObjectId _id
   */
  _buildIdFilter(id) {
    if (!id) return { id: null };
    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id)) {
      return { $or: [{ id }, { _id: id }] };
    }
    return { id };
  }

  async findAll({
    search = '',
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
    ownerId = null
  } = {}) {
    this.assertConnected();
    const now = new Date();
    const conditions = [];

    // Search query across code, longUrl, or title
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      conditions.push({
        $or: [
          { code: new RegExp(escaped, 'i') },
          { longUrl: new RegExp(escaped, 'i') },
          { title: new RegExp(escaped, 'i') }
        ]
      });
    }

    // Status filter
    if (status === 'active') {
      conditions.push({ isActive: true });
      conditions.push({ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
      conditions.push({ $or: [{ clickLimit: null }, { $expr: { $lt: ['$clicks', '$clickLimit'] } }] });
    } else if (status === 'disabled') {
      conditions.push({ isActive: false });
    } else if (status === 'expired') {
      conditions.push({
        $or: [
          { expiresAt: { $lte: now } },
          { $and: [{ clickLimit: { $ne: null } }, { $expr: { $gte: ['$clicks', '$clickLimit'] } }] }
        ]
      });
    }

    // Owner filter if specified
    if (ownerId) {
      conditions.push({
        $or: [{ ownerId }, { userId: ownerId }]
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDir };

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const total = await Url.countDocuments(query);
    const docs = await Url.find(query)
      .sort(sort)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean();

    return {
      items: docs.map((d) => this._formatDoc(d)),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit) || 1
      }
    };
  }

  async findById(id) {
    this.assertConnected();
    const filter = this._buildIdFilter(id);
    const doc = await Url.findOne(filter).lean();
    return this._formatDoc(doc);
  }

  async findByCode(code) {
    this.assertConnected();
    if (!code) return null;
    const escaped = code.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await Url.findOne({ code: new RegExp(`^${escaped}$`, 'i') }).lean();
    return this._formatDoc(doc);
  }

  async findByOwner(ownerId, { page = 1, limit = 20 } = {}) {
    return this.findAll({ ownerId, page, limit });
  }

  async create(urlData) {
    this.assertConnected();
    try {
      const record = {
        ...urlData,
        clicks: 0
      };
      const doc = await Url.create(record);
      return this._formatDoc(doc.toJSON());
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error('A link with this short code or custom alias already exists.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  async update(id, updates) {
    this.assertConnected();
    const filter = this._buildIdFilter(id);
    try {
      const doc = await Url.findOneAndUpdate(
        filter,
        { $set: updates },
        { returnDocument: 'after', runValidators: true }
      ).lean();

      return this._formatDoc(doc);
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error('The specified custom alias or short code is already in use.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  /**
   * Concurrency-safe atomic click increment:
   * Enforces click limits and deactivates one-time use links atomically
   * so simultaneous requests cannot exceed limits or double-redirect.
   */
  async atomicIncrementClicks(id, { isOneTimeUse = false } = {}) {
    this.assertConnected();
    const filter = this._buildIdFilter(id);
    const now = new Date();

    const query = {
      ...filter,
      isActive: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ clickLimit: null }, { $expr: { $lt: ['$clicks', '$clickLimit'] } }] },
        // For one-time links, only allow if clicks is currently 0
        { $or: [{ isOneTimeUse: false }, { isOneTimeUse: true, clicks: 0 }] }
      ]
    };

    const update = {
      $inc: { clicks: 1 },
      $set: { updatedAt: now }
    };

    // If one-time use is requested, atomically deactivate in the very same update
    if (isOneTimeUse) {
      update.$set.isActive = false;
    }

    const doc = await Url.findOneAndUpdate(query, update, { returnDocument: 'after' }).lean();

    if (!doc) {
      const existing = await Url.findOne(filter).lean();
      if (!existing) return { allowed: false, reason: 'not_found' };
      if (!existing.isActive) return { allowed: false, reason: 'disabled', record: this._formatDoc(existing) };
      if (existing.expiresAt && new Date(existing.expiresAt) <= now) {
        return { allowed: false, reason: 'time_expired', record: this._formatDoc(existing) };
      }
      if (existing.clickLimit && existing.clicks >= existing.clickLimit) {
        return { allowed: false, reason: 'limit_reached', record: this._formatDoc(existing) };
      }
      if (existing.isOneTimeUse && existing.clicks >= 1) {
        return { allowed: false, reason: 'one_time_consumed', record: this._formatDoc(existing) };
      }
      return { allowed: false, reason: 'limit_reached', record: this._formatDoc(existing) };
    }

    // Safety fallback: if document is marked isOneTimeUse in DB but caller didn't pass isOneTimeUse option
    if (doc.isOneTimeUse && doc.isActive) {
      await Url.updateOne({ _id: doc._id }, { $set: { isActive: false } });
      doc.isActive = false;
    }

    return { allowed: true, record: this._formatDoc(doc) };
  }

  async incrementClicks(id) {
    const res = await this.atomicIncrementClicks(id);
    return res.allowed ? res.record : null;
  }

  async delete(id) {
    this.assertConnected();
    const filter = this._buildIdFilter(id);
    const res = await Url.deleteOne(filter);
    return res.deletedCount > 0;
  }

  async bulkDelete(ids, ownerId = null) {
    this.assertConnected();
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const idCondition = {
      $or: [{ id: { $in: ids } }, ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : [])]
    };
    const query = ownerId
      ? { $and: [idCondition, { $or: [{ ownerId }, { userId: ownerId }] }] }
      : idCondition;

    const res = await Url.deleteMany(query);
    return res.deletedCount || 0;
  }

  async bulkUpdateStatus(ids, isActive, ownerId = null) {
    this.assertConnected();
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const idCondition = {
      $or: [{ id: { $in: ids } }, ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : [])]
    };
    const query = ownerId
      ? { $and: [idCondition, { $or: [{ ownerId }, { userId: ownerId }] }] }
      : idCondition;

    const res = await Url.updateMany(query, {
      $set: { isActive: Boolean(isActive), updatedAt: new Date() }
    });
    return res.modifiedCount || 0;
  }

  async countAll(filter = {}) {
    this.assertConnected();
    const query = {};
    if (filter.ownerId) {
      query.$or = [{ ownerId: filter.ownerId }, { userId: filter.ownerId }];
    }
    return Url.countDocuments(query);
  }

  async countActive(filter = {}) {
    this.assertConnected();
    const now = new Date();
    const query = {
      isActive: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ clickLimit: null }, { $expr: { $lt: ['$clicks', '$clickLimit'] } }] }
      ]
    };
    if (filter.ownerId) {
      query.$or = [{ ownerId: filter.ownerId }, { userId: filter.ownerId }];
    }
    return Url.countDocuments(query);
  }

  async findTopPerforming(limit = 5, filter = {}) {
    this.assertConnected();
    const query = {};
    if (filter.ownerId) {
      query.$or = [{ ownerId: filter.ownerId }, { userId: filter.ownerId }];
    }
    const docs = await Url.find(query).sort({ clicks: -1 }).limit(limit).lean();
    return docs.map((d) => this._formatDoc(d));
  }

  async flush() {
    // No-op for MongoDB (Mongoose writes are immediately committed to Atlas)
  }
}

// Singleton repository instance
export const urlRepository = new UrlRepository();
