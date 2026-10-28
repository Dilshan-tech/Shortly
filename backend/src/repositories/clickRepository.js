import path from 'path';
import crypto from 'crypto';
import { AtomicStorage } from '../utils/atomicStorage.js';
import { config } from '../config/env.js';

export class ClickRepository {
  constructor(storageDir = config.dataDir) {
    this.storage = new AtomicStorage(path.join(storageDir, 'clicks.json'));
    this.clicks = [];
    this.isInitialized = false;
    this.saveTimeout = null;
    this.isDirty = false;
  }

  async init() {
    if (this.isInitialized) return;
    this.clicks = await this.storage.read([]);
    this.isInitialized = true;
  }

  /**
   * Schedule debounced disk persistence (50ms debounce)
   * so bursts of clicks do not spam disk I/O.
   */
  _schedulePersist() {
    this.isDirty = true;
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(async () => {
      this.saveTimeout = null;
      if (this.isDirty) {
        this.isDirty = false;
        try {
          await this.storage.write(this.clicks);
        } catch (err) {
          console.error('[ClickRepository] Failed to persist click events:', err);
        }
      }
    }, 50);
  }

  async recordClick(clickData) {
    await this.init();
    const event = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...clickData
    };

    this.clicks.push(event);
    this._schedulePersist();
    return event;
  }

  async findByUrlId(urlId, { limit = 50, offset = 0 } = {}) {
    await this.init();
    const filtered = this.clicks
      .filter((c) => c.urlId === urlId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      total: filtered.length,
      items: filtered.slice(offset, offset + limit)
    };
  }

  async findRecent(limit = 20) {
    await this.init();
    return [...this.clicks]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async deleteByUrlId(urlId) {
    await this.init();
    const initialCount = this.clicks.length;
    this.clicks = this.clicks.filter((c) => c.urlId !== urlId);
    if (this.clicks.length !== initialCount) {
      await this.storage.write(this.clicks);
    }
    return initialCount - this.clicks.length;
  }

  async bulkDeleteByUrlIds(urlIds) {
    await this.init();
    const idSet = new Set(urlIds);
    const initialCount = this.clicks.length;
    this.clicks = this.clicks.filter((c) => !idSet.has(c.urlId));
    if (this.clicks.length !== initialCount) {
      await this.storage.write(this.clicks);
    }
    return initialCount - this.clicks.length;
  }

  async getSummary(urlId = null) {
    await this.init();
    let events = this.clicks;
    if (urlId) {
      events = events.filter((c) => c.urlId === urlId);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const clicksToday = events.filter((c) => c.timestamp.startsWith(todayStr)).length;
    const uniqueVisitors = new Set(events.map((c) => c.visitorId)).size;

    return {
      totalClicks: events.length,
      clicksToday,
      uniqueVisitors
    };
  }

  async getTimeseries({ days = 7, urlId = null } = {}) {
    await this.init();
    let events = this.clicks;
    if (urlId) {
      events = events.filter((c) => c.urlId === urlId);
    }

    const daysCount = parseInt(days, 10) || 7;
    const dateMap = new Map();

    // Populate the last N days with 0 counts
    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dateMap.set(dateStr, { date: dateStr, clicks: 0, uniqueVisitors: new Set() });
    }

    for (const event of events) {
      const dateStr = event.timestamp.slice(0, 10);
      if (dateMap.has(dateStr)) {
        const item = dateMap.get(dateStr);
        item.clicks++;
        if (event.visitorId) item.uniqueVisitors.add(event.visitorId);
      }
    }

    return Array.from(dateMap.values()).map((entry) => ({
      date: entry.date,
      clicks: entry.clicks,
      uniques: entry.uniqueVisitors.size
    }));
  }

  async getDeviceBreakdown({ urlId = null } = {}) {
    await this.init();
    let events = this.clicks;
    if (urlId) {
      events = events.filter((c) => c.urlId === urlId);
    }

    const counts = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
      bot: 0,
      unknown: 0
    };

    for (const event of events) {
      const dev = (event.deviceCategory || 'unknown').toLowerCase();
      if (counts[dev] !== undefined) {
        counts[dev]++;
      } else {
        counts.unknown++;
      }
    }

    return Object.entries(counts).map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
      percentage: events.length > 0 ? Math.round((count / events.length) * 100) : 0
    }));
  }

  async getBrowserBreakdown({ urlId = null } = {}) {
    await this.init();
    let events = this.clicks;
    if (urlId) {
      events = events.filter((c) => c.urlId === urlId);
    }

    const counts = new Map();
    for (const event of events) {
      const browser = event.browser || 'Other';
      counts.set(browser, (counts.get(browser) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: events.length > 0 ? Math.round((count / events.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getOsBreakdown({ urlId = null } = {}) {
    await this.init();
    let events = this.clicks;
    if (urlId) {
      events = events.filter((c) => c.urlId === urlId);
    }

    const counts = new Map();
    for (const event of events) {
      const os = event.os || 'Other';
      counts.set(os, (counts.get(os) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: events.length > 0 ? Math.round((count / events.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getReferrerBreakdown({ urlId = null } = {}) {
    await this.init();
    let events = this.clicks;
    if (urlId) {
      events = events.filter((c) => c.urlId === urlId);
    }

    const counts = new Map();
    for (const event of events) {
      const ref = event.referrer || 'Direct';
      counts.set(ref, (counts.get(ref) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: events.length > 0 ? Math.round((count / events.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  async flush() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.isDirty) {
      this.isDirty = false;
      await this.storage.write(this.clicks);
    }
    await this.storage.flush();
  }
}

// Singleton repository instance
export const clickRepository = new ClickRepository();
