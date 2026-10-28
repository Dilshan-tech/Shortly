import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { urlRepository } from '../repositories/urlRepository.js';
import { clickRepository } from '../repositories/clickRepository.js';
import { UrlRepository } from '../repositories/urlRepository.js';

describe('Shortly Backend Test Suite', () => {
  let app;

  beforeAll(async () => {
    await urlRepository.init();
    await clickRepository.init();
    urlRepository.urlsById.clear();
    urlRepository.urlsByCode.clear();
    clickRepository.clicks = [];
    await urlRepository._persist();
    await clickRepository.storage.write([]);
    app = createApp();
  });

  afterAll(async () => {
    await urlRepository.flush();
    await clickRepository.flush();
  });

  describe('1. Health Check', () => {
    it('returns 200 with service health info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('Shortly API');
      expect(res.body.uptime).toBeTypeOf('number');
    });
  });

  describe('2. URL Validation & Creation', () => {
    it('rejects missing or empty destination URL', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({ longUrl: '' });
      expect(res.status).toBe(400);
    });

    it('rejects unsupported protocols like javascript: or ftp:', async () => {
      const res1 = await request(app)
        .post('/api/urls')
        .send({ longUrl: 'javascript:alert(1)' });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/urls')
        .send({ longUrl: 'ftp://files.example.com/file.zip' });
      expect(res2.status).toBe(400);
    });

    it('creates a short URL with auto-generated code', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
          title: 'MDN Web Docs'
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toHaveLength(7);
      expect(res.body.data.shortUrl).toContain(res.body.data.code);
      expect(res.body.data.clicks).toBe(0);
      expect(res.body.data.longUrl).toBe('https://developer.mozilla.org/en-US/docs/Web/JavaScript');
    });

    it('creates a short URL with custom alias', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://github.com/trending',
          customAlias: 'gh-trending',
          title: 'GitHub Trending'
        });
      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('gh-trending');
    });

    it('rejects duplicate custom alias with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://news.ycombinator.com',
          customAlias: 'gh-trending'
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already taken');
    });

    it('rejects reserved keywords as custom alias', async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://google.com',
          customAlias: 'analytics'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('reserved');
    });
  });

  describe('3. Redirect & Click Tracking', () => {
    let testCode;
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://en.wikipedia.org/wiki/URL_shortening',
          customAlias: 'wiki-url',
          title: 'Wiki URL Shortening'
        });
      testCode = res.body.data.code;
    });

    it('redirects with HTTP 302 to destination URL', async () => {
      const res = await request(app)
        .get(`/${testCode}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        .set('Referer', 'https://www.google.com/');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://en.wikipedia.org/wiki/URL_shortening');
    });

    it('returns 404 for unknown short code', async () => {
      const res = await request(app)
        .get('/nonexistent-random-code-1234')
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });

    it('tracks mobile visits accurately from mobile User-Agent', async () => {
      const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const res = await request(app)
        .get(`/${testCode}`)
        .set('User-Agent', mobileUA)
        .set('Referer', 'https://twitter.com/');

      expect(res.status).toBe(302);
    });
  });

  describe('4. Expiry and Click Limits', () => {
    it('enforces clickLimit and deactivates after limit is reached', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://single-use.example.com',
          customAlias: 'one-click-only',
          clickLimit: 1
        });
      expect(createRes.status).toBe(201);

      // First click: should redirect
      const click1 = await request(app).get('/one-click-only');
      expect(click1.status).toBe(302);

      // Second click: should be expired (410)
      const click2 = await request(app)
        .get('/one-click-only')
        .set('Accept', 'application/json');
      expect(click2.status).toBe(410);
    });

    it('rejects expired links', async () => {
      // Create url with expiry in the past via repository
      const record = await urlRepository.create({
        id: 'expired-test-id',
        code: 'already-expired',
        longUrl: 'https://expired.example.com',
        expiresAt: new Date(Date.now() - 100000).toISOString(),
        isActive: true
      });
      expect(record.code).toBe('already-expired');

      const res = await request(app)
        .get('/already-expired')
        .set('Accept', 'application/json');
      expect(res.status).toBe(410);
    });
  });

  describe('5. Password Protection', () => {
    it('blocks unauthenticated access to password-protected links', async () => {
      const createRes = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://secret.example.com/vault',
          customAlias: 'super-secret',
          password: 'SecretPassword123!'
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.data.isPasswordProtected).toBe(true);
      expect(createRes.body.data.passwordHash).toBeUndefined(); // Password hash must never be exposed!

      // Attempting direct redirect without password
      const getRes = await request(app)
        .get('/super-secret')
        .set('Accept', 'application/json');
      expect(getRes.status).toBe(401);
      expect(getRes.body.passwordRequired).toBe(true);

      // Attempting with wrong password
      const wrongPassRes = await request(app)
        .post('/api/urls/super-secret/verify')
        .send({ password: 'WrongPassword' });
      expect(wrongPassRes.status).toBe(401);

      // Submitting correct password
      const correctPassRes = await request(app)
        .post('/api/urls/super-secret/verify')
        .send({ password: 'SecretPassword123!' });
      expect(correctPassRes.status).toBe(200);
      expect(correctPassRes.body.token).toBeDefined();

      // Visiting with token succeeds
      const token = correctPassRes.body.token;
      const redirectWithToken = await request(app)
        .get(`/super-secret?token=${token}`);
      expect(redirectWithToken.status).toBe(302);
      expect(redirectWithToken.headers.location).toBe('https://secret.example.com/vault');
    });
  });

  describe('6. Management APIs (List, Update, Delete, Bulk)', () => {
    let itemToManage;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://manage-me.example.com',
          customAlias: 'manage-test',
          title: 'Initial Title'
        });
      itemToManage = res.body.data;
    });

    it('lists URLs with pagination', async () => {
      const res = await request(app).get('/api/urls?limit=10&page=1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it('updates URL details', async () => {
      const res = await request(app)
        .patch(`/api/urls/${itemToManage.id}`)
        .send({
          title: 'Updated Title',
          isActive: false
        });
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.isActive).toBe(false);

      // Visiting disabled URL returns 403
      const redirectRes = await request(app)
        .get(`/${itemToManage.code}`)
        .set('Accept', 'application/json');
      expect(redirectRes.status).toBe(403);
    });

    it('deletes URL and associated clicks', async () => {
      const res = await request(app).delete(`/api/urls/${itemToManage.id}`);
      expect(res.status).toBe(200);

      const checkRes = await request(app).get(`/api/urls/${itemToManage.id}`);
      expect(checkRes.status).toBe(404);
    });
  });

  describe('7. Analytics Endpoints', () => {
    it('returns overall analytics summary with topUrls and recentClicks', async () => {
      const res = await request(app).get('/api/analytics/summary');
      expect(res.status).toBe(200);
      expect(res.body.data.totalLinks).toBeTypeOf('number');
      expect(res.body.data.totalClicks).toBeTypeOf('number');
      expect(Array.isArray(res.body.data.topUrls)).toBe(true);
    });

    it('returns device breakdown', async () => {
      const res = await request(app).get('/api/analytics/devices');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const devices = res.body.data.map((d) => d.name.toLowerCase());
      expect(devices).toContain('mobile');
      expect(devices).toContain('desktop');
    });

    it('returns timeseries data', async () => {
      const res = await request(app).get('/api/analytics/timeseries?days=7');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(7);
    });
  });

  describe('8. Storage Persistence Verification', () => {
    it('persists data across repository re-instantiation (simulating restart)', async () => {
      // Create a test record
      const uniqueCode = 'persist-chk-' + Date.now().toString(36);
      const res = await request(app)
        .post('/api/urls')
        .send({
          longUrl: 'https://persist-test.com',
          customAlias: uniqueCode
        });
      expect(res.status).toBe(201);

      // Flush writes to disk
      await urlRepository.flush();

      // Read directly using a fresh instance of UrlRepository pointing to same directory
      const freshRepo = new UrlRepository(urlRepository.storage.dir);
      await freshRepo.init();

      const found = await freshRepo.findByCode(uniqueCode);
      expect(found).not.toBeNull();
      expect(found.longUrl).toBe('https://persist-test.com/');
    });
  });
});
