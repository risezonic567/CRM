export function success(res, { status = 200, message = 'Success', data = null, meta = undefined } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

export function fail(res, { status = 400, message = 'Request failed', errors = undefined } = {}) {
  const body = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  return res.status(status).json(body);
}

export class AppError extends Error {
  constructor(message, statusCode = 400, errors = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}
