import { Router } from 'express';
import * as ctrl from '../controllers/innovations.controller';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', ctrl.getInnovations);
router.post('/', authenticate, upload.array('media', 3), ctrl.createInnovation);
router.post('/:id/vote', authenticate, ctrl.voteInnovation);
router.patch('/:id/validate', authenticate, authorize('ADMIN', 'SUPERADMIN'), ctrl.validateInnovation);

export default router;
