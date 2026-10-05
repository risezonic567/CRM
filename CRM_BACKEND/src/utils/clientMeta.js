import { UAParser } from 'ua-parser-js';

/**
 * Normalize client IP for storage/display.
 * - strips IPv4-mapped IPv6 (:ffff:x.x.x.x)
 * - maps loopback ::1 → 127.0.0.1
 */
export function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return '';
  let value = ip.trim();
  if (!value) return '';

  if (value.startsWith('::ffff:')) {
    value = value.slice(7);
  }
  if (value === '::1') {
    return '127.0.0.1';
  }
  return value;
}

/**
 * Resolve best-effort client IP from an Express request.
 * Does not change request handling — read-only header inspection.
 */
export function resolveClientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) {
    return normalizeIp(String(cf).split(',')[0].trim());
  }

  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    return normalizeIp(String(xff).split(',')[0].trim());
  }

  return normalizeIp(req.ip || req.socket?.remoteAddress || '');
}

/**
 * Parse User-Agent into friendly fields. Raw UA is never modified here.
 * @returns {{ browser: string, os: string, deviceType: string }}
 */
export function parseClientMeta(userAgent) {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  if (!ua.trim()) {
    return { browser: '', os: '', deviceType: 'unknown' };
  }

  const result = new UAParser(ua).getResult();
  const browserName = result.browser?.name || '';
  const browserVer = result.browser?.major || result.browser?.version || '';
  const browser = [browserName, browserVer].filter(Boolean).join(' ').trim();

  const osName = result.os?.name || '';
  const osVer = result.os?.version || '';
  const os = [osName, osVer].filter(Boolean).join(' ').trim();

  const type = (result.device?.type || '').toLowerCase();
  let deviceType = 'desktop';
  if (type === 'mobile') deviceType = 'mobile';
  else if (type === 'tablet') deviceType = 'tablet';
  else if (!browserName && !osName) deviceType = 'unknown';

  return { browser, os, deviceType };
}
