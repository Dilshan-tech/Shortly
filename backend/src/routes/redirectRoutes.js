import { Router } from 'express';
import express from 'express';
import { redirectController } from '../controllers/redirectController.js';
import { redirectLimiter, passwordLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Handle HTML form unlock POST for password protected links
router.post(
  '/:code/unlock',
  express.urlencoded({ extended: false }),
  passwordLimiter,
  redirectController.handleUnlock
);

// Short URL redirection
router.get('/:code', redirectLimiter, redirectController.handleRedirect);

export default router;
