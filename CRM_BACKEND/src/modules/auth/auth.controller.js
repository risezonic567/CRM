import * as authService from './auth.service.js';
import { success } from '../../utils/apiResponse.js';
import config from '../../config/index.js';

const REFRESH_COOKIE = 'refreshToken';

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE, result.refreshToken, result.cookieOptions);
    return success(res, {
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: config.jwt.accessExpiresIn,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    const result = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE, result.refreshToken, result.cookieOptions);
    return success(res, {
      message: 'Token refreshed',
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: config.jwt.accessExpiresIn,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (req.user?._id) {
      await authService.logout(req.user._id, refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return success(res, { message: 'Logged out' });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user._id);
    return success(res, { data: { user } });
  } catch (err) {
    return next(err);
  }
}
