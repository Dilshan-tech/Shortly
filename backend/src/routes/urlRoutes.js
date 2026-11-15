import { Router } from 'express';
import { urlController } from '../controllers/urlController.js';
import { analyticsController } from '../controllers/analyticsController.js';
import { validateBody, createUrlSchema, updateUrlSchema } from '../middleware/validator.js';
import { createUrlLimiter, passwordLimiter } from '../middleware/rateLimiter.js';
import { optionalAuthenticate, protectCsrf } from '../middleware/auth.js';

const router = Router();

// Automatically attach user identity if authenticated
router.use(optionalAuthenticate);

// Bulk operations (protected against CSRF)
router.post('/bulk-delete', protectCsrf, urlController.bulkDelete);
router.post('/bulk-status', protectCsrf, urlController.bulkStatus);

// Password verification
router.post('/:code/verify', passwordLimiter, urlController.verifyPassword);

// Link analytics & CSV export
router.get('/:id/analytics', analyticsController.urlAnalytics);
router.get('/:id/export', (req, res, next) => {
  req.query.urlId = req.params.id;
  analyticsController.exportCsv(req, res, next);
});

// Inspect link by code
router.get('/code/:code', urlController.getByCode);

// Standard CRUD
router.get('/', urlController.list);
router.post('/', createUrlLimiter, protectCsrf, validateBody(createUrlSchema), urlController.create);
router.get('/:id', urlController.getOne);
router.patch('/:id', protectCsrf, validateBody(updateUrlSchema), urlController.update);
router.delete('/:id', protectCsrf, urlController.remove);

export default router;
