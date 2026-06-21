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
redis.on('error', () => { redisAvailable = false; }); // handled in app.ts startup catch

export const setCache = async (key: string, value: unknown, ttl = 300): Promise<void> => {
  try { await redis.setex(key, ttl, JSON.stringify(value)); } catch { /* Redis offline */ }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export const deleteCache = async (key: string): Promise<void> => {
  try { await redis.del(key); } catch { /* Redis offline */ }
};

export const deleteCachePattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch { /* Redis offline */ }
};
