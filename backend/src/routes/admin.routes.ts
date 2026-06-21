import { Router } from 'express';
import * as ctrl from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const adminAuth   = [authenticate, authorize('ADMIN', 'SUPERADMIN', 'MODERATOR', 'DISTRICT_ADMIN')];
const adminOnly   = [authenticate, authorize('ADMIN', 'SUPERADMIN')];
const superOnly   = [authenticate, authorize('SUPERADMIN')];
const districtMgr = [authenticate, authorize('ADMIN', 'SUPERADMIN')]; // who can manage district admins

// Provincial Admins (SUPERADMIN only)
router.get('/provincial-admins', ...superOnly, ctrl.getProvincialAdmins);
router.post('/provincial-admins', ...superOnly, ctrl.createProvincialAdmin);
router.patch('/provincial-admins/:id', ...superOnly, ctrl.updateProvincialAdmin);
router.delete('/provincial-admins/:id', ...superOnly, ctrl.deleteProvincialAdmin);
router.post('/provincial-admins/:id/reset-password', ...superOnly, ctrl.resetProvincialAdminPassword);

// District Admins (ADMIN manages their own province's districts, SUPERADMIN manages all)
router.get('/district-admins', ...districtMgr, ctrl.getDistrictAdmins);
router.post('/district-admins', ...districtMgr, ctrl.createDistrictAdmin);
router.patch('/district-admins/:id', ...districtMgr, ctrl.updateDistrictAdmin);
router.delete('/district-admins/:id', ...districtMgr, ctrl.deleteDistrictAdmin);
router.post('/district-admins/:id/reset-password', ...districtMgr, ctrl.resetDistrictAdminPassword);

router.get('/dashboard', ...adminAuth, ctrl.getDashboard);
router.get('/province/:province', ...adminAuth, ctrl.getProvinceDashboard);
router.get('/district/:district', ...adminAuth, ctrl.getDistrictDashboard);

// Members
router.get('/users/stats', ...superOnly, ctrl.getMemberStats);
router.get('/users', ...adminAuth, ctrl.listUsers);
router.post('/users', ...adminOnly, ctrl.createMember);
router.patch('/users/:id', ...adminOnly, ctrl.updateUser);

router.get('/comments/pending', ...adminAuth, ctrl.getPendingComments);
router.patch('/comments/:id/moderate', ...adminAuth, ctrl.moderateComment);

router.get('/reports/export', ...adminAuth, ctrl.exportReports);
router.post('/notifications/broadcast', ...adminOnly, ctrl.sendBroadcastNotification);

export default router;
