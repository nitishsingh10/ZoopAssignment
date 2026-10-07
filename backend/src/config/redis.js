require('dotenv').config();
const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn('Redis connection failed after 3 retries. Proceeding without cache.');
      return null; // stop retrying
    }
    return Math.min(times * 200, 2000);
  },
};

if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(redisConfig);

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.warn('⚠️  Redis error:', err.message));

// Cache TTL in seconds (default: 5 minutes)
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300;

/**
 * Cache keys strategy:
 * - agents:all       → list of all agents
 * - agents:{id}      → individual agent by ID
 * - agents:area:{area} → agents by service area
 */
const CACHE_KEYS = {
  ALL_AGENTS: 'agents:all',
  AGENT: (id) => `agents:${id}`,
  AGENTS_BY_AREA: (area) => `agents:area:${area.toLowerCase()}`,
};

async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('Cache get error:', err.message);
    return null;
  }
}

async function setCache(key, value, ttl = CACHE_TTL) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn('Cache set error:', err.message);
  }
}

async function deleteCache(...keys) {
  try {
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn('Cache delete error:', err.message);
  }
}

async function deleteCacheByPattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn('Cache pattern delete error:', err.message);
  }
}

module.exports = {
  redis,
  CACHE_KEYS,
  CACHE_TTL,
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
};
