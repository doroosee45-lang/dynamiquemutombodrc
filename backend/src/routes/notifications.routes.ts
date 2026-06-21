import { Router } from 'express';
import * as ctrl from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, ctrl.getNotifications);
router.put('/read', authenticate, ctrl.markAsRead);
router.delete('/:id', authenticate, ctrl.deleteNotification);

export default router;
