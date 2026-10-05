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

/** Cap concurrent browser/device sessions per user (oldest dropped via $slice). */
const MAX_REFRESH_SESSIONS = 10;

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

function cookieResult(user, accessToken, refreshToken) {
  return {
    user: user.toSafeJSON(),
    accessToken,
    refreshToken,
    cookieOptions: getRefreshCookieOptions(),
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +refreshTokenHash +refreshTokenHashes +refreshSessions'
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
  const newHash = hashToken(refreshToken);
  const newSession = { current: newHash, previous: null };

  const sessions = Array.isArray(user.refreshSessions)
    ? user.refreshSessions.map((s) => ({
        current: s.current,
        previous: s.previous || null,
      }))
    : [];

  // One-time migrate older formats into refreshSessions before adding this login
  if (sessions.length === 0) {
    const hashes = Array.isArray(user.refreshTokenHashes)
      ? user.refreshTokenHashes.filter(Boolean)
      : [];
    for (const h of hashes) {
      sessions.push({ current: h, previous: null });
    }
    if (user.refreshTokenHash) {
      sessions.push({ current: user.refreshTokenHash, previous: null });
    }
  }

  sessions.push(newSession);
  while (sessions.length > MAX_REFRESH_SESSIONS) sessions.shift();

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        refreshSessions: sessions,
        lastLogin: new Date(),
        refreshTokenHashes: [],
      },
      $unset: { refreshTokenHash: 1 },
    }
  );

  return cookieResult(user, accessToken, refreshToken);
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

  const incomingHash = hashToken(refreshToken);
  const userId = decoded.sub;

  const user = await User.findById(userId).select(
    '+refreshTokenHash +refreshTokenHashes +refreshSessions'
  );
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);

  // --- Path 1: match active current → rotate (keep previous for grace) ---
  const newRefreshToken = signRefreshToken(payload);
  const newHash = hashToken(newRefreshToken);

  let updated = await User.findOneAndUpdate(
    {
      _id: userId,
      isActive: true,
      'refreshSessions.current': incomingHash,
    },
    {
      $set: {
        'refreshSessions.$.previous': incomingHash,
        'refreshSessions.$.current': newHash,
      },
    },
    { new: true }
  );

  if (updated) {
    return cookieResult(user, accessToken, newRefreshToken);
  }

  // --- Path 2: concurrent refresh lost the race — previous still valid ---
  // Return a fresh access token but KEEP the same refresh cookie (no second rotate).
  const grace = await User.findOne({
    _id: userId,
    isActive: true,
    'refreshSessions.previous': incomingHash,
  }).select('_id');

  if (grace) {
    return cookieResult(user, accessToken, refreshToken);
  }

  // --- Path 3: migrate from refreshTokenHashes[] ---
  updated = await User.findOneAndUpdate(
    {
      _id: userId,
      isActive: true,
      refreshTokenHashes: incomingHash,
    },
    {
      $pull: { refreshTokenHashes: incomingHash },
      $push: {
        refreshSessions: {
          $each: [{ current: newHash, previous: incomingHash }],
          $slice: -MAX_REFRESH_SESSIONS,
        },
      },
      $unset: { refreshTokenHash: 1 },
    },
    { new: true }
  );

  if (updated) {
    return cookieResult(user, accessToken, newRefreshToken);
  }

  // --- Path 4: legacy single refreshTokenHash ---
  updated = await User.findOneAndUpdate(
    {
      _id: userId,
      isActive: true,
      refreshTokenHash: incomingHash,
    },
    {
      $set: {
        refreshSessions: [{ current: newHash, previous: incomingHash }],
        refreshTokenHashes: [],
      },
      $unset: { refreshTokenHash: 1 },
    },
    { new: true }
  );

  if (updated) {
    return cookieResult(user, accessToken, newRefreshToken);
  }

  throw new AppError('Refresh token revoked', 401);
}

/**
 * Revoke only the current browser session (cookie refresh token).
 */
export async function logout(userId, refreshToken) {
  if (!refreshToken || !userId) return;

  const incomingHash = hashToken(refreshToken);

  await User.updateOne(
    { _id: userId },
    {
      $pull: {
        refreshSessions: { current: incomingHash },
      },
    }
  );
  await User.updateOne(
    { _id: userId },
    {
      $pull: {
        refreshSessions: { previous: incomingHash },
      },
    }
  );
  await User.updateOne(
    { _id: userId },
    { $pull: { refreshTokenHashes: incomingHash } }
  );
  await User.updateOne(
    { _id: userId, refreshTokenHash: incomingHash },
    { $unset: { refreshTokenHash: 1 } }
  );
}

export async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user.toSafeJSON();
}
