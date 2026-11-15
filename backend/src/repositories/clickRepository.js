import crypto from 'crypto';
import mongoose from 'mongoose';
import { Click } from '../models/Click.js';
import { isDatabaseConnected } from '../config/database.js';

// In-flight tracking to prevent lost events on graceful shutdown
const inFlightWrites = new Set();

export class ClickRepository {
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
      await Click.init();
    } catch (err) {
      console.warn('⚠️ [ClickRepository] Model index initialization warning:', err.message);
    }
  }

  _formatClickDoc(doc) {
    if (!doc) return null;
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
    delete obj._id;
    delete obj.__v;
    delete obj.ip; // Privacy: ensure legacy raw IP is never exposed
    if (obj.timestamp instanceof Date) obj.timestamp = obj.timestamp.toISOString();
    return obj;
  }

  _buildUrlMatch(urlId) {
    if (!urlId) return {};
    if (Array.isArray(urlId)) {
      if (urlId.length === 0) {
        return { urlId: '__NO_MATCH_SCOPE__' };
      }
      const stringIds = urlId.map((id) => String(id));
      const objectIds = urlId
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      return {
        $or: [
          { urlId: { $in: stringIds } },
          ...(objectIds.length > 0 ? [{ url: { $in: objectIds } }] : [])
        ]
      };
    }
    if (mongoose.Types.ObjectId.isValid(urlId)) {
      return { $or: [{ urlId }, { url: new mongoose.Types.ObjectId(urlId) }] };
    }
    return { urlId };
  }

  _buildDateRangeFilter({ range = null, days = null, startDate = null, endDate = null }) {
    const now = new Date();
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

    let start = null;
    let end = endDate ? new Date(endDate) : new Date(now);

    if (startDate && endDate) {
      start = new Date(startDate);
    } else if (effectiveRange === '24h') {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (effectiveRange === '7d' || effectiveRange === '7') {
      start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (effectiveRange === '14d' || effectiveRange === '14') {
      start = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (effectiveRange === '30d' || effectiveRange === '30') {
      start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (effectiveRange === '90d' || effectiveRange === '90') {
      start = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (days && !isNaN(parseInt(days, 10))) {
      const d = parseInt(days, 10);
      start = new Date(now.getTime() - (d - 1) * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  /**
   * Persist a click event with in-flight tracking and graceful shutdown safety.
   */
  async recordClick(clickData) {
    this.assertConnected();
    const event = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...clickData
    };

    if (clickData.urlId && mongoose.Types.ObjectId.isValid(clickData.urlId)) {
      event.url = new mongoose.Types.ObjectId(clickData.urlId);
    }

    const writePromise = (async () => {
      try {
        const doc = await Click.create(event);
        return this._formatClickDoc(doc.toJSON());
      } catch (err) {
        console.error('❌ [ClickRepository] Error persisting click event to MongoDB:', err.message);
        throw err;
      }
    })();

    inFlightWrites.add(writePromise);
    writePromise.finally(() => inFlightWrites.delete(writePromise));

    return writePromise;
  }

  /**
   * Flush all in-flight click writes during server shutdown.
   */
  async flush(timeoutMs = 5000) {
    if (inFlightWrites.size === 0) return true;
    console.log(`🍃 [ClickRepository] Flushing ${inFlightWrites.size} in-flight click event(s)...`);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    await Promise.race([
      Promise.allSettled(Array.from(inFlightWrites)),
      timeoutPromise
    ]);
    console.log('✅ [ClickRepository] In-flight click events flushed.');
    return true;
  }

  /**
   * Comprehensive summary with previous-period comparison
   */
  async getSummary(urlId = null, { range = '30d', startDate = null, endDate = null, includeBots = false } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });
    const periodDuration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodDuration);
    const prevEnd = new Date(start.getTime());

    const baseMatch = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } })
    };

    // Current period counts
    const currentMatch = {
      ...baseMatch,
      timestamp: { $gte: start, $lte: end }
    };

    // Previous period counts
    const prevMatch = {
      ...baseMatch,
      timestamp: { $gte: prevStart, $lt: prevEnd }
    };

    // Lifetime match
    const lifetimeMatch = { ...baseMatch };

    // Today match
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMatch = {
      ...baseMatch,
      timestamp: { $gte: startOfToday }
    };

    const [
      totalClicks,
      periodClicks,
      previousClicks,
      clicksToday,
      uniqueVisitorsList,
      prevVisitorsList
    ] = await Promise.all([
      Click.countDocuments(lifetimeMatch),
      Click.countDocuments(currentMatch),
      Click.countDocuments(prevMatch),
      Click.countDocuments(todayMatch),
      Click.distinct('visitorId', currentMatch),
      Click.distinct('visitorId', prevMatch)
    ]);

    const uniqueVisitors = uniqueVisitorsList.filter(Boolean).length;
    const previousUniques = prevVisitorsList.filter(Boolean).length;

    // Concurrency / calculation safety: safe percentage comparison without NaN or zero division
    const calcChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      totalClicks,
      periodClicks,
      previousClicks,
      clicksToday,
      uniqueVisitors,
      previousUniques,
      clicksChangePct: calcChange(periodClicks, previousClicks),
      uniquesChangePct: calcChange(uniqueVisitors, previousUniques),
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        previousStart: prevStart.toISOString(),
        previousEnd: prevEnd.toISOString()
      }
    };
  }

  /**
   * Timeseries aggregation: hourly for 24h, daily for 7d/30d/custom.
   */
  async getTimeseries({
    urlId = null,
    range = '7d',
    days = null,
    startDate = null,
    endDate = null,
    includeBots = false
  } = {}) {
    this.assertConnected();
    const effectiveRange = days ? `${days}d` : range;
    const { start, end } = this._buildDateRangeFilter({ range: effectiveRange, days, startDate, endDate });
    const isHourly = effectiveRange === '24h' || (end.getTime() - start.getTime() <= 48 * 60 * 60 * 1000);
    const now = new Date();

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    const bucketsMap = new Map();

    if (isHourly) {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 13) + ':00';
        const label = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        bucketsMap.set(key, { date: key, label, clicks: 0, uniques: 0 });
      }
    } else if (startDate && endDate) {
      const curr = new Date(start);
      while (curr <= end) {
        const key = curr.toISOString().slice(0, 10);
        const label = curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        bucketsMap.set(key, { date: key, label, clicks: 0, uniques: 0 });
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    } else {
      const daysCount = effectiveRange === '30d' ? 30 : (effectiveRange === '7d' ? 7 : (parseInt(days, 10) || 7));
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        bucketsMap.set(key, { date: key, label, clicks: 0, uniques: 0 });
      }
    }

    // Run MongoDB Aggregation Pipeline
    const dateFormat = isHourly ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';
    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            bucket: { $dateToString: { format: dateFormat, date: '$timestamp' } },
            visitor: '$visitorId'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.bucket',
          clicks: { $sum: '$count' },
          uniques: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const aggResults = await Click.aggregate(pipeline);

    for (const res of aggResults) {
      if (bucketsMap.has(res._id)) {
        const item = bucketsMap.get(res._id);
        item.clicks = res.clicks || 0;
        item.uniques = res.uniques || 0;
      }
    }

    return Array.from(bucketsMap.values()).map((entry) => ({
      date: entry.date,
      label: entry.label,
      clicks: entry.clicks,
      uniques: entry.uniques || (entry.visitors ? entry.visitors.size : 0)
    }));
  }

  /**
   * Device breakdown: Mobile vs Desktop vs Tablet vs Unknown
   */
  async getDeviceBreakdown({ urlId = null, range = '30d', startDate = null, endDate = null, includeBots = false } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    const counts = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    if (includeBots) counts.bot = 0;

    const results = await Click.aggregate([
      { $match: match },
      { $group: { _id: { $toLower: '$deviceCategory' }, count: { $sum: 1 } } }
    ]);

    let total = 0;
    for (const r of results) {
      const key = r._id || 'unknown';
      if (counts[key] !== undefined) {
        counts[key] = r.count;
      } else {
        counts.unknown += r.count;
      }
      total += r.count;
    }

    return Object.entries(counts).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }

  /**
   * Browser breakdown with accurate counts and percentages
   */
  async getBrowserBreakdown({ urlId = null, range = '30d', startDate = null, endDate = null, includeBots = false } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    const results = await Click.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$browser', 'Other'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const total = results.reduce((acc, curr) => acc + curr.count, 0);

    return results.map((r) => ({
      name: r._id || 'Other',
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
    }));
  }

  /**
   * Operating system breakdown with accurate counts and percentages
   */
  async getOsBreakdown({ urlId = null, range = '30d', startDate = null, endDate = null, includeBots = false } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    const results = await Click.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$os', 'Other'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const total = results.reduce((acc, curr) => acc + curr.count, 0);

    return results.map((r) => ({
      name: r._id || 'Other',
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
    }));
  }

  /**
   * Referrer traffic sources
   */
  async getReferrerBreakdown({ urlId = null, range = '30d', startDate = null, endDate = null, includeBots = false } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    const results = await Click.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$referrer', 'Direct'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const total = results.reduce((acc, curr) => acc + curr.count, 0);

    return results.map((r) => ({
      name: r._id || 'Direct',
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
    }));
  }

  /**
   * Country-level geographic breakdown
   */
  async getCountryBreakdown({ urlId = null, range = '30d', startDate = null, endDate = null, includeBots = false } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    const results = await Click.aggregate([
      { $match: match },
      { $group: { _id: { $ifNull: ['$country', 'Unknown'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 }
    ]);

    const total = results.reduce((acc, curr) => acc + curr.count, 0);

    return results.map((r) => ({
      name: r._id || 'Unknown',
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0
    }));
  }

  /**
   * Paginated click logs with search and filters
   */
  async findClicks({
    urlId = null,
    search = '',
    device = '',
    browser = '',
    country = '',
    page = 1,
    limit = 20,
    range = '30d',
    startDate = null,
    endDate = null,
    includeBots = false
  } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    if (device) match.deviceCategory = device.toLowerCase();
    if (browser) match.browser = new RegExp(browser, 'i');
    if (country) match.country = country.toUpperCase();

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { code: new RegExp(escaped, 'i') },
        { browser: new RegExp(escaped, 'i') },
        { os: new RegExp(escaped, 'i') },
        { referrer: new RegExp(escaped, 'i') },
        { country: new RegExp(escaped, 'i') }
      ];
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const [total, docs] = await Promise.all([
      Click.countDocuments(match),
      Click.find(match).sort({ timestamp: -1 }).skip(skip).limit(parsedLimit).lean()
    ]);

    return {
      items: docs.map((d) => this._formatClickDoc(d)),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1
      }
    };
  }

  async findByUrlId(urlId, { limit = 50, offset = 0 } = {}) {
    this.assertConnected();
    const match = this._buildUrlMatch(urlId);
    const parsedLimit = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

    const total = await Click.countDocuments(match);
    const docs = await Click.find(match)
      .sort({ timestamp: -1 })
      .skip(parsedOffset)
      .limit(parsedLimit)
      .lean();

    return {
      total,
      items: docs.map((d) => this._formatClickDoc(d))
    };
  }

  async findRecent(limit = 20, { urlId = null, includeBots = false } = {}) {
    this.assertConnected();
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } })
    };
    const docs = await Click.find(match).sort({ timestamp: -1 }).limit(parsedLimit).lean();
    return docs.map((d) => this._formatClickDoc(d));
  }

  /**
   * Generate CSV export content for real recorded click events
   */
  async exportCsv({ urlId = null, range = '30d', startDate = null, endDate = null, includeBots = false } = {}) {
    this.assertConnected();
    const { start, end } = this._buildDateRangeFilter({ range, startDate, endDate });

    const match = {
      ...this._buildUrlMatch(urlId),
      ...(includeBots ? {} : { isBot: { $ne: true } }),
      timestamp: { $gte: start, $lte: end }
    };

    const docs = await Click.find(match).sort({ timestamp: -1 }).limit(5000).lean();

    const headers = ['Timestamp', 'Short Code', 'Device', 'Browser', 'OS', 'Referrer', 'Country', 'Visitor ID', 'Is Bot'];
    const rows = docs.map((d) => {
      const ts = d.timestamp instanceof Date ? d.timestamp.toISOString() : new Date(d.timestamp).toISOString();
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        escape(ts),
        escape(d.code),
        escape(d.deviceCategory),
        escape(d.browser),
        escape(d.os),
        escape(d.referrer || 'Direct'),
        escape(d.country || 'Unknown'),
        escape(d.visitorId || 'anonymous'),
        escape(Boolean(d.isBot))
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  async deleteByUrlId(urlId) {
    this.assertConnected();
    const match = this._buildUrlMatch(urlId);
    const res = await Click.deleteMany(match);
    return res.deletedCount || 0;
  }

  async bulkDeleteByUrlIds(urlIds) {
    this.assertConnected();
    if (!Array.isArray(urlIds) || urlIds.length === 0) return 0;
    const objectIds = urlIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const res = await Click.deleteMany({
      $or: [{ urlId: { $in: urlIds } }, ...(objectIds.length > 0 ? [{ url: { $in: objectIds } }] : [])]
    });
    return res.deletedCount || 0;
  }
}

// Singleton repository instance
export const clickRepository = new ClickRepository();
