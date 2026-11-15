import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from '../backend/node_modules/mongoose/index.js';
import { config } from '../backend/src/config/env.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../backend/src/config/database.js';
import { urlRepository } from '../backend/src/repositories/urlRepository.js';
import { clickRepository } from '../backend/src/repositories/clickRepository.js';
import { urlService } from '../backend/src/services/urlService.js';
import { analyticsService } from '../backend/src/services/analyticsService.js';
import { Url } from '../backend/src/models/Url.js';
import { Click } from '../backend/src/models/Click.js';
import { migrateJsonToMongo } from '../backend/src/scripts/migrate.js';

// Derive safe, isolated test database URI: "shortly_test"
const testMongoUri = (config.mongodbUri || '').replace(/\/shortly(\?|$)/, '/shortly_test$1');

describe('Shortly MongoDB Atlas Integration & Migration Test Suite', () => {
  before(async () => {
    assert.ok(testMongoUri, 'Test MongoDB URI must be available');
    assert.ok(!testMongoUri.endsWith('/shortly'), 'Must not run against primary production database');

    console.log('\n🧪 Connecting to ISOLATED test database: "shortly_test"...');
    await connectDatabase(testMongoUri);
    assert.strictEqual(mongoose.connection.name, 'shortly_test', 'Active database must be shortly_test');

    // Clean test database collections
    await Url.deleteMany({});
    await Click.deleteMany({});
    await urlRepository.init();
    await clickRepository.init();
  });

  after(async () => {
    // Clean up test database collections and disconnect
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === 'shortly_test') {
      await Url.deleteMany({});
      await Click.deleteMany({});
      await disconnectDatabase();
      console.log('🧪 Test database cleaned and disconnected successfully.');
    }
  });

  // 1. Connection Verification
  it('1. MongoDB connection is established with healthy readyState', () => {
    assert.strictEqual(isDatabaseConnected(), true);
    assert.strictEqual(mongoose.connection.readyState, 1);
    assert.strictEqual(mongoose.connection.name, 'shortly_test');
  });

  // 2. URL Creation with auto-generated code
  let createdUrlId = null;
  let createdUrlCode = null;

  it('2. URL creation stores record in MongoDB with auto-generated 7-character code', async () => {
    const result = await urlService.createShortUrl({
      longUrl: 'https://example.com/deep/path/document',
      title: 'Example Documentation'
    });

    assert.ok(result);
    assert.ok(result.id);
    assert.strictEqual(result.code.length, 7);
    assert.strictEqual(result.clicks, 0);
    assert.strictEqual(result.longUrl, 'https://example.com/deep/path/document');
    assert.strictEqual(result.title, 'Example Documentation');
    assert.strictEqual(result.shortUrl, `${config.publicUrl}/${result.code}`);

    createdUrlId = result.id;
    createdUrlCode = result.code;

    // Verify directly in MongoDB
    const mongoDoc = await Url.findOne({ id: result.id }).lean();
    assert.ok(mongoDoc);
    assert.strictEqual(mongoDoc.code, result.code);
  });

  // 3. URL Retrieval by ID and Code
  it('3. URL retrieval finds record by ID and by short code case-insensitively', async () => {
    const byId = await urlRepository.findById(createdUrlId);
    assert.ok(byId);
    assert.strictEqual(byId.id, createdUrlId);

    const byCode = await urlRepository.findByCode(createdUrlCode.toLowerCase());
    assert.ok(byCode);
    assert.strictEqual(byCode.id, createdUrlId);

    const byUpperCode = await urlRepository.findByCode(createdUrlCode.toUpperCase());
    assert.ok(byUpperCode);
    assert.strictEqual(byUpperCode.id, createdUrlId);
  });

  // 4. Custom Alias and Unique Index Enforcement
  it('4. Custom alias is saved, and duplicate custom alias is rejected with 409 Conflict', async () => {
    const custom = await urlService.createShortUrl({
      longUrl: 'https://github.com/nodejs/node',
      customAlias: 'nodejs-repo',
      title: 'Node.js Core'
    });

    assert.strictEqual(custom.code, 'nodejs-repo');
    assert.strictEqual(custom.customAlias, 'nodejs-repo');

    // Attempting to create duplicate alias must reject with 409 Conflict
    await assert.rejects(
      async () => {
        await urlService.createShortUrl({
          longUrl: 'https://github.com/nodejs/other',
          customAlias: 'nodejs-repo'
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 409);
        assert.match(err.message, /already taken|already exists/i);
        return true;
      }
    );
  });

  // 5. URL Expiration Enforcement
  it('5. Expired URLs are correctly detected and redirect indicates expired status', async () => {
    // Create an URL expired in the past directly in DB
    const expiredRecord = await urlRepository.create({
      id: 'expired_test_id',
      code: 'exp-link',
      longUrl: 'https://wikipedia.org',
      title: 'Expired Link',
      expiresAt: new Date(Date.now() - 100000).toISOString(),
      isActive: true
    });

    assert.ok(expiredRecord);
    const redirectRes = await urlService.resolveRedirect('exp-link', {
      headers: {},
      query: {}
    });

    assert.strictEqual(redirectRes.status, 'expired');
    assert.strictEqual(redirectRes.reason, 'time_expired');
  });

  // 6. Maximum Click Limits Enforcement (Concurrency Safe)
  it('6. Maximum click limits are enforced atomically in MongoDB', async () => {
    const limitUrl = await urlRepository.create({
      id: 'limit_test_id',
      code: 'limit-2',
      longUrl: 'https://google.com',
      title: 'Limit Two Link',
      clickLimit: 2,
      clicks: 0,
      isActive: true
    });

    assert.ok(limitUrl);

    // 1st click
    const click1 = await urlRepository.incrementClicks('limit_test_id');
    assert.strictEqual(click1.clicks, 1);

    // 2nd click
    const click2 = await urlRepository.incrementClicks('limit_test_id');
    assert.strictEqual(click2.clicks, 2);

    // 3rd click (should be rejected by atomic increment condition)
    const click3 = await urlRepository.incrementClicks('limit_test_id');
    assert.strictEqual(click3, null, 'Click beyond limit must return null');

    // Verify resolveRedirect flags it as expired limit reached
    const redirectRes = await urlService.resolveRedirect('limit-2', {
      headers: {},
      query: {}
    });
    assert.strictEqual(redirectRes.status, 'expired');
    assert.strictEqual(redirectRes.reason, 'limit_reached');
  });

  // 7. One-Time Links Enforcement
  it('7. One-time link is deactivated atomically after first click', async () => {
    await urlRepository.create({
      id: 'onetime_test_id',
      code: 'onetime-code',
      longUrl: 'https://secret.example.com',
      title: 'Secret Document',
      isOneTimeUse: true,
      clicks: 0,
      isActive: true
    });

    // 1st click -> succeeds and marks inactive
    const firstClick = await urlRepository.incrementClicks('onetime_test_id');
    assert.ok(firstClick);
    assert.strictEqual(firstClick.clicks, 1);
    assert.strictEqual(firstClick.isActive, false);

    // 2nd click -> fails atomically
    const secondClick = await urlRepository.incrementClicks('onetime_test_id');
    assert.strictEqual(secondClick, null);
  });

  // 8. Password Protection & Token Verification
  it('8. Password-protected link requires password and verifies with bcrypt', async () => {
    const protectedLink = await urlService.createShortUrl({
      longUrl: 'https://confidential.company.com',
      title: 'Confidential',
      password: 'StrongPassword123'
    });

    assert.strictEqual(protectedLink.isPasswordProtected, true);

    // Initial redirect requires password
    const checkRedirect = await urlService.resolveRedirect(protectedLink.code, {
      headers: {},
      query: {}
    });
    assert.strictEqual(checkRedirect.status, 'password_required');

    // Wrong password rejects with 401
    await assert.rejects(
      async () => {
        await urlService.verifyPassword(protectedLink.code, 'WrongPassword');
      },
      (err) => {
        assert.strictEqual(err.statusCode, 401);
        return true;
      }
    );

    // Correct password returns temporary unlock token
    const unlock = await urlService.verifyPassword(protectedLink.code, 'StrongPassword123');
    assert.strictEqual(unlock.success, true);
    assert.ok(unlock.token);

    // With unlock token, redirect succeeds
    const unlockedRedirect = await urlService.resolveRedirect(protectedLink.code, {
      headers: {},
      query: { token: unlock.token }
    });
    assert.strictEqual(unlockedRedirect.status, 'redirect');
    assert.ok(unlockedRedirect.destinationUrl.startsWith('https://confidential.company.com'));
  });

  // 9. Click Record Creation & Analytics Tracking
  it('9. Click events are saved in MongoDB with parsed device, browser, and OS metadata', async () => {
    const clickEvent = await clickRepository.recordClick({
      urlId: createdUrlId,
      code: createdUrlCode,
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      deviceCategory: 'mobile',
      browser: 'Mobile Safari',
      os: 'iOS',
      referrer: 'https://twitter.com',
      visitorId: 'visitor_abc_123'
    });

    assert.ok(clickEvent);
    assert.ok(clickEvent.id);
    assert.strictEqual(clickEvent.deviceCategory, 'mobile');
    assert.strictEqual(clickEvent.browser, 'Mobile Safari');
    assert.strictEqual(clickEvent.os, 'iOS');
    assert.strictEqual(clickEvent.referrer, 'https://twitter.com');

    // Query clicks by URL ID
    const history = await clickRepository.findByUrlId(createdUrlId);
    assert.strictEqual(history.total, 1);
    assert.strictEqual(history.items[0].deviceCategory, 'mobile');
  });

  // 10. Analytics Aggregation (MongoDB Aggregation Pipelines)
  it('10. Analytics aggregation pipelines compute summary, timeseries, and breakdowns', async () => {
    // Add additional desktop click
    await clickRepository.recordClick({
      urlId: createdUrlId,
      code: createdUrlCode,
      deviceCategory: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      referrer: 'Direct',
      visitorId: 'visitor_xyz_789'
    });

    const summary = await clickRepository.getSummary(createdUrlId);
    assert.strictEqual(summary.totalClicks, 2);
    assert.strictEqual(summary.clicksToday, 2);
    assert.strictEqual(summary.uniqueVisitors, 2);

    const devices = await clickRepository.getDeviceBreakdown({ urlId: createdUrlId });
    const mobileDev = devices.find((d) => d.name.toLowerCase() === 'mobile');
    const desktopDev = devices.find((d) => d.name.toLowerCase() === 'desktop');
    assert.strictEqual(mobileDev.count, 1);
    assert.strictEqual(desktopDev.count, 1);

    const timeseries = await clickRepository.getTimeseries({ days: 7, urlId: createdUrlId });
    assert.strictEqual(timeseries.length, 7);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPoint = timeseries.find((t) => t.date === todayStr);
    assert.ok(todayPoint);
    assert.strictEqual(todayPoint.clicks, 2);
    assert.strictEqual(todayPoint.uniques, 2);

    const overall = await analyticsService.getOverallSummary();
    assert.ok(overall.totalLinks >= 1);
    assert.ok(overall.totalClicks >= 2);
  });

  // 11. Pagination, Sorting and Search in MongoDB
  it('11. Pagination, sorting and text search work accurately in MongoDB', async () => {
    const listRes = await urlRepository.findAll({
      search: 'Example',
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    assert.ok(listRes);
    assert.strictEqual(listRes.pagination.page, 1);
    assert.ok(listRes.items.length >= 1);
    assert.ok(listRes.items.some((item) => item.title === 'Example Documentation'));
  });

  // 12. Idempotent JSON Migration Test into Test Database
  it('12. Idempotent JSON migration imports records and repeated execution causes no duplicates', async () => {
    // Run migration into test database
    const run1 = await migrateJsonToMongo({
      isDryRun: false,
      silent: true,
      targetUri: testMongoUri
    });

    assert.strictEqual(run1.success, true);
    assert.ok(run1.stats.urls.totalInFile >= 3);

    const countAfterRun1 = await Url.countDocuments({ code: 'Butterfly' });
    assert.strictEqual(countAfterRun1, 1, 'Should have exactly 1 Butterfly record');

    // Run migration a second time (idempotence check)
    const run2 = await migrateJsonToMongo({
      isDryRun: false,
      silent: true,
      targetUri: testMongoUri
    });

    assert.strictEqual(run2.success, true);
    assert.strictEqual(run2.stats.urls.importedNew, 0, 'Second run must NOT create duplicate records');
    assert.ok(run2.stats.urls.updatedExisting >= 3, 'Second run should synchronize existing records');

    const countAfterRun2 = await Url.countDocuments({ code: 'Butterfly' });
    assert.strictEqual(countAfterRun2, 1, 'Butterfly record must still exist exactly once (no duplicates)');
  });
});
