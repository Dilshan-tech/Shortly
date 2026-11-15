import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from '../backend/node_modules/mongoose/index.js';
import { connectDatabase, disconnectDatabase } from '../backend/src/config/database.js';
import { config, normalizeMongoUri, maskMongoUri } from '../backend/src/config/env.js';
import { urlRepository } from '../backend/src/repositories/urlRepository.js';
import { clickRepository } from '../backend/src/repositories/clickRepository.js';
import { urlService } from '../backend/src/services/urlService.js';
import { analyticsService } from '../backend/src/services/analyticsService.js';
import { Url } from '../backend/src/models/Url.js';
import { Click } from '../backend/src/models/Click.js';

// Always target the isolated test database
const rawUri = config.mongodbUri || '';
const TEST_DB_URI = normalizeMongoUri(rawUri).replace(/\/shortly(\?|$)/, '/shortly_test$1');

test.before(async () => {
  console.log(`\n🧪 [TEST SETUP] Connecting to isolated test database: ${maskMongoUri(TEST_DB_URI)}...`);
  await connectDatabase(TEST_DB_URI);
  await urlRepository.init();
  await clickRepository.init();
  // Clear test database collections
  await Url.deleteMany({});
  await Click.deleteMany({});
  console.log('🧹 [TEST SETUP] Test database collections initialized and clean.');
});

test.after(async () => {
  await Url.deleteMany({});
  await Click.deleteMany({});
  await disconnectDatabase();
  console.log('🍃 [TEST TEARDOWN] Test database disconnected.\n');
});

test('1. Reliable Click Persistence & Privacy Handling', async () => {
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/reliability-test',
    title: 'Reliability Test'
  });

  const mockReq = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'referer': 'https://google.com',
      'cf-ipcountry': 'US'
    },
    ip: '203.0.113.42',
    query: {}
  };

  const redirectRes = await urlService.resolveRedirect(url.code, mockReq);
  assert.equal(redirectRes.status, 'redirect');
  assert.equal(redirectRes.destinationUrl, 'https://example.com/reliability-test');

  // Verify URL document updated
  const updatedUrl = await urlRepository.findById(url.id);
  assert.equal(updatedUrl.clicks, 1);

  // Verify Click document persisted
  const clicks = await Click.find({ urlId: url.id }).lean();
  assert.equal(clicks.length, 1);
  const click = clicks[0];

  assert.equal(click.code, url.code);
  assert.equal(click.browser, 'Chrome');
  assert.equal(click.os, 'Windows');
  assert.equal(click.deviceCategory, 'desktop');
  assert.equal(click.referrer, 'Google');
  assert.equal(click.country, 'US');
  assert.equal(click.isBot, false);

  // Privacy assertions: raw IP must NOT be stored
  assert.equal(click.ip, undefined); // Legacy field deleted
  assert.equal(click.anonymizedIp, '203.0.113.0/24'); // Masked subnet
  assert.ok(click.visitorId); // Salted hash
  assert.notEqual(click.visitorId, '203.0.113.42');
});

test('2. Concurrency Safety: Simultaneous Clicks Enforce Click Limit', async () => {
  // Create link with limit of 3 clicks
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/limited-ticket',
    title: 'Exclusive Ticket',
    clickLimit: 3
  });

  // Fire 15 simultaneous redirect requests
  const concurrentCount = 15;
  const requests = Array.from({ length: concurrentCount }, (_, i) => {
    return urlService.resolveRedirect(url.code, {
      headers: {
        'user-agent': `Mozilla/5.0 (Client-${i}) AppleWebKit/537.36`,
        'x-request-id': `req-conc-limit-${i}`
      },
      ip: `198.51.100.${i + 1}`,
      query: {}
    });
  });

  const results = await Promise.all(requests);

  const successfulRedirects = results.filter((r) => r.status === 'redirect');
  const expiredRedirects = results.filter((r) => r.status === 'expired' && r.reason === 'limit_reached');

  assert.equal(successfulRedirects.length, 3, 'Exactly 3 simultaneous clicks should succeed');
  assert.equal(expiredRedirects.length, 12, 'Remaining 12 requests must be rejected with limit_reached');

  // Verify database consistency
  const finalUrl = await urlRepository.findById(url.id);
  assert.equal(finalUrl.clicks, 3, 'Total clicks in URL document must equal exactly 3');

  const recordedClicks = await Click.countDocuments({ urlId: url.id });
  assert.equal(recordedClicks, 3, 'Exactly 3 click events must be recorded in Click collection');
});

test('3. Concurrency Safety: One-Time Use Links Redirect Exactly Once', async () => {
  // Create one-time link
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/single-secret',
    title: 'One-Time Secret',
    isOneTimeUse: true
  });

  // Fire 10 simultaneous redirect requests
  const requests = Array.from({ length: 10 }, (_, i) => {
    return urlService.resolveRedirect(url.code, {
      headers: {
        'user-agent': `Mozilla/5.0 (Client-${i}) AppleWebKit/537.36`,
        'x-request-id': `req-conc-onetime-${i}`
      },
      ip: `192.0.2.${i + 10}`,
      query: {}
    });
  });

  const results = await Promise.all(requests);

  const successes = results.filter((r) => r.status === 'redirect');
  const failures = results.filter((r) => r.status === 'expired');

  assert.equal(successes.length, 1, 'Exactly 1 request must succeed for a one-time link');
  assert.equal(failures.length, 9, 'All subsequent concurrent requests must be rejected');

  const finalUrl = await urlRepository.findById(url.id);
  assert.equal(finalUrl.clicks, 1);
  assert.equal(finalUrl.isActive, false, 'One-time link must be deactivated after use');
});

test('4. Request Retry Deduplication: Rapid Repeated Clicks Do Not Double Count', async () => {
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/retry-test',
    title: 'Retry Test'
  });

  const clientReq = {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      'referer': 'https://t.co/'
    },
    ip: '172.56.21.89',
    query: {}
  };

  // First request: valid new visit
  const first = await urlService.resolveRedirect(url.code, clientReq);
  assert.equal(first.status, 'redirect');
  assert.equal(first.isRetry, undefined);

  // Rapid retry from same client within deduplication window
  const second = await urlService.resolveRedirect(url.code, clientReq);
  assert.equal(second.status, 'redirect');
  assert.equal(second.isRetry, true, 'Second rapid hit must be flagged as retry');

  // Verify click count was only incremented once
  const updatedUrl = await urlRepository.findById(url.id);
  assert.equal(updatedUrl.clicks, 1);

  const clickCount = await Click.countDocuments({ urlId: url.id });
  assert.equal(clickCount, 1, 'Duplicate retry event must not be inserted into Click collection');
});

test('5. Real Database-Driven Analytics Breakdowns & Accurate Percentages', async () => {
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/analytics-breakdown-test',
    title: 'Breakdown Test'
  });

  // Seed 4 real click events
  await clickRepository.recordClick({
    urlId: url.id,
    code: url.code,
    deviceCategory: 'mobile',
    browser: 'Safari',
    os: 'iOS',
    referrer: 'X / Twitter',
    country: 'US',
    visitorId: 'vis-1',
    isBot: false
  });
  await clickRepository.recordClick({
    urlId: url.id,
    code: url.code,
    deviceCategory: 'mobile',
    browser: 'Safari',
    os: 'iOS',
    referrer: 'X / Twitter',
    country: 'US',
    visitorId: 'vis-1', // Repeat visitor
    isBot: false
  });
  await clickRepository.recordClick({
    urlId: url.id,
    code: url.code,
    deviceCategory: 'desktop',
    browser: 'Chrome',
    os: 'Windows',
    referrer: 'Google',
    country: 'IN',
    visitorId: 'vis-2',
    isBot: false
  });
  await clickRepository.recordClick({
    urlId: url.id,
    code: url.code,
    deviceCategory: 'desktop',
    browser: 'Firefox',
    os: 'Linux',
    referrer: 'Direct',
    country: 'DE',
    visitorId: 'vis-3',
    isBot: false
  });

  const analytics = await analyticsService.getUrlAnalytics(url.id, { range: '30d' });

  // Summary checks
  assert.equal(analytics.summary.totalClicks, 4);
  assert.equal(analytics.summary.uniqueVisitors, 3, 'vis-1 visited twice, total uniques should be 3');

  // Device Breakdown: 2 mobile (50%), 2 desktop (50%)
  const mobile = analytics.devices.find((d) => d.name === 'Mobile');
  const desktop = analytics.devices.find((d) => d.name === 'Desktop');
  assert.equal(mobile.count, 2);
  assert.equal(mobile.percentage, 50);
  assert.equal(desktop.count, 2);
  assert.equal(desktop.percentage, 50);

  // Browser Breakdown: Safari 2 (50%), Chrome 1 (25%), Firefox 1 (25%)
  const safari = analytics.browsers.find((b) => b.name === 'Safari');
  assert.equal(safari.count, 2);
  assert.equal(safari.percentage, 50);

  // Country Breakdown: US 2 (50%), IN 1 (25%), DE 1 (25%)
  const us = analytics.countries.find((c) => c.name === 'US');
  assert.equal(us.count, 2);
  assert.equal(us.percentage, 50);

  // Referrer Breakdown: X / Twitter 2 (50%), Google 1 (25%), Direct 1 (25%)
  const twitter = analytics.referrers.find((r) => r.name === 'X / Twitter');
  assert.equal(twitter.count, 2);
  assert.equal(twitter.percentage, 50);
});

test('6. Date Filters: 24h Hourly, 7d Daily, 30d Daily, and Custom Ranges', async () => {
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/date-filter-test'
  });

  // 24h Timeseries should have hourly buckets
  const timeseries24h = await clickRepository.getTimeseries({ urlId: url.id, range: '24h' });
  assert.ok(timeseries24h.length >= 24, '24h range should return hourly buckets');
  assert.ok(timeseries24h[0].date.includes(':00'), 'Hourly bucket date format should contain hour');

  // 7d Timeseries should have daily buckets
  const timeseries7d = await clickRepository.getTimeseries({ urlId: url.id, range: '7d' });
  assert.ok(timeseries7d.length >= 7, '7d range should return daily buckets');
  assert.ok(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(timeseries7d[0].date), 'Daily bucket format YYYY-MM-DD');

  // Custom range
  const now = new Date();
  const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const end = now.toISOString();
  const timeseriesCustom = await clickRepository.getTimeseries({
    urlId: url.id,
    range: 'custom',
    startDate: start,
    endDate: end
  });
  assert.ok(timeseriesCustom.length > 0);
});

test('7. Previous-Period Comparison Calculations with Zero-Division Safety', async () => {
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/comparison-test'
  });

  const now = new Date();
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // Seed 2 clicks in current 7d window (4 days ago)
  await Click.create({
    id: 'cmp-1',
    urlId: url.id,
    code: url.code,
    timestamp: fourDaysAgo,
    visitorId: 'v-curr-1'
  });
  await Click.create({
    id: 'cmp-2',
    urlId: url.id,
    code: url.code,
    timestamp: fourDaysAgo,
    visitorId: 'v-curr-2'
  });

  // Seed 1 click in previous 7d window (10 days ago)
  await Click.create({
    id: 'cmp-3',
    urlId: url.id,
    code: url.code,
    timestamp: tenDaysAgo,
    visitorId: 'v-prev-1'
  });

  const summary = await clickRepository.getSummary(url.id, { range: '7d' });
  assert.equal(summary.periodClicks, 2);
  assert.equal(summary.previousClicks, 1);
  // (2 - 1) / 1 * 100 = +100%
  assert.equal(summary.clicksChangePct, 100);

  // Edge case: if previous is 0 and current is 0, change is 0%
  const emptySummary = await clickRepository.getSummary('non-existent-url-id', { range: '7d' });
  assert.equal(emptySummary.clicksChangePct, 0);
  assert.equal(emptySummary.uniquesChangePct, 0);
});

test('8. Bot Detection and Filtering from Real Traffic', async () => {
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/bot-filter-test'
  });

  // Simulate Googlebot hit
  await urlService.resolveRedirect(url.code, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'x-request-id': 'req-bot-1'
    },
    ip: '66.249.66.1',
    query: {}
  });

  // Simulate Human hit
  await urlService.resolveRedirect(url.code, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'x-request-id': 'req-human-1'
    },
    ip: '98.12.34.56',
    query: {}
  });

  // Default query: human traffic only
  const humanSummary = await clickRepository.getSummary(url.id, { includeBots: false });
  assert.equal(humanSummary.totalClicks, 1, 'Default analytics should exclude bot hits');

  // Query with bots included
  const allSummary = await clickRepository.getSummary(url.id, { includeBots: true });
  assert.equal(allSummary.totalClicks, 2, 'With includeBots: true, bot hits should be included');
});

test('9. CSV Export Format and Integrity', async () => {
  const url = await urlService.createShortUrl({
    longUrl: 'https://example.com/csv-export-test'
  });

  await clickRepository.recordClick({
    urlId: url.id,
    code: url.code,
    deviceCategory: 'desktop',
    browser: 'Chrome',
    os: 'Windows',
    referrer: 'GitHub',
    country: 'US',
    visitorId: 'visitor-csv-1',
    isBot: false
  });

  const csv = await analyticsService.exportCsv({ urlId: url.id });
  assert.ok(csv.startsWith('Timestamp,Short Code,Device,Browser,OS,Referrer,Country,Visitor ID,Is Bot'));
  assert.ok(csv.includes(url.code));
  assert.ok(csv.includes('Chrome'));
  assert.ok(csv.includes('GitHub'));
  assert.ok(csv.includes('US'));
});

test('10. User Ownership Enforcement on Analytics', async () => {
  // Create URL owned by user_alice
  const aliceUrl = await urlRepository.create({
    id: 'alice-owned-url-1',
    code: 'alice123',
    longUrl: 'https://example.com/alice-private',
    ownerId: 'user_alice'
  });

  // Accessing with correct ownerId succeeds
  const resAlice = await analyticsService.getUrlAnalytics(aliceUrl.id, { ownerId: 'user_alice' });
  assert.equal(resAlice.url.id, aliceUrl.id);

  // Accessing with wrong ownerId throws 403 Forbidden
  await assert.rejects(
    async () => {
      await analyticsService.getUrlAnalytics(aliceUrl.id, { ownerId: 'user_bob' });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.match(err.message, /permission/i);
      return true;
    }
  );

  // Accessing without ownerId throws 401 Unauthorized
  await assert.rejects(
    async () => {
      await analyticsService.getUrlAnalytics(aliceUrl.id, { ownerId: null });
    },
    (err) => {
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /authentication required/i);
      return true;
    }
  );
});
