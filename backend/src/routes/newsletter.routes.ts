import { Router } from 'express';
import * as ctrl from '../controllers/newsletter.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/subscribe',         ctrl.subscribe);
router.get('/unsubscribe/:token', ctrl.unsubscribe);
router.post('/contact',           ctrl.sendContact);
router.get('/subscribers', authenticate, authorize('ADMIN', 'SUPERADMIN'), ctrl.getSubscribers);

export default router;
