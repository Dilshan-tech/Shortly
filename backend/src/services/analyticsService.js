import { clickRepository } from '../repositories/clickRepository.js';
import { urlRepository } from '../repositories/urlRepository.js';
import { config } from '../config/env.js';

export class AnalyticsService {
  constructor(clickRepo = clickRepository, urlRepo = urlRepository) {
    this.clickRepo = clickRepo;
    this.urlRepo = urlRepo;
  }

  async getOverallSummary() {
    await this.urlRepo.init();
    await this.clickRepo.init();

    const urls = Array.from(this.urlRepo.urlsById.values());
    const totalLinks = urls.length;
    const now = new Date();

    const activeLinks = urls.filter((u) => {
      if (!u.isActive) return false;
      if (u.expiresAt && new Date(u.expiresAt) < now) return false;
      if (u.clickLimit && u.clicks >= u.clickLimit) return false;
      return true;
    }).length;

    const clickStats = await this.clickRepo.getSummary();

    // Top 5 performing links
    const topUrls = [...urls]
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        code: u.code,
        title: u.title || u.code,
        longUrl: u.longUrl,
        shortUrl: `${config.publicUrl}/${u.code}`,
        clicks: u.clicks || 0,
        isActive: u.isActive
      }));

    // Recent 10 clicks
    const recentClicks = await this.clickRepo.findRecent(10);

    return {
      totalLinks,
      activeLinks,
      totalClicks: clickStats.totalClicks,
      clicksToday: clickStats.clicksToday,
      uniqueVisitors: clickStats.uniqueVisitors,
      topUrls,
      recentClicks
    };
  }

  async getTimeseries({ days = 7, urlId = null } = {}) {
    return this.clickRepo.getTimeseries({ days, urlId });
  }

  async getDevices({ urlId = null } = {}) {
    return this.clickRepo.getDeviceBreakdown({ urlId });
  }

  async getBrowsers({ urlId = null } = {}) {
    return this.clickRepo.getBrowserBreakdown({ urlId });
  }

  async getOs({ urlId = null } = {}) {
    return this.clickRepo.getOsBreakdown({ urlId });
  }

  async getReferrers({ urlId = null } = {}) {
    return this.clickRepo.getReferrerBreakdown({ urlId });
  }

  async getUrlAnalytics(urlId, { days = 30 } = {}) {
    const url = await this.urlRepo.findById(urlId);
    if (!url) {
      const error = new Error('URL not found');
      error.statusCode = 404;
      throw error;
    }

    const summary = await this.clickRepo.getSummary(urlId);
    const timeseries = await this.clickRepo.getTimeseries({ days, urlId });
    const devices = await this.clickRepo.getDeviceBreakdown({ urlId });
    const browsers = await this.clickRepo.getBrowserBreakdown({ urlId });
    const os = await this.clickRepo.getOsBreakdown({ urlId });
    const referrers = await this.clickRepo.getReferrerBreakdown({ urlId });
    const recentClicks = (await this.clickRepo.findByUrlId(urlId, { limit: 20 })).items;

    const { passwordHash, ...safeUrl } = url;

    return {
      url: {
        ...safeUrl,
        shortUrl: `${config.publicUrl}/${url.code}`
      },
      summary: {
        totalClicks: summary.totalClicks,
        clicksToday: summary.clicksToday,
        uniqueVisitors: summary.uniqueVisitors
      },
      timeseries,
      devices,
      browsers,
      os,
      referrers,
      recentClicks
    };
  }
}

export const analyticsService = new AnalyticsService();
