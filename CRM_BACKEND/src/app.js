import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import routes from './routes/index.js';
import publicRoutes from './modules/public/public.routes.js';
import loggerMiddleware from './middlewares/logger.middleware.js';
import { globalRateLimiter } from './middlewares/rateLimit.middleware.js';
import {
  notFoundHandler,
  errorHandler,
} from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'templates'));

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: config.urls.client,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(loggerMiddleware);
  app.use(globalRateLimiter);

  // Staff / JSON API
  app.use('/api', routes);

  // Customer HTML confirm pages (email links → API_URL/public/confirm/:id)
  app.use('/public', publicRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
