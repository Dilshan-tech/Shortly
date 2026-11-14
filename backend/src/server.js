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
║  • Host Interface:  ${config.host.padEnd(38)}║
║  • Port:            ${config.port.toString().padEnd(38)}║
║  • Environment:     ${config.env.padEnd(38)}║
║  • Public URL Base: ${config.publicUrl.padEnd(38)}║
║  • Storage Dir:     ${config.dataDir.slice(-38).padEnd(38)}║
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
