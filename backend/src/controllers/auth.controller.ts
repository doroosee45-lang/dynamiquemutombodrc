import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../models/User.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone, province, district } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Cet email est déjà utilisé' });

    const verifyToken = uuidv4();
    const user = await User.create({ email, password, fullName, phone, province, district, emailVerifyToken: verifyToken });

    await sendVerificationEmail(email, verifyToken);

    res.status(201).json({ message: 'Compte créé. Vérifiez votre email pour activer votre compte.', userId: user._id });
  } catch (err) {
    logger.error('Register error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ emailVerifyToken: String(token) }).select('+emailVerifyToken');
    if (!user) return res.status(400).json({ message: 'Token invalide ou expiré' });

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    await user.save();

    res.json({ message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, totpCode } = req.body;

    const user = await User.findOne({ email }).select('+password +twoFASecret');
    if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    if (user.isBanned) return res.status(403).json({ message: `Compte suspendu: ${user.banReason}` });
    if (!user.isEmailVerified) return res.status(403).json({ message: 'Veuillez vérifier votre email avant de vous connecter' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Email ou mot de passe incorrect' });

    if (user.twoFAEnabled) {
      if (!totpCode) return res.status(200).json({ requiresTwoFA: true });
      const ok = authenticator.verify({ token: totpCode, secret: user.twoFASecret! });
      if (!ok) return res.status(401).json({ message: 'Code 2FA invalide' });
    }

    const payload = { userId: user._id.toString(), role: user.role, province: user.province, district: user.district as string | undefined };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await redis.setex(`refresh:${user._id}`, 7 * 24 * 3600, refreshToken).catch(() => null);

    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    const safeUser = user.toObject() as unknown as Record<string, unknown>;
    delete safeUser.password;
    delete safeUser.twoFASecret;

    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ message: 'Refresh token manquant' });

    const payload = verifyRefreshToken(token);
    const stored = await redis.get(`refresh:${payload.userId}`).catch(() => null);
    if (stored && stored !== token) return res.status(401).json({ message: 'Refresh token invalide' });

    const accessToken = signAccessToken({ userId: payload.userId, role: payload.role, province: payload.province });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Refresh token invalide ou expiré' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) await redis.del(`refresh:${req.user.userId}`).catch(() => null);
    res.json({ message: 'Déconnexion réussie' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId).select('-password -twoFASecret -emailVerifyToken -passwordResetToken');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone, province, district, bio } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

    const update: Record<string, unknown> = { fullName, phone, province, district, bio };
    if (avatar) update.avatar = avatar;

    const user = await User.findByIdAndUpdate(req.user!.userId, update, { new: true, select: '-password -twoFASecret' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'Si cet email existe, un lien de réinitialisation sera envoyé.' });

    const token = uuidv4();
    user.passwordResetToken = token;
    user.passwordResetExpiry = new Date(Date.now() + 3_600_000);
    await user.save();

    await sendPasswordResetEmail(email, token);
    res.json({ message: 'Email de réinitialisation envoyé.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpiry');

    if (!user) return res.status(400).json({ message: 'Token invalide ou expiré' });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const setup2FA = async (req: AuthRequest, res: Response) => {
  try {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user!.userId, 'Dynamique RDC', secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    await redis.setex(`2fa_setup:${req.user!.userId}`, 300, secret).catch(() => null);
    res.json({ secret, qrCode });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const verify2FA = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const secret = await redis.get(`2fa_setup:${req.user!.userId}`).catch(() => null);
    if (!secret) return res.status(400).json({ message: 'Session 2FA expirée. Recommencez.' });

    const valid = authenticator.verify({ token: code, secret });
    if (!valid) return res.status(400).json({ message: 'Code invalide' });

    await User.findByIdAndUpdate(req.user!.userId, { twoFAEnabled: true, twoFASecret: secret });
    await redis.del(`2fa_setup:${req.user!.userId}`).catch(() => null);
    res.json({ message: '2FA activé avec succès.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user!.userId, { twoFAEnabled: false, twoFASecret: undefined });
    res.json({ message: '2FA désactivé.' });
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
