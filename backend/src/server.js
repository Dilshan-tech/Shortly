import { createApp } from './app.js';
import { config, validateConfig, maskMongoUri } from './config/env.js';
import { urlRepository } from './repositories/urlRepository.js';
import { clickRepository } from './repositories/clickRepository.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './config/database.js';

async function bootstrap() {
  try {
    validateConfig();

    // Connect to MongoDB Atlas (Primary Database)
    if (!config.mongodbUri || config.mongodbUri === 'PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE') {
      console.error('❌ [MONGODB] MONGODB_URI is not configured in backend/.env.');
      console.error('   Shortly requires MongoDB Atlas as its primary database.');
      if (config.isProd) {
        throw new Error('MONGODB_URI is required in production.');
      }
    } else {
      console.log(`🍃 Connecting to MongoDB Atlas (${maskMongoUri(config.mongodbUri)})...`);
      const conn = await connectDatabase();
      if (!conn.success) {
        console.error('❌ [MONGODB] Failed to connect to MongoDB Atlas cluster.');
        if (config.isProd) {
          throw new Error('Failed to connect to MongoDB Atlas: ' + conn.error);
        }
      }
    }

    if (isDatabaseConnected()) {
      console.log('⚡ Initializing database models and indexes...');
      await urlRepository.init();
      await clickRepository.init();
      console.log('✅ MongoDB models and indexes ready.');
    } else {
      console.warn('⚠️ [MONGODB] Running without active database connection. Database-dependent API routes will respond with 503.');
    }

    const app = createApp();

    const server = app.listen(config.port, config.host, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   SHORTLY URL SHORTENER                   ║
║                     Backend Running                       ║
╠═══════════════════════════════════════════════════════════╣
║  • Host Interface:  ${config.host.padEnd(38)}║
║  • Port:            ${config.port.toString().padEnd(38)}║
║  • Environment:     ${config.env.padEnd(38)}║
║  • Public URL Base: ${config.publicUrl.padEnd(38)}║
║  • Database Status: ${(isDatabaseConnected() ? 'Connected (MongoDB Atlas)' : 'DISCONNECTED (503 Service Unavailable)').padEnd(38)}║
╚═══════════════════════════════════════════════════════════╝
      `);
      if (config.isDev && (config.publicUrl.includes('localhost') || config.publicUrl.includes('127.0.0.1'))) {
        console.log(`💡 [Mobile & External Testing Tips]:`);
        console.log(`   1. VS Code Port Forwarding (Recommended):`);
        console.log(`      Forward port 5000 in VS Code (Right-click port 5000 -> Port Visibility -> Public)`);
        console.log(`      Run: $env:PUBLIC_URL="https://<your-code>-5000.app.github.dev"; npm run dev`);
        console.log(`   2. Wi-Fi LAN Testing:`);
        console.log(`      Run: $env:PUBLIC_URL="http://<YOUR_LAN_IP>:${config.port}"; npm run dev\n`);
      }
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        try {
          console.log('💾 Flushing pending file writes and closing database...');
          await urlRepository.flush();
          await clickRepository.flush();
          await disconnectDatabase();
          console.log('✅ Clean exit.');
          process.exit(0);
        } catch (err) {
          console.error('❌ Error during shutdown write flush:', err);
          process.exit(1);
        }
      });

      // Force exit after 5 seconds if not closed
      setTimeout(() => {
        console.error('⚠️ Shutdown timeout reached. Forcing process exit.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('❌ Fatal error during backend bootstrap:', err);
    process.exit(1);
  }
}

bootstrap();
