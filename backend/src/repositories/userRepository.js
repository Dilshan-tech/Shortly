import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Url } from '../models/Url.js';
import { Click } from '../models/Click.js';
import { isDatabaseConnected } from '../config/database.js';

export class UserRepository {
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
      await User.init();
    } catch (err) {
      console.warn('⚠️ [UserRepository] User model index initialization warning:', err.message);
    }
  }

  _formatUserDoc(doc, includePassword = false) {
    if (!doc) return null;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    obj.id = (obj._id || obj.id).toString();
    delete obj._id;
    delete obj.__v;
    if (!includePassword) {
      delete obj.passwordHash;
    }
    delete obj.refreshTokens;
    if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.toISOString();
    if (obj.updatedAt instanceof Date) obj.updatedAt = obj.updatedAt.toISOString();
    return obj;
  }

  _buildIdFilter(id) {
    if (!id) return { _id: null };
    if (mongoose.Types.ObjectId.isValid(id)) {
      return { _id: new mongoose.Types.ObjectId(id) };
    }
    return { _id: id };
  }

  /**
   * Register a new user with bcrypt password hashing
   */
  async create({ email, password, name = '', role = 'user' }) {
    this.assertConnected();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Hash password securely with 10 salt rounds
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const doc = await User.create({
        email: cleanEmail,
        passwordHash,
        name: (name || '').trim(),
        role: role === 'admin' ? 'admin' : 'user',
        isActive: true,
        refreshTokens: []
      });

      return this._formatUserDoc(doc);
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error('An account with this email address already exists.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email, { includePassword = false } = {}) {
    this.assertConnected();
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const doc = await User.findOne({ email: cleanEmail }).lean();
    return this._formatUserDoc(doc, includePassword);
  }

  /**
   * Find user by ID
   */
  async findById(id, { includePassword = false } = {}) {
    this.assertConnected();
    const filter = this._buildIdFilter(id);
    const doc = await User.findOne(filter).lean();
    return this._formatUserDoc(doc, includePassword);
  }

  /**
   * Update profile fields (name, email)
   */
  async update(id, updates = {}) {
    this.assertConnected();
    const filter = this._buildIdFilter(id);
    const allowed = {};

    if (updates.name !== undefined) {
      allowed.name = updates.name.trim();
    }
    if (updates.email !== undefined) {
      allowed.email = updates.email.trim().toLowerCase();
    }
    if (updates.isActive !== undefined) {
      allowed.isActive = Boolean(updates.isActive);
    }

    try {
      const doc = await User.findOneAndUpdate(
        filter,
        { $set: allowed },
        { returnDocument: 'after', runValidators: true }
      ).lean();

      return this._formatUserDoc(doc);
    } catch (err) {
      if (err.code === 11000) {
        const error = new Error('An account with this email address already exists.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  /**
   * Update password and invalidate all existing refresh tokens
   */
  async updatePassword(id, newPassword) {
    this.assertConnected();
    const filter = this._buildIdFilter(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const doc = await User.findOneAndUpdate(
      filter,
      {
        $set: { passwordHash, refreshTokens: [] } // Invalidate all active sessions
      },
      { returnDocument: 'after' }
    ).lean();

    return this._formatUserDoc(doc);
  }

  /**
   * Add a refresh token session
   */
  async addRefreshToken(userId, { tokenId, tokenHash, expiresAt, userAgent = '', ip = '' }) {
    this.assertConnected();
    const filter = this._buildIdFilter(userId);
    const now = new Date();

    // Atomically prune expired sessions and append new session
    await User.updateOne(filter, {
      $pull: { refreshTokens: { expiresAt: { $lte: now } } }
    });

    await User.updateOne(filter, {
      $push: {
        refreshTokens: {
          tokenId,
          tokenHash,
          expiresAt: new Date(expiresAt),
          userAgent: (userAgent || '').slice(0, 300),
          ip: ip || 'unknown',
          createdAt: now
        }
      }
    });

    return true;
  }

  /**
   * Verify refresh token session existence and validity
   */
  async verifyRefreshToken(userId, tokenId, tokenHash) {
    this.assertConnected();
    const filter = this._buildIdFilter(userId);
    const now = new Date();

    const user = await User.findOne({
      ...filter,
      isActive: true,
      refreshTokens: {
        $elemMatch: {
          tokenId,
          tokenHash,
          expiresAt: { $gt: now }
        }
      }
    }).lean();

    return Boolean(user);
  }

  /**
   * Remove a specific session (single logout)
   */
  async removeRefreshToken(userId, tokenId) {
    this.assertConnected();
    const filter = this._buildIdFilter(userId);
    await User.updateOne(filter, {
      $pull: { refreshTokens: { tokenId } }
    });
    return true;
  }

  /**
   * Clear all sessions (logout from all devices)
   */
  async clearAllRefreshTokens(userId) {
    this.assertConnected();
    const filter = this._buildIdFilter(userId);
    await User.updateOne(filter, {
      $set: { refreshTokens: [] }
    });
    return true;
  }

  /**
   * Delete account and cascade delete associated URLs and clicks
   */
  async deleteAccount(userId) {
    this.assertConnected();
    const userFilter = this._buildIdFilter(userId);
    const idStr = userId.toString();

    // 1. Find all URLs owned by this user
    const userUrls = await Url.find({
      $or: [
        { ownerId: idStr },
        { userId: idStr },
        ...(mongoose.Types.ObjectId.isValid(userId)
          ? [{ ownerId: new mongoose.Types.ObjectId(userId) }, { userId: new mongoose.Types.ObjectId(userId) }]
          : [])
      ]
    }).select('id _id').lean();

    const urlIds = userUrls.map((u) => u.id || u._id.toString());
    const objectIds = userUrls.map((u) => u._id);

    // 2. Cascade delete all Click events for user's URLs
    if (urlIds.length > 0) {
      await Click.deleteMany({
        $or: [
          { urlId: { $in: urlIds } },
          { url: { $in: objectIds } }
        ]
      });
      // 3. Cascade delete all URLs owned by user
      await Url.deleteMany({
        $or: [
          { id: { $in: urlIds } },
          { _id: { $in: objectIds } }
        ]
      });
    }

    // 4. Delete user record
    const res = await User.deleteOne(userFilter);
    return res.deletedCount > 0;
  }
}

export const userRepository = new UserRepository();
