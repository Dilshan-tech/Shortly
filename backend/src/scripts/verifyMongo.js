import mongoose from 'mongoose';
import { config, maskMongoUri } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

async function verifyMongo() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           MONGODB ATLAS CONNECTION VERIFICATION               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('1. Checking environment variable loading...');
  if (!config.mongodbUri || config.mongodbUri === 'PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE') {
    console.log('⚠️ [MONGODB_URI] Variable is currently set to placeholder:');
    console.log('   "PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE"');
    console.log('\n👉 ACTION REQUIRED:');
    console.log('   1. Open: backend/.env');
    console.log('   2. Replace the placeholder on line 15 with your MongoDB Atlas connection string.');
    console.log('   3. Re-run this check.\n');
    process.exit(0);
  }

  console.log(`✅ MONGODB_URI detected: ${maskMongoUri(config.mongodbUri)}`);
  console.log('2. Attempting connection to MongoDB Atlas cluster...');

  const startTime = Date.now();
  const result = await connectDatabase();
  const elapsed = Date.now() - startTime;

  if (result.success) {
    console.log(`\n🎉 Connection successful in ${elapsed}ms!`);
    console.log(`   • Database Name: ${result.database}`);
    console.log(`   • Connected Host: ${result.host}`);
    console.log(`   • Masked URI:    ${result.maskedUri}`);

    // Ping check
    try {
      const pingRes = await mongoose.connection.db.admin().ping();
      console.log('   • Cluster Ping:   OK', pingRes);
    } catch (e) {
      console.warn('   • Cluster Ping warning:', e.message);
    }

    // Inspect Collections and Record Counts
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const colNames = collections.map(c => c.name);
      console.log('\n3. Inspecting MongoDB Database Collections:');
      console.log(`   • Existing Collections: ${colNames.join(', ') || 'None yet'}`);

      const Url = (await import('../models/Url.js')).default;
      const Click = (await import('../models/Click.js')).default;
      const User = (await import('../models/User.js')).default;

      const urlCount = await Url.countDocuments();
      const clickCount = await Click.countDocuments();
      const userCount = await User.countDocuments();

      console.log('\n4. Live Document Counts in MongoDB Atlas:');
      console.log(`   • urls collection:   ${urlCount} document(s)`);
      console.log(`   • clicks collection: ${clickCount} document(s)`);
      console.log(`   • users collection:  ${userCount} document(s)`);

      if (urlCount > 0) {
        console.log('\n5. Migrated URLs stored in MongoDB Atlas:');
        const urls = await Url.find().select('code originalUrl longUrl clicks isOneTimeUse isPasswordProtected createdAt').lean();
        urls.forEach((u, i) => {
          console.log(`   [${i + 1}] Code: ${u.code} -> Destination: ${u.longUrl || u.originalUrl} | Clicks: ${u.clicks}`);
        });
      }
    } catch (e) {
      console.warn('   • Inspection warning:', e.message);
    }

    console.log('\n✅ Your MongoDB Atlas configuration is ready for Shortly!');
    await disconnectDatabase();
    process.exit(0);
  } else {
    console.error(`\n❌ MongoDB Connection Failed in ${elapsed}ms`);
    console.error(`   Error: ${result.error}`);
    if (result.details) {
      console.error(`   Issue: ${result.details.reason}`);
      console.error(`   Fix:   ${result.details.suggestion}`);
    }
    process.exit(1);
  }
}

verifyMongo().catch((err) => {
  console.error('\n❌ Unexpected error running verification:', err);
  process.exit(1);
});
