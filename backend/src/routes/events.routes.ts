import { Router } from 'express';
import * as ctrl from '../controllers/events.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/',    ctrl.getEvents);
router.get('/:id', ctrl.getEvent);

router.post('/',      authenticate, authorize('EDITOR', 'ADMIN', 'SUPERADMIN'), ctrl.createEvent);
router.patch('/:id',  authenticate, authorize('EDITOR', 'ADMIN', 'SUPERADMIN'), ctrl.updateEvent);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'),           ctrl.deleteEvent);

export default router;
