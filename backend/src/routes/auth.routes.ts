import { Router } from 'express';
import { body, query } from 'express-validator';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*\d)/),
  body('fullName').trim().isLength({ min: 2 }),
], ctrl.register);

router.get('/verify-email', [query('token').notEmpty()], ctrl.verifyEmail);

router.post('/login', authLimiter, [
  body('email').isEmail(),
  body('password').notEmpty(),
], ctrl.login);

router.post('/refresh', ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.getMe);
router.put('/profile', authenticate, upload.single('avatar'), ctrl.updateProfile);

router.post('/forgot-password', authLimiter, [body('email').isEmail()], ctrl.forgotPassword);
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
], ctrl.resetPassword);

router.post('/2fa/setup', authenticate, ctrl.setup2FA);
router.post('/2fa/verify', authenticate, [body('code').isLength({ min: 6, max: 6 })], ctrl.verify2FA);
router.post('/2fa/disable', authenticate, ctrl.disable2FA);

export default router;
