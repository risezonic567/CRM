/**
 * Authorization paragraph helpers.
 * - Plain text stored on Inquiry.authorizationText (English; agent CRM)
 * - PAX es/it paragraphs: src/i18n/authParagraphs.js via paxAuthorizationPlain
 * - HTML with underlined fills rendered at display time (email / confirm / receipt)
 * Customer-facing amount is ONE total only.
 */

import { renderAuthParagraph } from '../i18n/authParagraphs.js';
import {
  CUSTOMER_LOCALES,
  DEFAULT_CUSTOMER_LOCALE,
} from '../config/constants.js';

export const AUTH_FILL_STYLE =
  'border-bottom:1px solid #0f172a;font-weight:600;padding:0 2px;white-space:nowrap;';

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Normalize the dynamic slots used in the authorization sentence. */
export function resolveAuthFills({
  authorizerName = '',
  agencyName = 'Airline Ticket Booking',
  currency = 'USD',
  total = 0,
  purpose = '',
} = {}) {
  const name = String(authorizerName || '').trim() || '____________________';
  const agency = String(agencyName || '').trim() || 'Airline Ticket Booking';
  const curr = String(currency || 'USD').trim() || 'USD';
  const amount = Number.isFinite(Number(total))
    ? Number(total).toFixed(2)
    : '0.00';
  const amountLabel = `${curr} ${amount}`;
  const forWhat =
    String(purpose || '').trim() || 'the itinerary detailed above';

  return {
    authorizerName: name,
    agencyName: agency,
    currency: curr,
    amount,
    amountLabel,
    purpose: forWhat,
  };
}

/** Route purpose for auth text, e.g. "AKL–WLG flight booking". */
export function buildAuthPurpose(from, to) {
  const a = String(from || '').trim();
  const b = String(to || '').trim();
  if (a && b) return `${a}–${b} flight booking`;
  return '';
}

/** Re-export service purpose helper for callers that already import this module. */
export { servicePurposeLabel as buildAuthPurposeFromDisposition } from './serviceDispositions.js';

export function buildAuthorizationText(options = {}) {
  const f = resolveAuthFills(options);
  const raw = String(options.locale || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  const locale = CUSTOMER_LOCALES.includes(raw)
    ? raw
    : DEFAULT_CUSTOMER_LOCALE;
  return renderAuthParagraph(locale, f);
}

/**
 * Escape plain authorization text and underline known fill values.
 * Longest fills first so partial overlaps don't break markup.
 */
export function renderAuthorizationHtml(plainText, fills = {}) {
  let html = escapeHtml(plainText || '');
  if (!html) return '';

  const slots = [
    fills.amountLabel,
    fills.authorizerName,
    fills.agencyName,
    fills.purpose,
  ]
    .map((s) => String(s || '').trim())
    .filter((s) => s && s !== '____________________')
    .sort((a, b) => b.length - a.length);

  const seen = new Set();
  for (const slot of slots) {
    if (seen.has(slot)) continue;
    seen.add(slot);
    const escapedSlot = escapeHtml(slot);
    if (!escapedSlot || !html.includes(escapedSlot)) continue;
    const wrapped = `<span class="auth-fill" style="${AUTH_FILL_STYLE}">${escapedSlot}</span>`;
    html = html.split(escapedSlot).join(wrapped);
  }

  return html;
}

/**
 * After agent edits plain text, re-detect fill slots from the sentence so
 * underlines still work on email / confirm.
 * Supports current wording + legacy telephonic template.
 */
export function extractAuthFillsFromText(plainText, fallback = {}) {
  const text = String(plainText || '');
  const fb = resolveAuthFills(fallback);

  const nameMatch =
    text.match(/I,\s*(.+?),\s*hereby authorize/i) ||
    text.match(/I,\s*(.+?),\s*authorize/i);
  const agencyMatch = text.match(/authorize\s+(.+?)\s+to charge/i);
  const amountMatch =
    text.match(
      /for the amount of\s+([A-Z]{3}\s+\d+(?:\.\d{1,2})?)\s+in connection/i
    ) ||
    text.match(
      /to charge my above card for\s+([A-Z]{3}\s+\d+(?:\.\d{1,2})?)\s+as per/i
    );
  const purposeMatch =
    text.match(/specifically the\s+(.+?)\.\s*I acknowledge/i) ||
    text.match(/as per given details for\s+(.+?)\.\s*I understand/i);

  const authorizerName = nameMatch?.[1]?.trim() || fb.authorizerName;
  const agencyName = agencyMatch?.[1]?.trim() || fb.agencyName;
  const amountLabel = amountMatch?.[1]?.trim() || fb.amountLabel;
  const purpose = purposeMatch?.[1]?.trim() || fb.purpose;

  const amountParts = amountLabel.match(/^([A-Z]{3})\s+(.+)$/);
  return {
    authorizerName,
    agencyName,
    amountLabel,
    purpose,
    currency: amountParts?.[1] || fb.currency,
    amount: amountParts?.[2] || fb.amount,
  };
}

/** Build fills from a persisted inquiry + agency for email/confirm/receipt. */
export function fillsFromInquiry(inquiry, agency) {
  const saved = inquiry?.authorizationFills;
  if (
    saved &&
    typeof saved === 'object' &&
    (saved.authorizerName || saved.amountLabel || saved.agencyName)
  ) {
    return {
      authorizerName: String(saved.authorizerName || '').trim(),
      agencyName: String(saved.agencyName || '').trim(),
      amountLabel: String(saved.amountLabel || '').trim(),
      purpose: String(saved.purpose || '').trim(),
      currency: String(saved.currency || '').trim(),
      amount: String(saved.amount || '').trim(),
    };
  }

  const billing = inquiry?.billing || {};
  const customer = inquiry?.customer || {};
  const authorizerName =
    billing.cardholderName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  const purpose =
    buildAuthPurpose(inquiry?.travel?.from, inquiry?.travel?.to) ||
    'the itinerary detailed above';

  const fromDefaults = resolveAuthFills({
    authorizerName,
    agencyName: agency?.name || 'Airline Ticket Booking',
    currency: inquiry?.pricing?.currency || 'USD',
    total: inquiry?.pricing?.sellingPrice ?? 0,
    purpose,
  });

  // Prefer phrases actually present in saved authorization text (post-edit)
  if (inquiry?.authorizationText) {
    return extractAuthFillsFromText(inquiry.authorizationText, fromDefaults);
  }
  return fromDefaults;
}

export default buildAuthorizationText;
