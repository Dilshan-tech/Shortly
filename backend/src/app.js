import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config, getConfigWarnings } from './config/env.js';
import { getDatabaseStatus } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import urlRoutes from './routes/urlRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import redirectRoutes from './routes/redirectRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

export function createApp() {
  const app = express();

  // Hide Express server footprint
  app.disable('x-powered-by');

  // Trust proxy for reverse proxies / tunneling (e.g. ngrok, Caddy, Cloudflare)
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible frontend and QR previews
      crossOriginEmbedderPolicy: false
    })
  );

  // Configured origins from environment
  const configuredOrigins = [
    config.frontendUrl,
    ...config.allowedOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ].filter(Boolean);

  // Helper to validate development origins (localhost, private LAN IPs, and development tunnels)
  const isAllowedDevOrigin = (origin) => {
    try {
      const parsed = new URL(origin);
      const hostname = parsed.hostname.toLowerCase();

      // 1. Localhost and loopback
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return true;
      }

      // 2. Local Wi-Fi / LAN IP ranges
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
      ) {
        return true;
      }

      // 3. VS Code Port Forwarding & Dev Tunnels (devtunnels.ms, github.dev, ngrok)
      if (
        hostname.endsWith('.devtunnels.ms') ||
        hostname.endsWith('.app.github.dev') ||
        hostname.endsWith('.githubpreview.dev') ||
        hostname.endsWith('.ngrok-free.app') ||
        hostname.endsWith('.ngrok.io') ||
        hostname.endsWith('.loca.lt')
      ) {
        return true;
      }
    } catch {}
    return false;
  };

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, redirects, server-to-server)
        if (!origin) return callback(null, true);

        // Check explicitly configured origins
        if (configuredOrigins.includes(origin)) {
          return callback(null, true);
        }

        // In development mode, automatically accept localhost, local LAN IPs, and dev tunnels
        if (config.isDev && isAllowedDevOrigin(origin)) {
          return callback(null, true);
        }

        // In production mode, reject disallowed origins cleanly without 500 error
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // Body parser with size limits
  app.use(express.json({ limit: '100kb' }));

  // NoSQL Injection Sanitizer: recursively sanitize keys starting with $ or containing .
  app.use((req, res, next) => {
    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    };
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    next();
  });

  // Cookie parser for secure HttpOnly session tokens
  app.use(cookieParser(config.cookieSecret));

  // Health endpoint
  app.get('/api/health', (req, res) => {
    const isLocalhost = config.publicUrl.includes('localhost') || config.publicUrl.includes('127.0.0.1');
    const isFrontendPort = config.publicUrl.includes(':5173') || config.publicUrl.includes('-5173.');
    const warnings = getConfigWarnings();

    // Check if being accessed remotely while PUBLIC_URL is localhost
    const clientForwardedHost = req.get('x-forwarded-host');
    if (isLocalhost && clientForwardedHost && !warnings.some((w) => w.includes('remotely'))) {
      warnings.push(
        `Server accessed via forwarded host "${clientForwardedHost}", but PUBLIC_URL is localhost. Set PUBLIC_URL to your backend forwarded URL.`
      );
    }

    res.json({
      status: 'healthy',
      service: 'Shortly API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      publicUrl: config.publicUrl,
      frontendUrl: config.frontendUrl,
      environment: config.env,
      database: getDatabaseStatus(),
      isConfiguredForExternal: !isLocalhost && !isFrontendPort,
      configWarnings: warnings
    });
  });

  // Apply API rate limiting
  app.use('/api/', apiLimiter);

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/account', authRoutes);
  app.use('/api/urls', urlRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Serve production frontend assets if built
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    // Client-side routes for SPA
    app.get(['/', '/create', '/links', '/settings', '/account', '/login', '/register', '/analytics/:id'], (req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  } else {
    // In development without built frontend, handle root route gracefully
    app.get('/', (req, res) => {
      if (config.frontendUrl && req.accepts('html')) {
        return res.redirect(302, config.frontendUrl);
      }
      res.json({
        service: 'Shortly URL Shortener Backend API',
        status: 'healthy',
        frontendUrl: config.frontendUrl,
        publicUrl: config.publicUrl,
        health: `${config.publicUrl}/api/health`
      });
    });
  }

  // Root-level short-code redirect routes
  app.use('/', redirectRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export default createApp;
