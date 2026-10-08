/**
 * Authorization paragraph helpers.
 * - Plain text stored on Inquiry.authorizationText
 * - HTML with underlined fills rendered at display time (email / confirm / receipt)
 * Customer-facing amount is ONE total only.
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

/** Normalize the dynamic slots used in the authorization sentence. */
export function resolveAuthFills({
  authorizerName = '',
  agencyName = 'DEMO Travel Agency',
  currency = 'USD',
  total = 0,
  purpose = '',
} = {}) {
  const name = String(authorizerName || '').trim() || '____________________';
  const agency = String(agencyName || '').trim() || 'DEMO Travel Agency';
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

export function buildAuthorizationText(options = {}) {
  const f = resolveAuthFills(options);
  return (
    `As per our telephonic conversation and as agreed I, ${f.authorizerName}, authorize ${f.agencyName} ` +
    `to charge my above card for ${f.amountLabel} as per given details for ${f.purpose}. ` +
    `I understand that this charge is non-refundable. (You may see above charges in split, ` +
    `however total remains same) Bookings purchased are non-transferable. Name changes are ` +
    `not permitted. Date/Route/Time change may incur penalty plus difference in fare.`
  );
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

/** Build fills from a persisted inquiry + agency for email/confirm/receipt. */
export function fillsFromInquiry(inquiry, agency) {
  const billing = inquiry?.billing || {};
  const customer = inquiry?.customer || {};
  const authorizerName =
    billing.cardholderName ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  const purpose =
    inquiry?.travel?.from && inquiry?.travel?.to
      ? `${inquiry.travel.from} to ${inquiry.travel.to}`
      : 'the itinerary detailed above';

  return resolveAuthFills({
    authorizerName,
    agencyName: agency?.name || 'DEMO Travel Agency',
    currency: inquiry?.pricing?.currency || 'USD',
    total: inquiry?.pricing?.sellingPrice ?? 0,
    purpose,
  });
}

export default buildAuthorizationText;
