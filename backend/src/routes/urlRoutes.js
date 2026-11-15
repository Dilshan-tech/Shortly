import { Router } from 'express';
import { urlController } from '../controllers/urlController.js';
import { analyticsController } from '../controllers/analyticsController.js';
import { validateBody, createUrlSchema, updateUrlSchema } from '../middleware/validator.js';
import { createUrlLimiter, passwordLimiter } from '../middleware/rateLimiter.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

// Automatically attach user identity if authenticated
router.use(optionalAuthenticate);

// Bulk operations
router.post('/bulk-delete', urlController.bulkDelete);
router.post('/bulk-status', urlController.bulkStatus);

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
router.post('/', createUrlLimiter, validateBody(createUrlSchema), urlController.create);
router.get('/:id', urlController.getOne);
router.patch('/:id', validateBody(updateUrlSchema), urlController.update);
router.delete('/:id', urlController.remove);

export default router;
