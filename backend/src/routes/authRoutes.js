import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate, protectCsrf } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  validateBody,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updateEmailSchema,
  changePasswordSchema,
  deleteAccountSchema
} from '../middleware/validator.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected Session & Profile Endpoints
router.get('/me', authenticate, authController.me);
router.get('/profile', authenticate, authController.me);
router.post('/logout-all', authenticate, authController.logoutAll);
router.patch('/profile', authenticate, protectCsrf, validateBody(updateProfileSchema), authController.updateProfile);
router.patch('/email', authenticate, protectCsrf, validateBody(updateEmailSchema), authController.updateEmail);
router.post('/change-password', authenticate, protectCsrf, validateBody(changePasswordSchema), authController.changePassword);
router.post('/password', authenticate, protectCsrf, validateBody(changePasswordSchema), authController.changePassword);
router.delete('/account', authenticate, protectCsrf, validateBody(deleteAccountSchema), authController.deleteAccount);
router.delete('/', authenticate, protectCsrf, validateBody(deleteAccountSchema), authController.deleteAccount);

export default router;
