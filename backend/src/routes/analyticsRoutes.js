import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = Router();

// Attach user if authenticated
router.use(optionalAuthenticate);

router.get('/summary', analyticsController.summary);
router.get('/timeseries', analyticsController.timeseries);
router.get('/devices', analyticsController.devices);
router.get('/browsers', analyticsController.browsers);
router.get('/os', analyticsController.os);
router.get('/referrers', analyticsController.referrers);
router.get('/countries', analyticsController.countries);
router.get('/clicks', analyticsController.clicks);
router.get('/export', analyticsController.exportCsv);

export default router;
