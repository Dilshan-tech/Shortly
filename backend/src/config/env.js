import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve data directory relative to project root
const defaultDataDir = path.resolve(__dirname, '../../data');

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  // Public URL used for generating short links and QR codes.
  // Can be set to LAN IP e.g. http://192.168.1.50:5000 or custom domain in production.
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:5000').replace(/\/+$/, ''),
  
  // Frontend origin for CORS
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),

  // Data storage directory for JSON records
  dataDir: process.env.DATA_DIR || defaultDataDir,

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  redirectRateLimitMax: parseInt(process.env.REDIRECT_RATE_LIMIT_MAX || '300', 10),

  // Allow localhost / private loopback destination URLs in development
  allowLocalhostDestinations: process.env.ALLOW_LOCAL_URLS === 'true' || (process.env.NODE_ENV !== 'production'),

  // Code generation
  shortCodeLength: parseInt(process.env.SHORT_CODE_LENGTH || '7', 10),
};

// Validate critical configuration on startup
export function validateConfig() {
  if (isNaN(config.port) || config.port <= 0 || config.port > 65535) {
    throw new Error(`Invalid PORT configuration: ${process.env.PORT}`);
  }

  try {
    new URL(config.publicUrl);
  } catch {
    throw new Error(`Invalid PUBLIC_URL configuration: ${config.publicUrl}`);
  }

  if (config.env === 'production') {
    if (config.publicUrl.includes('localhost') || config.publicUrl.includes('127.0.0.1')) {
      console.warn('⚠️ [CONFIG WARNING] Running in production with a localhost PUBLIC_URL.');
    }
  }
}
