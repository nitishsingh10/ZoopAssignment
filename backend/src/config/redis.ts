import 'dotenv/config';
import Redis, { type RedisOptions } from 'ioredis';

const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  lazyConnect: true,
  retryStrategy: (times: number): number | null => {
    if (times > 3) {
      console.warn('Redis connection failed after 3 retries. Proceeding without cache.');
      return null;
    }
    return Math.min(times * 200, 2000);
  },
};

if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(redisConfig);

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err: Error) => console.warn('⚠️  Redis error:', err.message));

/** Cache TTL in seconds (default: 5 minutes) */
export const CACHE_TTL = parseInt(process.env.CACHE_TTL ?? '300');

/**
 * Cache key strategy:
 *  agents:all                                  → full unfiltered list
 *  agents:list:{status}:{area}:{page}:{limit}  → filtered/paginated list
 *  agents:{id}                                 → single agent by UUID
 *  agents:stats                                → aggregate dashboard stats
 */
export const CACHE_KEYS = {
  ALL_AGENTS: 'agents:all' as const,
  AGENT: (id: string): string => `agents:${id}`,
  LIST: (
    status: string,
    area: string,
    page: number | string,
    limit: number | string
  ): string => `agents:list:${status || 'all'}:${area || 'all'}:${page}:${limit}`,
};

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch (err) {
    console.warn('Cache get error:', (err as Error).message);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttl: number = CACHE_TTL): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn('Cache set error:', (err as Error).message);
  }
}

export async function deleteCache(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    console.warn('Cache delete error:', (err as Error).message);
  }
}

export async function deleteCacheByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    console.warn('Cache pattern delete error:', (err as Error).message);
  }
}

export default redis;
