import Redis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisClient = null;
let redisReady = false;

export function isRedisEnabled() {
  return Boolean(config.redis.enabled && config.redis.url);
}

export function getRedis() {
  if (!isRedisEnabled()) {
    throw new Error('Redis is disabled');
  }
  if (redisClient) return redisClient;

  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('ready', () => {
    redisReady = true;
    logger.info('Redis ready');
  });
  redisClient.on('error', (err) => {
    redisReady = false;
    logger.error('Redis error', { message: err.message });
  });
  redisClient.on('end', () => {
    redisReady = false;
  });

  return redisClient;
}

export function isRedisReady() {
  return redisReady;
}

export async function connectRedis() {
  if (!isRedisEnabled()) {
    logger.info('Redis skipped (USE_REDIS=false or REDIS_URL empty)');
    return null;
  }

  const client = getRedis();
  if (client.status === 'wait' || client.status === 'end') {
    await client.connect();
  }
  return client;
}

export default getRedis;
