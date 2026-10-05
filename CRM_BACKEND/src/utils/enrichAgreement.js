import { normalizeIp, parseClientMeta } from './clientMeta.js';

/**
 * Read-time enrichment for agreement (API display only — does not write DB).
 * Fills friendly client fields from raw UA when older records lack them.
 */
export function enrichAgreement(agreement) {
  if (!agreement || typeof agreement !== 'object') {
    return agreement;
  }

  const base =
    typeof agreement.toObject === 'function'
      ? agreement.toObject()
      : { ...agreement };

  const agreedIp = normalizeIp(base.agreedIp) || base.agreedIp || '';

  let browser = (base.browser || '').trim();
  let os = (base.os || '').trim();
  let deviceType = (base.deviceType || '').trim();

  if (base.agreedUserAgent) {
    const parsed = parseClientMeta(base.agreedUserAgent);
    if (!browser) browser = parsed.browser;
    if (!os) os = parsed.os;
    if (!deviceType || deviceType === 'unknown') {
      deviceType = parsed.deviceType;
    }
  }

  const deviceLabel =
    deviceType && deviceType !== 'unknown'
      ? deviceType.charAt(0).toUpperCase() + deviceType.slice(1)
      : '';

  const summaryParts = [browser, os, deviceLabel].filter(Boolean);

  return {
    ...base,
    agreedIp,
    browser,
    os,
    deviceType,
    clientSummary: summaryParts.join(' · '),
  };
}
