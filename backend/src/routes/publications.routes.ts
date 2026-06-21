import { Router } from 'express';
import * as ctrl from '../controllers/publications.controller';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', ctrl.getPublications);
router.get('/:id', ctrl.getPublication);

router.post('/', authenticate, authorize('EDITOR', 'ADMIN', 'SUPERADMIN'),
  upload.array('media', 5), ctrl.createPublication);

router.put('/:id', authenticate, authorize('EDITOR', 'ADMIN', 'SUPERADMIN'), ctrl.updatePublication);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), ctrl.deletePublication);
router.post('/:id/comments', authenticate, ctrl.addComment);

export default router;
