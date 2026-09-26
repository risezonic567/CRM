import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/** Customer public confirm link token */
export function signPublicToken(payload) {
  return jwt.sign(payload, config.publicToken.secret, {
    expiresIn: config.publicToken.expiresIn,
  });
}

export function verifyPublicToken(token) {
  return jwt.verify(token, config.publicToken.secret);
}

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/auth',
    maxAge: parseDurationMs(config.jwt.refreshExpiresIn),
  };
}

function parseDurationMs(value) {
  if (typeof value === 'number') return value;
  const match = String(value).match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * map[unit];
}
