import { analyticsService } from '../services/analyticsService.js';

export const analyticsController = {
  async summary(req, res, next) {
    try {
      const data = await analyticsService.getOverallSummary();
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
      const { days, urlId } = req.query;
      const data = await analyticsService.getTimeseries({
        days: days ? parseInt(days, 10) : 7,
        urlId
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
      const { urlId } = req.query;
      const data = await analyticsService.getDevices({ urlId });
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
      const { urlId } = req.query;
      const data = await analyticsService.getBrowsers({ urlId });
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
      const { urlId } = req.query;
      const data = await analyticsService.getReferrers({ urlId });
      res.json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  async urlAnalytics(req, res, next) {
    try {
      const { id } = req.params;
      const { days } = req.query;
      const data = await analyticsService.getUrlAnalytics(id, {
        days: days ? parseInt(days, 10) : 30
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
