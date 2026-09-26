import { verifyAccessToken } from '../utils/signPublicToken.js';
import { User } from '../models/index.js';
import { fail } from '../utils/apiResponse.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return fail(res, { status: 401, message: 'Authentication required' });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return fail(res, { status: 401, message: 'Invalid or expired access token' });
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return fail(res, { status: 401, message: 'User not found or inactive' });
    }

    req.user = user;
    req.tokenPayload = decoded;
    return next();
  } catch (err) {
    return next(err);
  }
}

export default authenticate;
