import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedis } from '../config/redis.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let globalRateLimiter = passThrough;
let authRateLimiter = passThrough;
let publicRateLimiter = passThrough;

function passThrough(_req, _res, next) {
  next();
}

function buildLimiter(max, store, message) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: { success: false, message },
  });
}

/**
 * Call after Redis connect attempt. Falls back to in-memory store.
 */
export function initRateLimiters({ useRedis = false } = {}) {
  let globalStore;
  let authStore;
  let publicStore;

  if (useRedis) {
    try {
      const client = getRedis();
      const make = (prefix) =>
        new RedisStore({
          sendCommand: (...args) => client.call(...args),
          prefix: `rl:${prefix}:`,
        });
      globalStore = make('global');
      authStore = make('auth');
      publicStore = make('public');
      logger.info('Rate limiters using Redis store');
    } catch (err) {
      logger.warn('Redis rate-limit store failed, using memory', {
        message: err.message,
      });
    }
  } else {
    logger.info('Rate limiters using in-memory store');
  }

  globalRateLimiter = buildLimiter(
    config.rateLimit.max,
    globalStore,
    'Too many requests, please try again later'
  );
  authRateLimiter = buildLimiter(
    config.rateLimit.authMax,
    authStore,
    'Too many auth attempts, please try again later'
  );
  publicRateLimiter = buildLimiter(
    config.rateLimit.publicMax,
    publicStore,
    'Too many requests, please try again later'
  );
}

export function getGlobalRateLimiter(req, res, next) {
  return globalRateLimiter(req, res, next);
}

export function getAuthRateLimiter(req, res, next) {
  return authRateLimiter(req, res, next);
}

export function getPublicRateLimiter(req, res, next) {
  return publicRateLimiter(req, res, next);
}

// Back-compat named exports used by routes (wrappers)
export { getGlobalRateLimiter as globalRateLimiter };
export { getAuthRateLimiter as authRateLimiter };
export { getPublicRateLimiter as publicRateLimiter };
