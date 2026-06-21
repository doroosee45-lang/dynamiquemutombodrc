import { Router } from 'express';
import * as ctrl from '../controllers/campaigns.controller';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', ctrl.getCampaigns);
router.get('/:id', ctrl.getCampaign);

router.post('/', authenticate, authorize('EDITOR', 'ADMIN', 'SUPERADMIN'),
  upload.array('media', 3), ctrl.createCampaign);

router.post('/:id/join', authenticate, ctrl.joinCampaign);
router.post('/petitions/:petitionId/sign', authenticate, ctrl.signPetition);

export default router;
