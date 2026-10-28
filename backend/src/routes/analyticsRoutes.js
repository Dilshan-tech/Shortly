import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';

const router = Router();

router.get('/summary', analyticsController.summary);
router.get('/timeseries', analyticsController.timeseries);
router.get('/devices', analyticsController.devices);
router.get('/browsers', analyticsController.browsers);
router.get('/referrers', analyticsController.referrers);

export default router;
