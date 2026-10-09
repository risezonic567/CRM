import http from 'http';
import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis, isRedisEnabled } from './config/redis.js';
import { initRateLimiters } from './middlewares/rateLimit.middleware.js';
import { createApp } from './app.js';
import { initSocket } from './socket/socket.js';
import { migrateAuthorizedStatus } from './scripts/migrateAuthorizedStatus.js';
import { verifyMail } from './integrations/nodemailer/nodemailer.client.js';
import logger from './utils/logger.js';

async function bootstrap() {
  await connectDatabase();
  await migrateAuthorizedStatus();

  let useRedis = false;
  if (isRedisEnabled()) {
    try {
      await connectRedis();
      useRedis = true;
    } catch (err) {
      logger.warn('Redis connect failed — using in-memory rate limits', {
        message: err.message,
      });
    }
  } else {
    logger.info('Redis disabled — in-memory rate limits active');
  }

  initRateLimiters({ useRedis });

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    logger.info(`CRM Backend listening on port ${config.port}`, {
      env: config.env,
      api: config.urls.api,
      client: config.urls.client,
    });
    verifyMail();
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { message: err.message, stack: err.stack });
  process.exit(1);
});
