/**
 * Map Flight MCP offer → CRM card shape (same contract as duffel.normalizer).
 * MCP prices use minor units (e.g. 98640 JPY = ¥98,640; USD cents → dollars).
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function minorToMajor(amountMinor, currency = 'USD') {
  const n = Number(amountMinor);
  if (!Number.isFinite(n)) return 0;
  const code = String(currency || 'USD').toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return n;
  return Math.round((n / 100) * 100) / 100;
}

function formatDurationMinutes(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return '';
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h && mins) return `${h}h ${mins}m`;
  if (h) return `${h}h`;
  return `${mins}m`;
}

/**
 * @param {object} offer - Flight MCP offer
 */
export function normalizeOffer(offer) {
  const currency = offer?.price?.currency || 'USD';
  const costPrice = minorToMajor(offer?.price?.amountMinor, currency);

  const outbound = offer?.itineraries?.[0];
  const segments = outbound?.segments || [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  const carrier = first?.marketingCarrier || {};

  return {
    id: offer?.id || '',
    airline: {
      name: carrier.name || '',
      iataCode: carrier.code || '',
      logoLockupUrl: '',
      logoSymbolUrl: '',
    },
    flightNumber: first?.flightNumber || '',
    departure: {
      at: first?.departureAt,
      airport: first?.origin,
      city: '',
    },
    arrival: {
      at: last?.arrivalAt,
      airport: last?.destination,
      city: '',
    },
    duration: formatDurationMinutes(outbound?.durationMinutes),
    stops:
      typeof outbound?.stops === 'number'
        ? outbound.stops
        : Math.max(segments.length - 1, 0),
    cabinClass: offer?.cabinClass || '',
    costPrice,
    currency,
    expiresAt: offer?.fetchedAt || null,
    raw: offer,
  };
}

export function normalizeOfferList(offers = []) {
  return offers.map(normalizeOffer);
}
