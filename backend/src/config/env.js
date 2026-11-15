import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely load env variables from file without external dependencies
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(filePath);
      return;
    }
  } catch {}

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

// Load environment in priority order
const candidateEnvFiles = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../.env.local'),
  path.resolve(__dirname, '../../.env.example')
];

for (const envFile of candidateEnvFiles) {
  loadEnvFile(envFile);
}

// Resolve data directory relative to project root
const defaultDataDir = path.resolve(__dirname, '../../data');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';
const isDev = !isProd && !isTest;

const port = parseInt(process.env.PORT || '5000', 10);
const host = process.env.HOST || '0.0.0.0';

// In development, default to http://localhost:${port} if PUBLIC_URL is not set.
// In production, PUBLIC_URL must be provided via environment variable with https://.
const defaultDevPublicUrl = `http://localhost:${port}`;
const rawPublicUrl = process.env.PUBLIC_URL || (isProd ? '' : defaultDevPublicUrl);
const publicUrl = rawPublicUrl ? rawPublicUrl.replace(/\/+$/, '') : '';

// Frontend origin for CORS and dashboard links.
// In production, FRONTEND_URL or ALLOWED_ORIGINS should be specified.
// In development, defaults to http://localhost:5173 while also permitting dev LAN / tunnel origins.
const frontendUrl = (process.env.FRONTEND_URL || (isProd ? '' : 'http://localhost:5173')).replace(/\/+$/, '');

// Comma-separated list of extra allowed CORS origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

/**
 * Normalizes MongoDB URI: appends '/shortly' database name if omitted before query parameters.
 */
export function normalizeMongoUri(rawUri) {
  if (!rawUri || rawUri === 'PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE') return rawUri || '';
  const trimmed = rawUri.trim();
  if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
    try {
      const qIdx = trimmed.indexOf('?');
      const base = qIdx !== -1 ? trimmed.slice(0, qIdx) : trimmed;
      const query = qIdx !== -1 ? trimmed.slice(qIdx) : '';
      const slashAfterProtocol = base.indexOf('://') + 3;
      const slashIndex = base.indexOf('/', slashAfterProtocol);
      if (slashIndex === -1 || slashIndex === base.length - 1) {
        const cleanBase = base.replace(/\/+$/, '');
        return `${cleanBase}/shortly${query}`;
      }
    } catch {}
  }
  return trimmed;
}

/**
 * Mask sensitive credentials in MongoDB URI for safe logging and diagnostics.
 */
export function maskMongoUri(uri) {
  if (!uri || uri === 'PASTE_YOUR_MONGODB_CONNECTION_STRING_HERE') return 'NOT_CONFIGURED';
  try {
    const atIndex = uri.lastIndexOf('@');
    if (atIndex === -1) return 'mongodb://******';
    const protoEnd = uri.indexOf('://') + 3;
    const creds = uri.slice(protoEnd, atIndex);
    const colonIdx = creds.indexOf(':');
    if (colonIdx === -1) return `${uri.slice(0, protoEnd)}******${uri.slice(atIndex)}`;
    const username = creds.slice(0, colonIdx);
    return `${uri.slice(0, protoEnd)}${username}:******${uri.slice(atIndex)}`;
  } catch {
    return 'mongodb+srv://******';
  }
}

const rawMongoUri = process.env.MONGODB_URI || '';
const mongodbUri = normalizeMongoUri(rawMongoUri);

export const config = {
  env,
  isProd,
  isDev,
  isTest,
  port,
  host,
  publicUrl,
  frontendUrl,
  allowedOrigins,
  mongodbUri,
  dataDir: process.env.DATA_DIR || defaultDataDir,

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  redirectRateLimitMax: parseInt(process.env.REDIRECT_RATE_LIMIT_MAX || '300', 10),

  // Allow localhost / private loopback destination URLs only in development to prevent SSRF in production
  allowLocalhostDestinations: process.env.ALLOW_LOCAL_URLS === 'true' || isDev,

  // Short code length
  shortCodeLength: parseInt(process.env.SHORT_CODE_LENGTH || '7', 10),

  // Authentication & Security
  jwtSecret: process.env.JWT_SECRET || 'shortly-access-secret-default-change-in-production-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'shortly-refresh-secret-default-change-in-production-2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'shortly-cookie-signing-secret-default-2026',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || (isProd && process.env.COOKIE_SECURE !== 'false'),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10)
};

// Private / loopback IPv4 patterns
const PRIVATE_IP_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/
];

/**
 * Detect configuration warnings for development, VS Code port forwarding, and mobile access.
 */
export function getConfigWarnings() {
  const warnings = [];

  // Check if PUBLIC_URL is pointing to frontend port (5173) instead of backend port (5000)
  if (config.publicUrl.includes(':5173') || config.publicUrl.includes('-5173.')) {
    warnings.push(
      `PUBLIC_URL is pointing to port 5173 (the frontend port)! Short URLs must point to port 5000 (the backend forwarded URL).`
    );
  }

  // Check if FRONTEND_URL is pointing to backend port (5000)
  if (config.frontendUrl.includes(':5000') || config.frontendUrl.includes('-5000.')) {
    warnings.push(
      `FRONTEND_URL is pointing to port 5000 (the backend port)! FRONTEND_URL should point to port 5173 (the frontend port).`
    );
  }

  // Check if PUBLIC_URL is using localhost in development
  if (config.isDev && (config.publicUrl.includes('localhost') || config.publicUrl.includes('127.0.0.1'))) {
    warnings.push(
      `PUBLIC_URL is using localhost. Short links and QR codes will NOT open on your mobile phone. For VS Code port forwarding, set PUBLIC_URL to your port 5000 forwarded URL.`
    );
  }

  return warnings;
}

/**
 * Validate configuration on startup.
 * Enforces production security standards (HTTPS, no localhost, valid ports).
 */
export function validateConfig() {
  if (isNaN(config.port) || config.port <= 0 || config.port > 65535) {
    throw new Error(`Invalid PORT configuration: "${process.env.PORT}". Must be between 1 and 65535.`);
  }

  if (!config.publicUrl) {
    throw new Error(
      'Missing required configuration: PUBLIC_URL must be specified (e.g. "https://sho.rt" in production or "https://<id>-5000.app.github.dev" for VS Code port forwarding).'
    );
  }

  let parsedPublic;
  try {
    parsedPublic = new URL(config.publicUrl);
  } catch {
    throw new Error(`Invalid PUBLIC_URL configuration: "${config.publicUrl}". Must be a valid URL format.`);
  }

  if (config.isProd) {
    // 1. Production requires HTTPS
    if (parsedPublic.protocol !== 'https:') {
      throw new Error(
        `[SECURITY ERROR] In production, PUBLIC_URL must use HTTPS protocol (received: "${config.publicUrl}").`
      );
    }

    // 2. Production forbids localhost or private network IP addresses
    const hostname = parsedPublic.hostname.toLowerCase();
    const isPrivate =
      hostname === 'localhost' ||
      hostname === '::1' ||
      PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));

    if (isPrivate) {
      throw new Error(
        `[SECURITY ERROR] In production, PUBLIC_URL cannot be localhost or a private LAN IP (received: "${config.publicUrl}"). A real public domain is required.`
      );
    }
  } else {
    // Development checks & warnings
    const warnings = getConfigWarnings();
    for (const w of warnings) {
      console.warn(`⚠️ [CONFIG WARNING] ${w}`);
    }

    if (!config.publicUrl.includes('localhost') && !config.publicUrl.includes('127.0.0.1')) {
      console.log(`🌐 [CONFIG] PUBLIC_URL successfully configured for external access: "${config.publicUrl}"`);
    }
  }
}
