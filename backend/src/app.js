import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
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

  // Trust proxy for reverse proxies / tunneling (e.g. ngrok, Caddy, Cloudflare)
  app.set('trust proxy', 1);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible frontend and QR previews
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // Body parser with size limits
  app.use(express.json({ limit: '100kb' }));

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Shortly API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      publicUrl: config.publicUrl,
      environment: config.env
    });
  });

  // Apply API rate limiting
  app.use('/api/', apiLimiter);

  // API Routes
  app.use('/api/urls', urlRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Serve production frontend assets if built
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    // Client-side routes for SPA
    app.get(['/', '/create', '/links', '/settings', '/analytics/:id'], (req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // Root-level short-code redirect routes
  app.use('/', redirectRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export default createApp;
