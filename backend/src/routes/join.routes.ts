import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { submitJoinRequest, listJoinRequests, reviewJoinRequest } from '../controllers/join.controller';

const router = Router();

router.post('/',        submitJoinRequest);                                    // public
router.get('/',        authenticate, authorize('ADMIN', 'SUPERADMIN'), listJoinRequests);
router.patch('/:id',   authenticate, authorize('ADMIN', 'SUPERADMIN'), reviewJoinRequest);

export default router;
