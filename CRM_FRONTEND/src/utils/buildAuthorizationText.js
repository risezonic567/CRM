/**
 * Authorization paragraph helpers (mirrors backend).
 * Plain text for storage/edit; HTML with underlined fills for display.
 */

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

export function buildAuthorizationText(options = {}) {
  const f = resolveAuthFills(options);
  return (
    `I, ${f.authorizerName}, hereby authorize ${f.agencyName} to charge my card ` +
    `for the amount of ${f.amountLabel} in connection with the purchase of travel services, ` +
    `specifically the ${f.purpose}. I acknowledge and agree that this charge is non-refundable, ` +
    `that bookings purchased are non-transferable, and that name changes are not permitted. ` +
    `I further understand that any request to change the date, route, or time of travel may ` +
    `result in additional penalties and fare differences. By signing below, I confirm that I am ` +
    `willingly paying ${f.agencyName} for the travel services offered, which may include flights, ` +
    `hotels, and car bookings in both the U.S. and European markets, and I authorize ${f.agencyName} ` +
    `to process the stated amount using the card details I have provided.`
  );
}

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
 * underlines still work on email / confirm (exact phrases in the text).
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

/** Which expected fill phrases are missing from plain text (for Apply toast). */
export function missingAuthFillLabels(plainText, fills = {}) {
  const text = String(plainText || '');
  const checks = [
    ['name', fills.authorizerName],
    ['agency', fills.agencyName],
    ['total', fills.amountLabel],
    ['route', fills.purpose],
  ];
  return checks
    .filter(([, v]) => v && v !== '____________________' && !text.includes(v))
    .map(([label]) => label);
}

export default buildAuthorizationText;
