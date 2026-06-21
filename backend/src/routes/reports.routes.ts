import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/reports.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { reportLimiter } from '../middleware/rateLimiter';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', ctrl.getReports);
router.get('/map', ctrl.getMapData);
router.get('/heatmap', ctrl.getHeatmapData);
router.get('/stats', ctrl.getReportStats);
router.get('/:id', ctrl.getReport);

router.post('/', authenticate, reportLimiter, upload.array('media', 5), [
  body('title').trim().isLength({ min: 5, max: 200 }),
  body('description').trim().isLength({ min: 50 }),
  body('category').isIn(['INSECURITY','BANDITRY','TRANSPORT','CORRUPTION','TRIBALISM','ADMINISTRATIVE','OTHER']),
  body('province').notEmpty(),
], ctrl.createReport);

router.patch('/:id/status', authenticate, [
  body('status').isIn(['PENDING','VERIFIED','IN_PROGRESS','RESOLVED','REJECTED']),
], ctrl.updateReportStatus);

router.post('/:id/vote', authenticate, ctrl.voteReport);
router.post('/:id/comments', authenticate, [body('content').trim().isLength({ min: 2 })], ctrl.addComment);

export default router;
