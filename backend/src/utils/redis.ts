import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redisAvailable = true;

export const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  // Stop retrying after 3 attempts; Redis is optional in dev
  retryStrategy: (times) => {
    if (times > 3) { redisAvailable = false; return null; }
    return Math.min(times * 200, 2000);
  },
  enableOfflineQueue: false,
});

redis.on('connect', () => { redisAvailable = true; logger.info('Redis connected'); });
redis.on('error', (err) => {
  if (redisAvailable) logger.warn('Redis unavailable — degraded mode (no refresh tokens/cache)', { code: (err as NodeJS.ErrnoException).code });
  redisAvailable = false;
});

export const setCache = async (key: string, value: unknown, ttl = 300) => {
  await redis.setex(key, ttl, JSON.stringify(value));
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const deleteCache = async (key: string) => {
  await redis.del(key);
};

export const deleteCachePattern = async (pattern: string) => {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
};
