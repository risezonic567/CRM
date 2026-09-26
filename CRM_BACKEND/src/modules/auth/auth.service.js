import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../../models/index.js';
import { AppError } from '../../utils/apiResponse.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
} from '../../utils/signPublicToken.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildTokenPayload(user) {
  return {
    sub: user._id.toString(),
    role: user.role,
    agencyId: user.agencyId.toString(),
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +refreshTokenHash'
  );

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError('Invalid email or password', 401);
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  return {
    user: user.toSafeJSON(),
    accessToken,
    refreshToken,
    cookieOptions: getRefreshCookieOptions(),
  };
}

export async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token missing', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  const incomingHash = hashToken(refreshToken);
  if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
    throw new AppError('Refresh token revoked', 401);
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save();

  return {
    user: user.toSafeJSON(),
    accessToken,
    refreshToken: newRefreshToken,
    cookieOptions: getRefreshCookieOptions(),
  };
}

export async function logout(userId) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user.toSafeJSON();
}
