import { analyticsService } from '../services/analyticsService.js';

function extractAuthOwner(req) {
  // Security: strictly enforce authenticated session identity; never trust unauthenticated query or headers
  return req.user?.id || null;
}

export const analyticsController = {
  async summary(req, res, next) {
    try {
      const { range, days, startDate, endDate, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getOverallSummary({
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async timeseries(req, res, next) {
    try {
      const { range, days, startDate, endDate, urlId, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getTimeseries({
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        urlId,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async devices(req, res, next) {
    try {
      const { range, days, startDate, endDate, urlId, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getDevices({
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        urlId,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async browsers(req, res, next) {
    try {
      const { range, days, startDate, endDate, urlId, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getBrowsers({
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        urlId,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async os(req, res, next) {
    try {
      const { range, days, startDate, endDate, urlId, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getOs({
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        urlId,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async referrers(req, res, next) {
    try {
      const { range, days, startDate, endDate, urlId, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getReferrers({
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        urlId,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async countries(req, res, next) {
    try {
      const { range, days, startDate, endDate, urlId, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getCountries({
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        urlId,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async clicks(req, res, next) {
    try {
      const { urlId, search, device, browser, country, page, limit, range, startDate, endDate, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getClicks({
        urlId,
        search,
        device,
        browser,
        country,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        range,
        startDate,
        endDate,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data: data.items,
        pagination: data.pagination
      });
    } catch (err) {
      next(err);
    }
  },

  async exportCsv(req, res, next) {
    try {
      const { urlId, range, startDate, endDate, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const csvData = await analyticsService.exportCsv({
        urlId,
        range,
        startDate,
        endDate,
        includeBots: includeBots === 'true',
        ownerId
      });

      const filename = urlId ? `shortly-clicks-${urlId}.csv` : `shortly-clicks-export.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvData);
    } catch (err) {
      next(err);
    }
  },

  async urlAnalytics(req, res, next) {
    try {
      const { id } = req.params;
      const { range, days, startDate, endDate, includeBots } = req.query;
      const ownerId = extractAuthOwner(req);
      const data = await analyticsService.getUrlAnalytics(id, {
        range,
        days: days ? parseInt(days, 10) : null,
        startDate,
        endDate,
        includeBots: includeBots === 'true',
        ownerId
      });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  }
};
