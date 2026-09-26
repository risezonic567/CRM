import { AppError, fail } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

export function notFoundHandler(req, res) {
  return fail(res, { status: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return fail(res, {
      status: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err.name === 'ValidationError') {
    return fail(res, { status: 422, message: err.message });
  }

  if (err.code === 11000) {
    return fail(res, { status: 409, message: 'Duplicate key error' });
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  return fail(res, {
    status: 500,
    message: config.env === 'development' ? err.message : 'Internal server error',
  });
}

export default errorHandler;
