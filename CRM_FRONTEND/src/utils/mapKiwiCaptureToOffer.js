/**
 * Map Kiwi extension capture → CRM offer + travel patch.
 */

/** Common Kiwi URL city slugs → IATA (extend as needed) */
const CITY_SLUG_TO_IATA = {
  delhi: 'DEL',
  'new-delhi': 'DEL',
  'delhi-india': 'DEL',
  mumbai: 'BOM',
  'mumbai-india': 'BOM',
  bangalore: 'BLR',
  bengaluru: 'BLR',
  hyderabad: 'HYD',
  chennai: 'MAA',
  kolkata: 'CCU',
  goa: 'GOI',
  dubai: 'DXB',
  'dubai-united-arab-emirates': 'DXB',
  'abu-dhabi': 'AUH',
  london: 'LHR',
  'london-united-kingdom': 'LHR',
  paris: 'CDG',
  frankfurt: 'FRA',
  'frankfurt-germany': 'FRA',
  singapore: 'SIN',
  bangkok: 'BKK',
  'new-york': 'JFK',
  'new-york-city-new-york-united-states': 'JFK',
  'los-angeles': 'LAX',
  tokyo: 'HND',
  'tokyo-japan': 'HND',
  sydney: 'SYD',
};

const NOISE_IATA = new Set([
  'THE',
  'AND',
  'FOR',
  'OCT',
  'NOV',
  'DEC',
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'UTC',
  'GMT',
]);

function parsePrice(text) {
  if (text == null) return { amount: 0, currency: 'USD' };
  const raw = String(text).replace(/,/g, '').trim();
  let currency = 'USD';
  if (/₹|rs\.?/i.test(raw)) currency = 'INR';
  else {
    const currencyMatch = raw.match(/\b([A-Z]{3})\b/);
    if (currencyMatch) currency = currencyMatch[1];
  }
  const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
  return {
    amount: numMatch ? Number(numMatch[1]) : 0,
    currency,
  };
}

function parseStops(text) {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  if (t.includes('direct') || t.includes('nonstop') || t.includes('non-stop')) {
    return 0;
  }
  const m = t.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

function extractIata(text) {
  if (!text) return '';
  const upper = String(text).toUpperCase();
  const m = upper.match(/\b([A-Z]{3})\b/);
  if (m && !NOISE_IATA.has(m[1])) return m[1];
  return '';
}

function slugToIata(slug) {
  if (!slug) return '';
  const s = String(slug).toLowerCase().trim();
  if (/^[a-z]{3}$/.test(s)) return s.toUpperCase();
  if (CITY_SLUG_TO_IATA[s]) return CITY_SLUG_TO_IATA[s];
  // try first city token: "delhi-india" → delhi
  const first = s.split('-')[0];
  if (CITY_SLUG_TO_IATA[first]) return CITY_SLUG_TO_IATA[first];
  // full slug without country
  for (const [key, code] of Object.entries(CITY_SLUG_TO_IATA)) {
    if (s.includes(key) || key.includes(s)) return code;
  }
  return extractIata(slug);
}

function resolveAirportCode(capture, side) {
  const direct =
    side === 'from'
      ? capture?.origin
      : capture?.destination;
  const fromIata = extractIata(direct);
  if (fromIata) return fromIata;

  const ctx = capture?.searchContext || {};
  const slug = side === 'from' ? ctx.origin : ctx.destination;
  const q =
    side === 'from' ? ctx.queryOrigin : ctx.queryDestination;
  return slugToIata(q) || slugToIata(slug) || '';
}

/**
 * Fill wizard travel fields from capture.
 */
export function travelPatchFromCapture(capture, existingTravel = {}) {
  const fromCode =
    resolveAirportCode(capture, 'from') || existingTravel.from || '';
  const toCode =
    resolveAirportCode(capture, 'to') || existingTravel.to || '';

  let departureDate = existingTravel.departureDate || '';
  let returnDate = existingTravel.returnDate || '';

  const datesRaw =
    capture?.searchContext?.dates ||
    capture?.searchContext?.url ||
    '';
  const dm = String(datesRaw).match(
    /(\d{4}-\d{2}-\d{2})(?:[_/-](\d{4}-\d{2}-\d{2}))?/
  );
  if (dm) {
    departureDate = dm[1];
    if (dm[2] && dm[2] !== dm[1]) returnDate = dm[2];
  }

  const patch = {};
  if (fromCode) {
    patch.from = fromCode;
    patch.fromLabel = String(capture?.origin || fromCode).trim();
  }
  if (toCode) {
    patch.to = toCode;
    patch.toLabel = String(capture?.destination || toCode).trim();
  }
  if (departureDate) patch.departureDate = departureDate;
  if (returnDate) patch.returnDate = returnDate;
  return patch;
}

/**
 * @param {object} capture
 * @returns {object} CRM offer
 */
export function mapKiwiCaptureToOffer(capture) {
  const { amount, currency } = parsePrice(capture?.price);
  const src = capture?.captureSource || capture?.source || 'kiwi';
  const id =
    capture?.id ||
    `${src}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const airlineName =
    (Array.isArray(capture?.airlines) && capture.airlines[0]) ||
    (src === 'google' ? 'Google Flights capture' : 'Kiwi capture');
  const logo =
    (Array.isArray(capture?.logos) && capture.logos[0]) || '';

  const fromCode = resolveAirportCode(capture, 'from');
  const toCode = resolveAirportCode(capture, 'to');

  return {
    id,
    airline: {
      name: airlineName,
      iataCode: '',
      logoLockupUrl: logo,
      logoSymbolUrl: logo,
    },
    flightNumber: capture?.flightNumber || '',
    departure: {
      at: capture?.departure || '',
      airport: fromCode || capture?.origin || '',
      city: '',
    },
    arrival: {
      at: capture?.arrival || '',
      airport: toCode || capture?.destination || '',
      city: '',
    },
    duration: capture?.duration || '',
    stops: parseStops(capture?.stops),
    cabinClass: '',
    costPrice: amount,
    currency,
    expiresAt: null,
    raw: {
      source: src === 'google' ? 'google-extension' : 'kiwi-extension',
      capture,
    },
  };
}

export default mapKiwiCaptureToOffer;
