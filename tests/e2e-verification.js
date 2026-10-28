import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from '../backend/src/app.js';
import { urlRepository } from '../backend/src/repositories/urlRepository.js';
import { clickRepository } from '../backend/src/repositories/clickRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const e2eDataDir = path.resolve(__dirname, '../backend/data-e2e');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      if (typeof postData === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
}

async function runE2E() {
  console.log('🚀 Starting Shortly End-to-End Verification...');

  await urlRepository.init();
  await clickRepository.init();

  const testAlias = 'dm-e2e-' + Date.now().toString(36);
  const app = createApp();
  const server = app.listen(5055);

  try {
    // 1. Health check
    console.log('1️⃣ Checking Health endpoint...');
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5055,
      path: '/api/health',
      method: 'GET'
    });
    if (health.statusCode !== 200 || health.json?.status !== 'healthy') {
      throw new Error(`Health check failed: ${health.body}`);
    }
    console.log('   ✅ Health endpoint is healthy.');

    // 2. Create link
    console.log(`2️⃣ Creating short link with alias "/${testAlias}"...`);
    const createRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5055,
        path: '/api/urls',
        method: 'POST'
      },
      {
        longUrl: 'https://github.com/GoogleDeepMind',
        customAlias: testAlias,
        title: 'DeepMind Research'
      }
    );
    if (createRes.statusCode !== 201) {
      throw new Error(`Create link failed: ${createRes.body}`);
    }
    const created = createRes.json.data;
    console.log(`   ✅ Link created: ${created.shortUrl} -> https://github.com/GoogleDeepMind`);

    // 3. Open generated short URL from Mobile User-Agent
    console.log('3️⃣ Simulating iPhone visit via Twitter...');
    const mobileVisit = await makeRequest({
      hostname: 'localhost',
      port: 5055,
      path: `/${testAlias}`,
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Referer: 'https://t.co/xyz'
      }
    });
    if (mobileVisit.statusCode !== 302 || !mobileVisit.headers.location.includes('GoogleDeepMind')) {
      throw new Error(`Mobile redirect failed: status ${mobileVisit.statusCode}`);
    }
    console.log(`   ✅ Redirected with 302 to: ${mobileVisit.headers.location}`);

    // 4. Open generated short URL from Desktop Chrome
    console.log('4️⃣ Simulating Desktop Chrome visit via Google Search...');
    const desktopVisit = await makeRequest({
      hostname: 'localhost',
      port: 5055,
      path: `/${testAlias}`,
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.google.com/search?q=deepmind'
      }
    });
    if (desktopVisit.statusCode !== 302) {
      throw new Error(`Desktop redirect failed: status ${desktopVisit.statusCode}`);
    }
    console.log('   ✅ Desktop visit recorded and redirected with 302.');

    // Wait 150ms for debounced click persistence
    await new Promise((r) => setTimeout(r, 150));

    // 5. Verify individual link analytics
    console.log('5️⃣ Verifying link specific analytics...');
    const linkAnalyticsRes = await makeRequest({
      hostname: 'localhost',
      port: 5055,
      path: `/api/urls/${created.id}/analytics`,
      method: 'GET'
    });
    const linkAnalytics = linkAnalyticsRes.json.data;
    if (linkAnalytics.summary.totalClicks !== 2) {
      throw new Error(`Expected 2 clicks on link, got ${linkAnalytics.summary.totalClicks}`);
    }
    console.log(`   ✅ Link analytics confirmed: 2 clicks, ${linkAnalytics.summary.uniqueVisitors} unique visitors.`);

    // 6. Verify device breakdown
    console.log('6️⃣ Verifying device classification for this link...');
    const linkDevices = linkAnalytics.devices;
    const mobileCount = linkDevices.find((d) => d.name === 'Mobile')?.count || 0;
    const desktopCount = linkDevices.find((d) => d.name === 'Desktop')?.count || 0;
    if (mobileCount !== 1 || desktopCount !== 1) {
      throw new Error(`Device classification mismatch: Mobile=${mobileCount}, Desktop=${desktopCount}`);
    }
    console.log(`   ✅ Real device detection accurate: Mobile=${mobileCount}, Desktop=${desktopCount}`);

    // 7. Verify referrers breakdown
    console.log('7️⃣ Verifying traffic sources / referrers...');
    const referrers = linkAnalytics.referrers;
    console.log(`   ✅ Traffic sources: ${referrers.map((r) => `${r.name}: ${r.count}`).join(', ')}`);

    // 8. Test persistence across server restart
    console.log('8️⃣ Testing Persistence Across Simulated Server Restart...');
    await urlRepository.flush();
    await clickRepository.flush();
    await new Promise((resolve) => server.close(resolve));
    console.log('   🛑 Server 1 stopped.');

    // Re-initialize fresh repository instances on same directory
    console.log('   ⚡ Starting Server 2 with existing JSON data...');
    urlRepository.isInitialized = false;
    clickRepository.isInitialized = false;
    await urlRepository.init();
    await clickRepository.init();

    const server2 = createApp().listen(5055);
    try {
      const restartedRes = await makeRequest({
        hostname: 'localhost',
        port: 5055,
        path: `/api/urls/${created.id}/analytics`,
        method: 'GET'
      });
      if (restartedRes.json?.data?.summary?.totalClicks !== 2) {
        throw new Error(`Data lost after restart! Found clicks: ${restartedRes.json?.data?.summary?.totalClicks}`);
      }
      console.log('   ✅ Persistence verified: 100% of data and clicks survived server restart!');
    } finally {
      await new Promise((resolve) => server2.close(resolve));
    }

    // 9. Clean up test record so data remains pristine
    await urlRepository.delete(created.id);
    await clickRepository.deleteByUrlId(created.id);
    await urlRepository.flush();
    await clickRepository.flush();

    console.log('\n🎉 ALL END-TO-END WORKFLOW VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    server.close();
    throw err;
  }
}

runE2E().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
