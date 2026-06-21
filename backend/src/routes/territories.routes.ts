import { Router } from 'express';
import * as ctrl from '../controllers/territories.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const adminOnly = [authenticate, authorize('ADMIN', 'SUPERADMIN')];

router.get('/', ...adminOnly, ctrl.listTerritories);
router.get('/stats/:province', ...adminOnly, ctrl.getProvinceStats);
router.get('/stats', ...adminOnly, ctrl.getProvinceStats);
router.get('/:id/ancestors', ...adminOnly, ctrl.getAncestors);
router.post('/', ...adminOnly, ctrl.createTerritory);
router.patch('/:id', ...adminOnly, ctrl.updateTerritory);
router.delete('/:id', ...adminOnly, ctrl.deleteTerritory);

export default router;
