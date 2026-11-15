import { urlService } from '../services/urlService.js';

export const urlController = {
  async create(req, res, next) {
    try {
      // Security: ownerId must only come from verified authenticated session, never untrusted client body
      const ownerId = req.user?.id || null;
      const { ownerId: _ignored, ...sanitizedBody } = req.body;
      const result = await urlService.createShortUrl({
        ...sanitizedBody,
        ownerId
      });
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const { search, status, sortBy, sortOrder, page, limit } = req.query;
      // Security: strictly scope to authenticated user id, ignoring client-supplied ownerId query
      const ownerId = req.user ? req.user.id : null;

      const result = await urlService.getAllUrls({
        search,
        status,
        sortBy,
        sortOrder,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        ownerId
      });
      res.json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const result = await urlService.getUrlById(id);
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'URL record not found'
        });
      }

      // Check user ownership if URL is private/owned
      if (result.ownerId || result.userId) {
        const linkOwner = String(result.ownerId || result.userId);
        if (!req.user || (req.user.id !== linkOwner && req.user.role !== 'admin')) {
          return res.status(403).json({
            success: false,
            error: 'You do not have permission to view this URL.'
          });
        }
      }

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async getByCode(req, res, next) {
    try {
      const { code } = req.params;
      const result = await urlService.getUrlByCode(code);
      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'URL not found for specified code'
        });
      }
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = await urlService.updateUrl(id, req.body, req.user);
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const { id } = req.params;
      await urlService.deleteUrl(id, req.user);
      res.json({
        success: true,
        message: 'URL deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  },

  async bulkDelete(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await urlService.bulkDelete(ids, req.user);
      res.json({
        success: true,
        message: `Deleted ${result.count} links`,
        deletedCount: result.count
      });
    } catch (err) {
      next(err);
    }
  },

  async bulkStatus(req, res, next) {
    try {
      const { ids, isActive } = req.body;
      const result = await urlService.bulkStatus(ids, isActive, req.user);
      res.json({
        success: true,
        message: `Updated status for ${result.count} links`,
        updatedCount: result.count
      });
    } catch (err) {
      next(err);
    }
  },

  async verifyPassword(req, res, next) {
    try {
      const { code } = req.params;
      const { password } = req.body;
      const result = await urlService.verifyPassword(code, password);
      res.json({
        success: true,
        ...result
      });
    } catch (err) {
      next(err);
    }
  }
};
