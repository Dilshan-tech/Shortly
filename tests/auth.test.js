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
import { User } from '../backend/src/models/User.js';
import { Url } from '../backend/src/models/Url.js';
import { Click } from '../backend/src/models/Click.js';

// Target the isolated test database
const rawUri = config.mongodbUri || '';
const TEST_DB_URI = normalizeMongoUri(rawUri).replace(/\/shortly(\?|$)/, '/shortly_test$1');

let app;

describe('Shortly User Authentication & Account Management Test Suite', () => {
  before(async () => {
    console.log(`\n🧪 [AUTH TEST SETUP] Connecting to isolated test database: ${maskMongoUri(TEST_DB_URI)}...`);
    await connectDatabase(TEST_DB_URI);
    await userRepository.init();
    await urlRepository.init();
    await clickRepository.init();

    // Clean test collections
    await User.deleteMany({});
    await Url.deleteMany({});
    await Click.deleteMany({});

    app = createApp();
    console.log('🧹 [AUTH TEST SETUP] Clean test state ready.\n');
  });

  after(async () => {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === 'shortly_test') {
      await User.deleteMany({});
      await Url.deleteMany({});
      await Click.deleteMany({});
      await disconnectDatabase();
      console.log('🍃 [AUTH TEST TEARDOWN] Test database cleaned and disconnected.\n');
    }
  });

  describe('1. User Registration Flow', () => {
    it('successfully registers a new user with valid data and sets HttpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'reg_alice@example.com',
          password: 'Password123!',
          name: 'Alice Registration'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, 'reg_alice@example.com');
      assert.equal(res.body.data.user.name, 'Alice Registration');
      assert.equal(res.body.data.user.role, 'user');
      assert.equal(res.body.data.user.isActive, true);
      assert.ok(res.body.data.token, 'Should return access token');

      // Security check: passwords and secrets must never be exposed
      assert.equal(res.body.data.user.passwordHash, undefined, 'passwordHash must be stripped');
      assert.equal(res.body.data.user.refreshTokens, undefined, 'refreshTokens must be stripped');

      // Cookie checks
      const cookies = res.headers['set-cookie'] || [];
      assert.ok(cookies.some((c) => c.startsWith('token=')), 'Must set access token cookie');
      assert.ok(cookies.some((c) => c.startsWith('refreshToken=')), 'Must set refresh token cookie');
      assert.ok(cookies.some((c) => c.includes('HttpOnly')), 'Cookies must be HttpOnly');
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'reg_alice@example.com',
          password: 'AnotherPassword456!',
          name: 'Alice Impostor'
        });

      assert.equal(res.status, 409);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /already exists/i);
    });

    it('rejects weak password (< 8 chars or no numbers/letters) with 400', async () => {
      const resShort = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'reg_bob@example.com',
          password: 'pass1',
          name: 'Bob'
        });

      assert.equal(resShort.status, 400);
      assert.equal(resShort.body.success, false);

      const resNoDigits = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'reg_bob@example.com',
          password: 'passwordonly',
          name: 'Bob'
        });

      assert.equal(resNoDigits.status, 400);
      assert.equal(resNoDigits.body.success, false);
    });

    it('rejects invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          name: 'Invalid Email'
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  describe('2. User Login Flow & Enumeration Prevention', () => {
    before(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login_alice@example.com',
          password: 'Password123!',
          name: 'Login Alice'
        });
    });

    it('successfully logs in with valid credentials and sets fresh cookies', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login_alice@example.com',
          password: 'Password123!'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.user.email, 'login_alice@example.com');
      assert.ok(res.body.data.token);

      const cookies = res.headers['set-cookie'] || [];
      assert.ok(cookies.some((c) => c.startsWith('token=')));
      assert.ok(cookies.some((c) => c.startsWith('refreshToken=')));
    });

    it('returns generic 401 on incorrect password to prevent enumeration', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login_alice@example.com',
          password: 'WrongPassword999!'
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Invalid email or password.');
    });

    it('returns exact same generic 401 on non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_user@example.com',
          password: 'Password123!'
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Invalid email or password.');
    });
  });

  describe('3. Session Authentication & Protected Routes', () => {
    let validToken;
    let validCookie;

    before(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'session_user@example.com', password: 'Password123!', name: 'Session User' });
      validToken = regRes.body.data.token;
      const cookies = regRes.headers['set-cookie'] || [];
      validCookie = cookies.find((c) => c.startsWith('token=')).split(';')[0];
    });

    it('GET /api/auth/me succeeds with Bearer token header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, 'session_user@example.com');
    });

    it('GET /api/auth/me succeeds with HttpOnly token cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [validCookie]);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, 'session_user@example.com');
    });

    it('GET /api/auth/me fails without authentication (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'UNAUTHORIZED');
    });

    it('GET /api/auth/me fails with invalid/tampered token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'INVALID_TOKEN');
    });
  });

  describe('4. Session Restoration & Token Rotation', () => {
    let refreshTokenCookie;

    before(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'refresh_user@example.com', password: 'Password123!', name: 'Refresh User' });
      const cookies = regRes.headers['set-cookie'] || [];
      refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0];
    });

    it('POST /api/auth/refresh successfully rotates session tokens', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshTokenCookie]);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token, 'Must return new access token');
      assert.equal(res.body.data.user.email, 'refresh_user@example.com');

      // Fresh cookies set
      const cookies = res.headers['set-cookie'] || [];
      assert.ok(cookies.some((c) => c.startsWith('token=')));
      assert.ok(cookies.some((c) => c.startsWith('refreshToken=')));
    });

    it('POST /api/auth/refresh with bogus refresh token returns 401 and clears cookies', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=fake.invalid.token']);

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);

      // Clears invalid cookies
      const cookies = res.headers['set-cookie'] || [];
      assert.ok(cookies.some((c) => c.startsWith('token=;') || c.includes('token=;')));
    });
  });

  describe('5. Single Device & All Devices Logout Flow', () => {
    let refreshCookieHeader;

    before(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'logout_user@example.com', password: 'Password123!', name: 'Logout User' });
      const cookies = regRes.headers['set-cookie'] || [];
      refreshCookieHeader = cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0];
    });

    it('POST /api/auth/logout invalidates session and clears cookies', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [refreshCookieHeader]);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const cookies = res.headers['set-cookie'] || [];
      assert.ok(cookies.some((c) => c.includes('token=;')));
      assert.ok(cookies.some((c) => c.includes('refreshToken=;')));

      // Attempting to refresh with the logged-out refresh token must fail
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookieHeader]);
      assert.equal(refreshRes.status, 401);
    });

    it('POST /api/auth/logout-all revokes all sessions across all devices', async () => {
      // Log in twice simulating two devices
      const device1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logout_user@example.com', password: 'Password123!' });
      const dev1Refresh = device1.headers['set-cookie'].find((c) => c.startsWith('refreshToken=')).split(';')[0];
      const dev1Token = device1.body.data.token;

      const device2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'logout_user@example.com', password: 'Password123!' });
      const dev2Refresh = device2.headers['set-cookie'].find((c) => c.startsWith('refreshToken=')).split(';')[0];

      // Check user has multiple sessions in database
      const userDoc = await User.findOne({ email: 'logout_user@example.com' });
      assert.ok(userDoc.refreshTokens.length >= 2, 'Should have multiple active sessions');

      // Trigger logout-all from Device 1
      const logoutAllRes = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${dev1Token}`);

      assert.equal(logoutAllRes.status, 200);

      // Verify all sessions cleared in DB
      const updatedUser = await User.findOne({ email: 'logout_user@example.com' });
      assert.equal(updatedUser.refreshTokens.length, 0);

      // Both device refresh tokens must now be rejected
      const testDev1 = await request(app).post('/api/auth/refresh').set('Cookie', [dev1Refresh]);
      assert.equal(testDev1.status, 401);

      const testDev2 = await request(app).post('/api/auth/refresh').set('Cookie', [dev2Refresh]);
      assert.equal(testDev2.status, 401);
    });
  });

  describe('6. Profile Updates & Email Modification', () => {
    let authToken;

    before(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'profile_user@example.com', password: 'Password123!', name: 'Original Name' });
      authToken = regRes.body.data.token;
    });

    it('PATCH /api/auth/profile updates user display name', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Alice Wonder' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Alice Wonder');
    });

    it('PATCH /api/auth/email requires valid current password', async () => {
      const res = await request(app)
        .patch('/api/auth/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'profile_user_new@example.com',
          currentPassword: 'WrongPassword!'
        });

      assert.equal(res.status, 401);
      assert.match(res.body.error, /incorrect/i);
    });

    it('PATCH /api/auth/email updates email when password is correct', async () => {
      const res = await request(app)
        .patch('/api/auth/email')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newEmail: 'profile_user_new@example.com',
          currentPassword: 'Password123!'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.email, 'profile_user_new@example.com');

      // Confirm can log in with new email
      const loginNew = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'profile_user_new@example.com',
          password: 'Password123!'
        });
      assert.equal(loginNew.status, 200);
    });
  });

  describe('7. Password Change Flow & Session Revocation', () => {
    let authToken;

    before(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'password_user@example.com', password: 'Password123!', name: 'Password User' });
      authToken = regRes.body.data.token;
    });

    it('POST /api/auth/change-password fails with incorrect current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword999!',
          newPassword: 'BrandNewPassword456!'
        });

      assert.equal(res.status, 401);
      assert.match(res.body.error, /incorrect/i);
    });

    it('POST /api/auth/change-password changes password and invalidates previous sessions', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'BrandNewPassword456!'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);

      // Old password fails to log in
      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'password_user@example.com',
          password: 'Password123!'
        });
      assert.equal(oldLogin.status, 401);

      // New password logs in successfully
      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'password_user@example.com',
          password: 'BrandNewPassword456!'
        });
      assert.equal(newLogin.status, 200);
    });
  });

  describe('8. URL Ownership & Cross-User Isolation Enforcement', () => {
    let user1Token;
    let user1Id;
    let user2Token;
    let user2Id;
    let user1Url;

    before(async () => {
      // Register User 1
      const reg1 = await request(app)
        .post('/api/auth/register')
        .send({ email: 'iso_user1@example.com', password: 'Password123!', name: 'User One' });
      user1Token = reg1.body.data.token;
      user1Id = reg1.body.data.user.id;

      // Register User 2
      const reg2 = await request(app)
        .post('/api/auth/register')
        .send({ email: 'iso_user2@example.com', password: 'Password123!', name: 'User Two' });
      user2Token = reg2.body.data.token;
      user2Id = reg2.body.data.user.id;

      // User 1 creates a private link
      const createRes = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          longUrl: 'https://user1-confidential.com/dashboard',
          title: 'User 1 Confidential Link'
        });
      assert.equal(createRes.status, 201);
      user1Url = createRes.body.data;
    });

    it('User 1 can access and modify their own URL', async () => {
      const getRes = await request(app)
        .get(`/api/urls/${user1Url.id}`)
        .set('Authorization', `Bearer ${user1Token}`);
      assert.equal(getRes.status, 200);
      assert.equal(getRes.body.data.id, user1Url.id);

      const updateRes = await request(app)
        .patch(`/api/urls/${user1Url.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Updated By Owner' });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.title, 'Updated By Owner');
    });

    it('User 2 is blocked from viewing User 1 private URL (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/urls/${user1Url.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);
    });

    it('User 2 is blocked from modifying User 1 URL (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/urls/${user1Url.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ title: 'Hacked Title' });

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);
    });

    it('User 2 is blocked from viewing User 1 URL analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/urls/${user1Url.id}/analytics`)
        .set('Authorization', `Bearer ${user2Token}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);
    });

    it('User 2 is blocked from deleting User 1 URL (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/urls/${user1Url.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      assert.equal(res.status, 403);
      assert.match(res.body.error, /permission/i);
    });

    it('Unauthenticated visitor is blocked from modifying User 1 URL (401/403)', async () => {
      const res = await request(app)
        .patch(`/api/urls/${user1Url.id}`)
        .send({ title: 'Anonymous Hack' });

      assert.ok(res.status === 401 || res.status === 403);
    });

    it('GET /api/urls scopes links to authenticated user', async () => {
      // User 2 creates their own link
      await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ longUrl: 'https://user2-domain.com/page' });

      // User 1 lists links
      const list1 = await request(app)
        .get('/api/urls')
        .set('Authorization', `Bearer ${user1Token}`);

      assert.equal(list1.status, 200);
      assert.ok(list1.body.data.every((u) => u.ownerId === user1Id || u.userId === user1Id));
      assert.ok(!list1.body.data.some((u) => u.longUrl.includes('user2-domain')));

      // User 2 lists links
      const list2 = await request(app)
        .get('/api/urls')
        .set('Authorization', `Bearer ${user2Token}`);

      assert.equal(list2.status, 200);
      assert.ok(list2.body.data.every((u) => u.ownerId === user2Id || u.userId === user2Id));
      assert.ok(!list2.body.data.some((u) => u.longUrl.includes('user1-confidential')));
    });
  });

  describe('9. Account Deletion & Cascading Cleanup', () => {
    let user3Token;
    let user3Id;
    let user3Url;

    before(async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ email: 'del_user@example.com', password: 'Password123!', name: 'User Three' });
      user3Token = reg.body.data.token;
      user3Id = reg.body.data.user.id;

      // Create a URL and click record
      const createUrl = await request(app)
        .post('/api/urls')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ longUrl: 'https://user3-toBeDeleted.com' });
      user3Url = createUrl.body.data;

      // Simulate click on User 3's URL
      await request(app).get(`/${user3Url.code}`);
    });

    it('DELETE /api/auth/account fails with incorrect password (401)', async () => {
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ currentPassword: 'WrongPassword!' });

      assert.equal(res.status, 401);
    });

    it('DELETE /api/auth/account cascades deletion of user, URLs, and clicks', async () => {
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({ currentPassword: 'Password123!' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify User deleted
      const userInDb = await User.findById(user3Id);
      assert.equal(userInDb, null);

      // Verify User's URLs deleted
      const urlInDb = await Url.findOne({ id: user3Url.id });
      assert.equal(urlInDb, null);

      // Verify User's Clicks deleted
      const clicksInDb = await Click.find({ urlId: user3Url.id });
      assert.equal(clicksInDb.length, 0);

      // Cookies cleared
      const cookies = res.headers['set-cookie'] || [];
      assert.ok(cookies.some((c) => c.includes('token=;')));
    });
  });

  describe('10. CSRF Protection for Cookie-Authenticated State Mutations', () => {
    let cookieHeader;

    before(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'csrf_user@example.com', password: 'Password123!', name: 'CSRF User' });
      const cookies = regRes.headers['set-cookie'] || [];
      cookieHeader = cookies.find((c) => c.startsWith('token=')).split(';')[0];
    });

    it('blocks cookie state mutation without custom header or frontend origin (403 CSRF_BLOCKED)', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [cookieHeader])
        .send({ name: 'CSRF Attacker' });

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'CSRF_BLOCKED');
    });

    it('permits cookie state mutation with X-Requested-With header', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [cookieHeader])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ name: 'Legitimate Client' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.name, 'Legitimate Client');
    });

    it('permits cookie state mutation with frontend Origin header', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', [cookieHeader])
        .set('Origin', config.frontendUrl)
        .send({ name: 'Origin Client' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.name, 'Origin Client');
    });
  });
});
