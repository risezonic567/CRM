/**
 * Server-side fallback for authorization paragraph when agent sends empty text.
 * Customer-facing: ONE total only (not supplier + markup as separate blanks).
 */
export function buildAuthorizationText({
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
  const forWhat =
    String(purpose || '').trim() || 'the itinerary detailed above';

  return (
    `As per our telephonic conversation and as agreed I, ${name}, authorize ${agency} ` +
    `to charge my above card for ${curr} ${amount} as per given details for ${forWhat}. ` +
    `I understand that this charge is non-refundable. (You may see above charges in split, ` +
    `however total remains same) Bookings purchased are non-transferable. Name changes are ` +
    `not permitted. Date/Route/Time change may incur penalty plus difference in fare.`
  );
}

export default buildAuthorizationText;
