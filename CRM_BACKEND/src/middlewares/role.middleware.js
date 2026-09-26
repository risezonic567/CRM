import { fail } from '../utils/apiResponse.js';
import { ROLES } from '../config/constants.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, { status: 401, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, { status: 403, message: 'Insufficient permissions' });
    }
    return next();
  };
}

/** Viewers may only use read methods */
export function blockViewerWrites(req, res, next) {
  if (req.user?.role === ROLES.VIEWER && req.method !== 'GET' && req.method !== 'HEAD') {
    return fail(res, { status: 403, message: 'Viewers have read-only access' });
  }
  return next();
}

export default authorize;
