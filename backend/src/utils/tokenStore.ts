import { redis } from './redis';
import { RefreshToken } from '../models/RefreshToken.model';

const REFRESH_TTL_SEC = 7 * 24 * 3600; // 7 days

// In-memory store for short-lived 2FA setup secrets (5 min, no persistence needed)
const twoFASecrets = new Map<string, { secret: string; exp: number }>();

let redisOk = true;
redis.on('error', () => { redisOk = false; });
redis.on('connect', () => { redisOk = true; });
redis.on('ready', () => { redisOk = true; });

// ── Refresh tokens ─────────────────────────────────────────────────────────────

export const storeRefreshToken = async (userId: string, token: string): Promise<void> => {
  if (redisOk) {
    try { await redis.setex(`refresh:${userId}`, REFRESH_TTL_SEC, token); return; }
    catch { redisOk = false; }
  }
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEC * 1000);
  await RefreshToken.findOneAndUpdate({ userId }, { token, expiresAt }, { upsert: true });
};

export const getRefreshToken = async (userId: string): Promise<string | null> => {
  if (redisOk) {
    try { return await redis.get(`refresh:${userId}`); }
    catch { redisOk = false; }
  }
  const doc = await RefreshToken.findOne({ userId, expiresAt: { $gt: new Date() } });
  return doc?.token ?? null;
};

export const deleteRefreshToken = async (userId: string): Promise<void> => {
  if (redisOk) {
    try { await redis.del(`refresh:${userId}`); }
    catch { redisOk = false; }
  }
  await RefreshToken.deleteMany({ userId });
};

// ── 2FA setup secrets (in-memory, 5 min) ──────────────────────────────────────

export const store2FASetup = async (userId: string, secret: string): Promise<void> => {
  if (redisOk) {
    try { await redis.setex(`2fa_setup:${userId}`, 300, secret); return; }
    catch { redisOk = false; }
  }
  twoFASecrets.set(userId, { secret, exp: Date.now() + 5 * 60 * 1000 });
};

export const get2FASetup = async (userId: string): Promise<string | null> => {
  if (redisOk) {
    try { return await redis.get(`2fa_setup:${userId}`); }
    catch { redisOk = false; }
  }
  const entry = twoFASecrets.get(userId);
  if (!entry || Date.now() > entry.exp) { twoFASecrets.delete(userId); return null; }
  return entry.secret;
};

export const delete2FASetup = async (userId: string): Promise<void> => {
  if (redisOk) {
    try { await redis.del(`2fa_setup:${userId}`); }
    catch { redisOk = false; }
  }
  twoFASecrets.delete(userId);
};
