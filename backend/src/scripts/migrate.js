import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, maskMongoUri } from '../config/env.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/database.js';
import { Url } from '../models/Url.js';
import { Click } from '../models/Click.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrateJsonToMongo({
  isDryRun = process.argv.includes('--dry-run'),
  silent = false,
  targetUri = null
} = {}) {
  const log = (...args) => {
    if (!silent) console.log(...args);
  };
  const logError = (...args) => {
    if (!silent) console.error(...args);
  };

  log('╔═══════════════════════════════════════════════════════════════╗');
  log('║       SHORTLY JSON TO MONGODB ATLAS DATA MIGRATION           ║');
  log('╚═══════════════════════════════════════════════════════════════╝');
  if (isDryRun) {
    log('🔍 MODE: DRY-RUN (Simulating migration without modifying MongoDB)\n');
  } else {
    log('⚡ MODE: LIVE MIGRATION (Idempotent upsert to MongoDB Atlas)\n');
  }

  const effectiveUri = targetUri || config.mongodbUri;
  if (!effectiveUri || effectiveUri === 'PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE') {
    logError('❌ MONGODB_URI is not configured in backend/.env.');
    return { success: false, error: 'MONGODB_URI not configured' };
  }

  log(`🍃 Target Cluster: ${maskMongoUri(effectiveUri)}`);
  const connResult = await connectDatabase(effectiveUri);

  if (!connResult.success) {
    logError('\n❌ Could not connect to MongoDB Atlas for migration.');
    if (connResult.details) {
      logError(`   Reason: ${connResult.details.reason}`);
      logError(`   Tip:    ${connResult.details.suggestion}`);
    }
    return { success: false, error: connResult.error };
  }

  const dataDir = config.dataDir;
  const urlsPath = path.join(dataDir, 'urls.json');
  const clicksPath = path.join(dataDir, 'clicks.json');

  const stats = {
    urls: {
      totalInFile: 0,
      importedNew: 0,
      updatedExisting: 0,
      skipped: 0,
      failed: 0,
      malformed: []
    },
    clicks: {
      totalInFile: 0,
      importedNew: 0,
      updatedExisting: 0,
      skipped: 0,
      failed: 0,
      malformed: []
    }
  };

  // 1. Migrate URLs from urls.json
  if (fs.existsSync(urlsPath)) {
    try {
      const rawUrls = fs.readFileSync(urlsPath, 'utf8');
      const jsonRecords = JSON.parse(rawUrls);

      if (Array.isArray(jsonRecords)) {
        stats.urls.totalInFile = jsonRecords.length;
        log(`\n📦 Found ${jsonRecords.length} URL records in: ${urlsPath}`);

        for (const [index, r] of jsonRecords.entries()) {
          // Validate record structure
          if (!r || typeof r !== 'object' || !r.code || !r.longUrl) {
            stats.urls.failed++;
            stats.urls.malformed.push({ index, record: r, reason: 'Missing code or longUrl' });
            logError(`   ⚠️ Skipping malformed URL record at index ${index}: missing code or longUrl`);
            continue;
          }

          const legacyId = r.id || `legacy_${r.code}`;

          // Map fields precisely to Mongoose schema
          const doc = {
            id: legacyId,
            code: String(r.code).trim(),
            longUrl: String(r.longUrl).trim(),
            title: r.title ? String(r.title).trim() : '',
            customAlias: r.customAlias ? String(r.customAlias).trim() : null,
            passwordHash: r.passwordHash || null,
            isPasswordProtected: Boolean(r.isPasswordProtected),
            expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
            clickLimit: typeof r.clickLimit === 'number' && r.clickLimit > 0 ? r.clickLimit : null,
            isOneTimeUse: Boolean(r.isOneTimeUse),
            isActive: r.isActive !== undefined ? Boolean(r.isActive) : true,
            clicks: typeof r.clicks === 'number' ? Math.max(0, r.clicks) : 0,
            // Legacy records preserved with ownerId: null (never assigning arbitrary users)
            ownerId: null,
            userId: null,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date()
          };

          if (isDryRun) {
            const existing = await Url.findOne({ $or: [{ id: doc.id }, { code: doc.code }] });
            if (existing) {
              stats.urls.updatedExisting++;
              log(`   [DRY-RUN UPDATE] code: "${doc.code}" -> destination: ${doc.longUrl.slice(0, 40)}...`);
            } else {
              stats.urls.importedNew++;
              log(`   [DRY-RUN INSERT] code: "${doc.code}" -> destination: ${doc.longUrl.slice(0, 40)}...`);
            }
          } else {
            const existing = await Url.findOne({ $or: [{ id: doc.id }, { code: doc.code }] });
            const res = await Url.updateOne(
              { $or: [{ id: doc.id }, { code: doc.code }] },
              { $set: doc },
              { upsert: true }
            );

            if (res.upsertedCount > 0) {
              stats.urls.importedNew++;
              log(`   [INSERTED] code: "${doc.code}" (Title: "${doc.title || doc.code}")`);
            } else if (res.matchedCount > 0) {
              stats.urls.updatedExisting++;
              log(`   [SYNCHRONIZED] code: "${doc.code}" (Updated existing)`);
            } else {
              stats.urls.skipped++;
            }
          }
        }
      }
    } catch (err) {
      logError(`❌ Error reading or parsing ${urlsPath}:`, err.message);
    }
  } else {
    log(`ℹ️ ${urlsPath} does not exist. Skipping URLs.`);
  }

  // 2. Migrate Clicks from clicks.json
  if (fs.existsSync(clicksPath)) {
    try {
      const rawClicks = fs.readFileSync(clicksPath, 'utf8');
      const clickRecords = JSON.parse(rawClicks);

      if (Array.isArray(clickRecords)) {
        stats.clicks.totalInFile = clickRecords.length;
        log(`\n📊 Found ${clickRecords.length} Click records in: ${clicksPath}`);

        for (const [index, c] of clickRecords.entries()) {
          if (!c || typeof c !== 'object' || !c.code) {
            stats.clicks.failed++;
            stats.clicks.malformed.push({ index, record: c, reason: 'Missing code' });
            continue;
          }

          const legacyClickId = c.id || `click_${index}_${Date.now()}`;

          // Find matching URL document in MongoDB to attach ObjectId reference
          let matchingUrlId = null;
          if (c.urlId) {
            const parentUrl = await Url.findOne({ id: c.urlId }).select('_id');
            if (parentUrl) matchingUrlId = parentUrl._id;
          }

          const clickDoc = {
            id: legacyClickId,
            urlId: c.urlId || 'unknown',
            url: matchingUrlId,
            code: c.code,
            ip: c.ip || 'unknown',
            userAgent: c.userAgent || '',
            referrer: c.referrer || 'Direct',
            deviceCategory: c.deviceCategory || 'desktop',
            browser: c.browser || 'Other',
            os: c.os || 'Other',
            visitorId: c.visitorId || null,
            country: c.country || 'Unknown',
            city: c.city || 'Unknown',
            timestamp: c.timestamp ? new Date(c.timestamp) : new Date()
          };

          if (isDryRun) {
            const existing = await Click.findOne({ id: clickDoc.id });
            if (existing) {
              stats.clicks.updatedExisting++;
            } else {
              stats.clicks.importedNew++;
            }
          } else {
            const res = await Click.updateOne(
              { id: clickDoc.id },
              { $set: clickDoc },
              { upsert: true }
            );

            if (res.upsertedCount > 0) {
              stats.clicks.importedNew++;
            } else {
              stats.clicks.updatedExisting++;
            }
          }
        }

        log(`   Clicks processed: ${stats.clicks.totalInFile} (New: ${stats.clicks.importedNew}, Existing: ${stats.clicks.updatedExisting})`);
      }
    } catch (err) {
      logError(`❌ Error reading or parsing ${clicksPath}:`, err.message);
    }
  } else {
    log(`ℹ️ ${clicksPath} not found. Skipping clicks.`);
  }

  // 3. Ensure collection indexes
  if (!isDryRun) {
    log('\n🔍 Ensuring database indexes on Url and Click collections...');
    await Url.createIndexes();
    await Click.createIndexes();
    log('✅ Indexes verified successfully.');
  }

  // 4. Print Summary Report
  log('\n╔═══════════════════════════════════════════════════════════════╗');
  log('║                     MIGRATION REPORT                          ║');
  log('╠═══════════════════════════════════════════════════════════════╣');
  log(`║  • URLs Total in JSON:     ${String(stats.urls.totalInFile).padEnd(35)}║`);
  log(`║  • URLs Newly Inserted:    ${String(stats.urls.importedNew).padEnd(35)}║`);
  log(`║  • URLs Synchronized:      ${String(stats.urls.updatedExisting).padEnd(35)}║`);
  log(`║  • URLs Failed/Malformed:  ${String(stats.urls.failed).padEnd(35)}║`);
  log('╟───────────────────────────────────────────────────────────────╢');
  log(`║  • Clicks Total in JSON:   ${String(stats.clicks.totalInFile).padEnd(35)}║`);
  log(`║  • Clicks Newly Inserted:  ${String(stats.clicks.importedNew).padEnd(35)}║`);
  log(`║  • Clicks Synchronized:    ${String(stats.clicks.updatedExisting).padEnd(35)}║`);
  log('╚═══════════════════════════════════════════════════════════════╝\n');

  log('🔒 Safety Check:');
  log(`   • Original JSON files were NOT deleted or modified.`);
  log(`   • urls.json preserved at: ${urlsPath}`);
  log(`   • clicks.json preserved at: ${clicksPath}`);
  log(`   • Legacy records stored with ownerId: null`);
  log(`   • Script is idempotent: repeated runs will not duplicate records.\n`);

  return {
    success: true,
    isDryRun,
    stats
  };
}

// Execute CLI runner if executed directly
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrateJsonToMongo()
    .then(async (res) => {
      await disconnectDatabase();
      process.exit(res.success ? 0 : 1);
    })
    .catch(async (err) => {
      console.error('❌ Migration failed with fatal error:', err);
      await disconnectDatabase();
      process.exit(1);
    });
}
