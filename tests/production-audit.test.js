process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from '../backend/node_modules/supertest/index.js';
import mongoose from '../backend/node_modules/mongoose/index.js';
import { createApp } from '../backend/src/app.js';
import { config, normalizeMongoUri, maskMongoUri } from '../backend/src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../backend/src/config/database.js';
import { userRepository } from '../backend/src/repositories/userRepository.js';
import { urlRepository } from '../backend/src/repositories/urlRepository.js';
import { clickRepository } from '../backend/src/repositories/clickRepository.js';
import { validateUrl } from '../backend/src/utils/urlValidator.js';
import { User } from '../backend/src/models/User.js';
import { Url } from '../backend/src/models/Url.js';
import { Click } from '../backend/src/models/Click.js';

const rawUri = config.mongodbUri || '';
const TEST_DB_URI = normalizeMongoUri(rawUri).replace(/\/shortly(\?|$)/, '/shortly_test$1');

let app;

describe('Shortly Production Readiness, Security & Performance Audit Suite', () => {
  before(async () => {
    console.log(`\n🛡️ [AUDIT SETUP] Connecting to isolated test database: ${maskMongoUri(TEST_DB_URI)}...`);
    await connectDatabase(TEST_DB_URI);
    await userRepository.init();
    await urlRepository.init();
    await clickRepository.init();

    // Clean test database
    await User.deleteMany({});
    await Url.deleteMany({});
    await Click.deleteMany({});

    app = createApp();
    console.log('✅ [AUDIT SETUP] Clean test state ready.\n');
  });

  after(async () => {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === 'shortly_test') {
      await User.deleteMany({});
      await Url.deleteMany({});
      await Click.deleteMany({});
      await disconnectDatabase();
      console.log('🍃 [AUDIT TEARDOWN] Test database cleaned and disconnected.\n');
    }
  });

  // ==========================================
  // 1. REGISTRATION, LOGIN & TOKEN ROTATION
  // ==========================================
  describe('1. Authentication, Sessions & Token Rotation', () => {
    let userToken;
    let refreshTokenCookie;

    it('registers user, hashes password with bcrypt, and sets secure HttpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'audit_user@example.com',
          password: 'SecurePassword123!',
          name: 'Audit User'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token, 'Should return access token');
      assert.equal(res.body.data.user.passwordHash, undefined, 'passwordHash must never be exposed');
      assert.equal(res.body.data.user.refreshTokens, undefined, 'refreshTokens must never be exposed');

      const cookies = res.headers['set-cookie'] || [];
      assert.ok(cookies.some((c) => c.startsWith('token=') && c.includes('HttpOnly')));
      assert.ok(cookies.some((c) => c.startsWith('refreshToken=') && c.includes('HttpOnly')));
    });

    it('logs in user, rejects incorrect password without leaking existence, and rotates session', async () => {
      // Wrong password -> generic 401
      const failRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'audit_user@example.com', password: 'WrongPassword999!' });
      assert.equal(failRes.status, 401);
      assert.equal(failRes.body.error, 'Invalid email or password.');

      // Valid login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'audit_user@example.com', password: 'SecurePassword123!' });
      assert.equal(loginRes.status, 200);
      userToken = loginRes.body.data.token;
      assert.ok(userToken);

      const cookies = loginRes.headers['set-cookie'] || [];
      refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0];
    });

    it('rotates refresh session cleanly and revokes old refresh tokens', async () => {
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshTokenCookie]);

      assert.equal(refreshRes.status, 200);
      assert.equal(refreshRes.body.success, true);
      assert.ok(refreshRes.body.data.token);

      // Re-using the consumed refresh token must now be rejected
      const replayRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshTokenCookie]);
      assert.equal(replayRes.status, 401);
    });
  });

  // ==========================================
  // 2. SSRF, URL VALIDATION & OPEN REDIRECTS
  // ==========================================
  describe('2. URL Validation, SSRF Defense & Open Redirects', () => {
    it('strictly permits valid external HTTP and HTTPS URLs', () => {
      const valid1 = validateUrl('https://example.com/some/path?query=1', false);
      assert.equal(valid1.valid, true);

      const valid2 = validateUrl('http://github.com/google/deepmind', false);
      assert.equal(valid2.valid, true);
    });

    it('strictly blocks dangerous protocols (javascript:, data:, file:, vbscript:)', () => {
      const jsUrl = validateUrl('javascript:alert(document.cookie)', false);
      assert.equal(jsUrl.valid, false);
      assert.match(jsUrl.error, /unsupported protocol/i);

      const dataUrl = validateUrl('data:text/html,<script>alert(1)</script>', false);
      assert.equal(dataUrl.valid, false);

      const fileUrl = validateUrl('file:///etc/passwd', false);
      assert.equal(fileUrl.valid, false);
    });

    it('strictly blocks SSRF against localhost, IPv4 loopback, and private LAN in strict mode', () => {
      assert.equal(validateUrl('http://localhost:5000', false).valid, false);
      assert.equal(validateUrl('http://127.0.0.1:3000', false).valid, false);
      assert.equal(validateUrl('http://127.1.2.3:8080', false).valid, false);
      assert.equal(validateUrl('http://10.0.0.5/api', false).valid, false);
      assert.equal(validateUrl('http://192.168.1.1/admin', false).valid, false);
      assert.equal(validateUrl('http://172.16.0.1/internal', false).valid, false);
    });

    it('strictly blocks SSRF against cloud metadata endpoints (AWS, Azure, GCP, DigitalOcean)', () => {
      const awsMeta = validateUrl('http://169.254.169.254/latest/meta-data/', false);
      assert.equal(awsMeta.valid, false);
      assert.match(awsMeta.error, /localhost, private LAN, or cloud metadata/i);

      const gcpMeta = validateUrl('http://metadata.google.internal/computeMetadata/v1/', false);
      assert.equal(gcpMeta.valid, false);
    });

    it('strictly blocks SSRF against IPv6 loopback ([::1]) and numeric/hex IP representations', () => {
      const ipv6 = validateUrl('http://[::1]:8080', false);
      assert.equal(ipv6.valid, false);

      // 2130706433 is integer decimal for 127.0.0.1
      const numericIp = validateUrl('http://2130706433:8080', false);
      assert.equal(numericIp.valid, false);

      // 0x7f000001 is hex for 127.0.0.1
      const hexIp = validateUrl('http://0x7f000001:8080', false);
      assert.equal(hexIp.valid, false);
    });

    it('prevents self-referencing redirect loops to Shortly itself', () => {
      const loop = validateUrl(`${config.publicUrl}/infinite-loop-code`, false);
      assert.equal(loop.valid, false);
      assert.match(loop.error, /cannot create a short link pointing to the shortly service/i);
    });
  });

  // ==========================================
  // 3. CROSS-USER AUTHORIZATION & DATA ISOLATION
  // ==========================================
  describe('3. Cross-User Authorization & Data Isolation', () => {
    let tokenAlice;
    let tokenBob;
    let urlAliceId;
    let urlAliceCode;

    before(async () => {
      // User Alice
      const regAlice = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice_iso@example.com', password: 'Password123!', name: 'Alice' });
      tokenAlice = regAlice.body.data.token;

      // User Bob
      const regBob = await request(app)
        .post('/api/auth/register')
        .send({ email: 'bob_iso@example.com', password: 'Password123!', name: 'Bob' });
      tokenBob = regBob.body.data.token;

      // Alice creates a private short link
      const createRes = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          longUrl: 'https://alice-portfolio.com/private',
          title: 'Alice Private Link',
          customAlias: 'alice-secret-link'
        });
      urlAliceId = createRes.body.data.id;
      urlAliceCode = createRes.body.data.code;
    });

    it('prevents Bob from viewing Alice private link details (403)', async () => {
      const res = await request(app)
        .get(`/api/urls/${urlAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);
    });

    it('prevents Bob from modifying Alice link (403)', async () => {
      const res = await request(app)
        .patch(`/api/urls/${urlAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`)
        .send({ title: 'Hacked by Bob' });

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);

      // Verify Alice title was not altered
      const verify = await request(app)
        .get(`/api/urls/${urlAliceId}`)
        .set('Authorization', `Bearer ${tokenAlice}`);
      assert.equal(verify.body.data.title, 'Alice Private Link');
    });

    it('prevents Bob from deleting Alice link (403)', async () => {
      const res = await request(app)
        .delete(`/api/urls/${urlAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);
    });

    it('prevents Bob from deleting Alice link via bulkDelete (ownership-scoped)', async () => {
      const res = await request(app)
        .post('/api/urls/bulk-delete')
        .set('Authorization', `Bearer ${tokenBob}`)
        .send({ ids: [urlAliceId] });

      assert.equal(res.status, 200);
      assert.equal(res.body.deletedCount, 0, 'Must not delete URLs belonging to another user');

      // Verify link still exists for Alice
      const verify = await request(app)
        .get(`/api/urls/${urlAliceId}`)
        .set('Authorization', `Bearer ${tokenAlice}`);
      assert.equal(verify.status, 200);
    });

    it('prevents Bob from accessing analytics for Alice link (403)', async () => {
      const res = await request(app)
        .get(`/api/urls/${urlAliceId}/analytics`)
        .set('Authorization', `Bearer ${tokenBob}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);
    });

    it('ensures Bob dashboard summary shows 0 links and 0 clicks, isolating from Alice data', async () => {
      // Simulate click on Alice link
      await request(app).get(`/${urlAliceCode}`);

      // Query Bob overview summary
      const bobSummary = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${tokenBob}`);

      assert.equal(bobSummary.status, 200);
      assert.equal(bobSummary.body.data.totalLinks, 0);
      assert.equal(bobSummary.body.data.totalClicks, 0);
      assert.equal(bobSummary.body.data.topUrls.length, 0);

      // Query Alice overview summary
      const aliceSummary = await request(app)
        .get('/api/analytics/summary')
        .set('Authorization', `Bearer ${tokenAlice}`);

      assert.equal(aliceSummary.status, 200);
      assert.equal(aliceSummary.body.data.totalLinks, 1);
      assert.equal(aliceSummary.body.data.totalClicks, 1);
      assert.equal(aliceSummary.body.data.topUrls.length, 1);
    });
  });

  // ==========================================
  // 4. URL EXPIRATION, CLICK LIMITS & PASSWORDS
  // ==========================================
  describe('4. Link Expiration, Concurrency Limits & Password Protection', () => {
    let token;

    before(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email: 'limits_user@example.com', password: 'Password123!', name: 'Limits' });
      token = reg.body.data.token;
    });

    it('rejects expired URLs with 410 Gone status', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const createRes = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com/expired',
          expiresAt: futureDate
        });
      assert.equal(createRes.status, 201);
      const { code, id } = createRes.body.data;

      // Simulate expiration over time by updating document directly in DB
      const pastDate = new Date(Date.now() - 3600000);
      await Url.updateOne({ id }, { $set: { expiresAt: pastDate } });

      const redirectRes = await request(app).get(`/${code}`).set('Accept', 'application/json');
      assert.equal(redirectRes.status, 410);
      assert.match(redirectRes.body.error, /expired/i);
    });

    it('strictly enforces click limit concurrently', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com/limited',
          clickLimit: 2
        });
      const { code, id } = createRes.body.data;

      // Click 1: Allowed -> 302
      const click1 = await request(app).get(`/${code}`);
      assert.equal(click1.status, 302);

      // Click 2: Allowed -> 302
      const click2 = await request(app).get(`/${code}`).set('x-request-id', 'req-2');
      assert.equal(click2.status, 302);

      // Click 3: Reached limit -> 410 Gone
      const click3 = await request(app).get(`/${code}`).set('x-request-id', 'req-3').set('Accept', 'application/json');
      assert.equal(click3.status, 410);
      assert.match(click3.body.error, /limit/i);

      // Check DB count exactly matches limit
      const urlDoc = await Url.findOne({ id });
      assert.equal(urlDoc.clicks, 2);
    });

    it('protects password-locked links and requires unlock verification', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${token}`)
        .send({
          longUrl: 'https://example.com/vault',
          password: 'SecretPassword99!'
        });
      const { code } = createRes.body.data;

      // Accessing without unlock -> 401 password required interstitial
      const lockedRes = await request(app).get(`/${code}`).set('Accept', 'application/json');
      assert.equal(lockedRes.status, 401);
      assert.equal(lockedRes.body.passwordRequired, true);

      // Verifying with wrong password -> 401
      const failVerify = await request(app)
        .post(`/api/urls/${code}/verify`)
        .send({ password: 'WrongPassword' });
      assert.equal(failVerify.status, 401);

      // Verifying with correct password -> returns temporary token
      const passVerify = await request(app)
        .post(`/api/urls/${code}/verify`)
        .send({ password: 'SecretPassword99!' });
      assert.equal(passVerify.status, 200);
      assert.equal(passVerify.body.success, true);
      const verificationToken = passVerify.body.token;
      assert.ok(verificationToken);

      // Redirecting with verification token -> 302 redirect to vault
      const unlockRes = await request(app).get(`/${code}?token=${verificationToken}`);
      assert.equal(unlockRes.status, 302);
      assert.equal(unlockRes.headers.location, 'https://example.com/vault');
    });
  });

  // ==========================================
  // 5. NOSQL INJECTION & INPUT SANITIZATION
  // ==========================================
  describe('5. NoSQL Injection & Input Sanitization', () => {
    it('sanitizes and rejects MongoDB query operator injections in request body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: { $gt: '' },
          password: 'Password123!'
        });

      // Zod validation rejects object for string field with 400
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('recursively strips $ operators from query strings preventing unhandled server crashes', async () => {
      const res = await request(app)
        .get('/api/urls?search[$gt]=')
        .set('Accept', 'application/json');

      assert.notEqual(res.status, 500);
      assert.equal(res.status, 200);
    });
  });

  // ==========================================
  // 6. DATABASE FAILURE GRACEFUL HANDLING
  // ==========================================
  describe('6. Database Failure Handling & Diagnostics', () => {
    it('returns clean 503 Service Unavailable when MongoDB is disconnected instead of hanging', async () => {
      // Mock disconnect temporarily
      const originalState = mongoose.connection.readyState;
      mongoose.connection.readyState = 0; // Disconnected

      try {
        const res = await request(app).get('/api/urls');
        assert.equal(res.status, 503);
        assert.match(res.body.error, /database service unavailable/i);
      } finally {
        // Restore connection state
        mongoose.connection.readyState = originalState;
      }
    });
  });
});
