import { clickRepository } from '../repositories/clickRepository.js';
import { urlRepository } from '../repositories/urlRepository.js';
import { config } from '../config/env.js';

export class AnalyticsService {
  constructor(clickRepo = clickRepository, urlRepo = urlRepository) {
    this.clickRepo = clickRepo;
    this.urlRepo = urlRepo;
  }

  /**
   * Helper to verify user ownership of a short link
   */
  _verifyOwnership(url, ownerId = null) {
    if (!url) return;
    if (url.ownerId || url.userId) {
      const linkOwner = url.ownerId || url.userId;
      if (!ownerId) {
        const error = new Error('Authentication required to access analytics for this link.');
        error.statusCode = 401;
        throw error;
      }
      if (String(linkOwner) !== String(ownerId)) {
        const error = new Error('You do not have permission to view analytics for this link.');
        error.statusCode = 403;
        throw error;
      }
    }
  }

  /**
   * Resolves target URL ID(s) scoped by ownership:
   * - If specific urlId provided: verifies caller owns it
   * - If ownerId provided: resolves all URL IDs owned by that user
   * - Otherwise: returns null (global scope for unauthenticated or admin queries)
   */
  async _resolveScopedUrlIds(urlId = null, ownerId = null) {
    if (urlId) {
      const url = await this.urlRepo.findById(urlId);
      if (!url) {
        const error = new Error('URL not found');
        error.statusCode = 404;
        throw error;
      }
      this._verifyOwnership(url, ownerId);
      return urlId;
    }
    if (ownerId) {
      const userUrls = await this.urlRepo.findAll({ ownerId, limit: 5000 });
      return userUrls.items.map((u) => u.id);
    }
    return null;
  }

  /**
   * Parse range parameters consistently: accepts range ('24h', '7d', '30d', '90d', 'custom')
   * or legacy 'days' query (e.g. 7, 30).
   */
  _normalizeRange({ range = null, days = null, startDate = null, endDate = null } = {}) {
    let effectiveRange = range;
    if (!effectiveRange && days) {
      effectiveRange = `${days}d`;
    }
    if (!effectiveRange && (startDate || endDate)) {
      effectiveRange = 'custom';
    }
    if (!effectiveRange) {
      effectiveRange = '30d';
    }
    return {
      range: effectiveRange,
      startDate,
      endDate
    };
  }

  async getOverallSummary({
    range = '30d',
    days = null,
    startDate = null,
    endDate = null,
    includeBots = false,
    ownerId = null
  } = {}) {
    await this.urlRepo.init();
    await this.clickRepo.init();

    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });
    const scopedUrlId = await this._resolveScopedUrlIds(null, ownerId);

    // Link counts and analytics strictly scoped to owner
    const [totalLinks, activeLinks, clickStats, topPerforming, recentClicks] = await Promise.all([
      this.urlRepo.countAll(ownerId ? { ownerId } : {}),
      this.urlRepo.countActive(ownerId ? { ownerId } : {}),
      this.clickRepo.getSummary(scopedUrlId, { ...rangeConfig, includeBots }),
      this.urlRepo.findTopPerforming(6, ownerId ? { ownerId } : {}),
      this.clickRepo.findRecent(12, { urlId: scopedUrlId, includeBots })
    ]);

    const topUrls = topPerforming.map((u) => ({
      id: u.id,
      code: u.code,
      title: u.title || u.code,
      longUrl: u.longUrl,
      shortUrl: `${config.publicUrl}/${u.code}`,
      clicks: u.clicks || 0,
      isActive: u.isActive
    }));

    return {
      totalLinks,
      activeLinks,
      totalClicks: clickStats.totalClicks,
      periodClicks: clickStats.periodClicks,
      previousClicks: clickStats.previousClicks,
      clicksToday: clickStats.clicksToday,
      uniqueVisitors: clickStats.uniqueVisitors,
      previousUniques: clickStats.previousUniques,
      clicksChangePct: clickStats.clicksChangePct,
      uniquesChangePct: clickStats.uniquesChangePct,
      dateRange: clickStats.dateRange,
      topUrls,
      recentClicks
    };
  }

  async getUrlAnalytics(
    urlId,
    {
      range = '30d',
      days = null,
      startDate = null,
      endDate = null,
      includeBots = false,
      ownerId = null
    } = {}
  ) {
    await this.urlRepo.init();
    await this.clickRepo.init();

    const url = await this.urlRepo.findById(urlId);
    if (!url) {
      const error = new Error('URL not found');
      error.statusCode = 404;
      throw error;
    }

    this._verifyOwnership(url, ownerId);
    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });

    const [
      summary,
      timeseries,
      devices,
      browsers,
      os,
      referrers,
      countries,
      recentClicksRes
    ] = await Promise.all([
      this.clickRepo.getSummary(urlId, { ...rangeConfig, includeBots }),
      this.clickRepo.getTimeseries({ urlId, ...rangeConfig, includeBots }),
      this.clickRepo.getDeviceBreakdown({ urlId, ...rangeConfig, includeBots }),
      this.clickRepo.getBrowserBreakdown({ urlId, ...rangeConfig, includeBots }),
      this.clickRepo.getOsBreakdown({ urlId, ...rangeConfig, includeBots }),
      this.clickRepo.getReferrerBreakdown({ urlId, ...rangeConfig, includeBots }),
      this.clickRepo.getCountryBreakdown({ urlId, ...rangeConfig, includeBots }),
      this.clickRepo.findClicks({ urlId, limit: 25, page: 1, ...rangeConfig, includeBots })
    ]);

    const { passwordHash, ...safeUrl } = url;

    return {
      url: {
        ...safeUrl,
        shortUrl: `${config.publicUrl}/${url.code}`
      },
      summary: {
        totalClicks: summary.totalClicks,
        periodClicks: summary.periodClicks,
        previousClicks: summary.previousClicks,
        clicksToday: summary.clicksToday,
        uniqueVisitors: summary.uniqueVisitors,
        previousUniques: summary.previousUniques,
        clicksChangePct: summary.clicksChangePct,
        uniquesChangePct: summary.uniquesChangePct,
        dateRange: summary.dateRange
      },
      timeseries,
      devices,
      browsers,
      os,
      referrers,
      countries,
      recentClicks: recentClicksRes.items,
      pagination: recentClicksRes.pagination
    };
  }

  async getTimeseries({ range = '7d', days = null, startDate = null, endDate = null, urlId = null, ownerId = null, includeBots = false } = {}) {
    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.getTimeseries({ urlId: scopedUrlId, ...rangeConfig, includeBots });
  }

  async getDevices({ range = '30d', days = null, startDate = null, endDate = null, urlId = null, ownerId = null, includeBots = false } = {}) {
    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.getDeviceBreakdown({ urlId: scopedUrlId, ...rangeConfig, includeBots });
  }

  async getBrowsers({ range = '30d', days = null, startDate = null, endDate = null, urlId = null, ownerId = null, includeBots = false } = {}) {
    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.getBrowserBreakdown({ urlId: scopedUrlId, ...rangeConfig, includeBots });
  }

  async getOs({ range = '30d', days = null, startDate = null, endDate = null, urlId = null, ownerId = null, includeBots = false } = {}) {
    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.getOsBreakdown({ urlId: scopedUrlId, ...rangeConfig, includeBots });
  }

  async getReferrers({ range = '30d', days = null, startDate = null, endDate = null, urlId = null, ownerId = null, includeBots = false } = {}) {
    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.getReferrerBreakdown({ urlId: scopedUrlId, ...rangeConfig, includeBots });
  }

  async getCountries({ range = '30d', days = null, startDate = null, endDate = null, urlId = null, ownerId = null, includeBots = false } = {}) {
    const rangeConfig = this._normalizeRange({ range, days, startDate, endDate });
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.getCountryBreakdown({ urlId: scopedUrlId, ...rangeConfig, includeBots });
  }

  async getClicks(params = {}) {
    const { urlId, ownerId } = params;
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.findClicks({
      ...params,
      urlId: scopedUrlId
    });
  }

  async exportCsv({ urlId = null, range = '30d', startDate = null, endDate = null, includeBots = false, ownerId = null } = {}) {
    const scopedUrlId = await this._resolveScopedUrlIds(urlId, ownerId);
    return this.clickRepo.exportCsv({ urlId: scopedUrlId, range, startDate, endDate, includeBots });
  }
}

export const analyticsService = new AnalyticsService();
