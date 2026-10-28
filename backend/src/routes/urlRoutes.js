import { Router } from 'express';
import { urlController } from '../controllers/urlController.js';
import { analyticsController } from '../controllers/analyticsController.js';
import { validateBody, createUrlSchema, updateUrlSchema } from '../middleware/validator.js';
import { createUrlLimiter, passwordLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Bulk operations
router.post('/bulk-delete', urlController.bulkDelete);
router.post('/bulk-status', urlController.bulkStatus);

// Password verification
router.post('/:code/verify', passwordLimiter, urlController.verifyPassword);

// Link analytics
router.get('/:id/analytics', analyticsController.urlAnalytics);

// Inspect link by code
router.get('/code/:code', urlController.getByCode);

// Standard CRUD
router.get('/', urlController.list);
router.post('/', createUrlLimiter, validateBody(createUrlSchema), urlController.create);
router.get('/:id', urlController.getOne);
router.patch('/:id', validateBody(updateUrlSchema), urlController.update);
router.delete('/:id', urlController.remove);

export default router;
