import { createApp } from './app.js';
import { config, validateConfig } from './config/env.js';
import { urlRepository } from './repositories/urlRepository.js';
import { clickRepository } from './repositories/clickRepository.js';

async function bootstrap() {
  try {
    validateConfig();

    console.log('⚡ Initializing persistent JSON repositories...');
    await urlRepository.init();
    await clickRepository.init();
    console.log('✅ Repositories initialized successfully.');

    const app = createApp();

    const server = app.listen(config.port, config.host, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                   SHORTLY URL SHORTENER                   ║
║                     Backend Running                       ║
╠═══════════════════════════════════════════════════════════╣
║  • Port:            ${config.port.toString().padEnd(38)}║
║  • Mode:            ${config.env.padEnd(38)}║
║  • Public Link Base:${config.publicUrl.padEnd(38)}║
║  • Data Storage:    ${config.dataDir.slice(-38).padEnd(38)}║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        try {
          console.log('💾 Flushing pending file writes...');
          await urlRepository.flush();
          await clickRepository.flush();
          console.log('✅ Writes flushed. Clean exit.');
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
