import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

// General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

// URL Creation Limiter (prevent link spam)
export const createUrlLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 new links per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Link creation rate limit reached. Please wait a moment.'
  }
});

// Strict Password Verification Limiter (prevent brute force)
export const passwordLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 password attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many password attempts. Please wait a minute before trying again.'
  }
});

// Short Link Redirect Limiter (high throughput)
export const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.redirectRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Redirect rate limit exceeded. Please wait a few seconds.'
  }
});
