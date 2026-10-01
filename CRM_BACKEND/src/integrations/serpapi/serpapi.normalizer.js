/**
 * Map SerpApi Google Flights rows → CRM offer card shape
 * (same contract as duffel.normalizer / flightmcp.normalizer).
 */

function formatDurationMinutes(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return '';
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h && mins) return `${h}h ${mins}m`;
  if (h) return `${h}h`;
  return `${mins}m`;
}

function toIsoLocal(timeStr) {
  if (!timeStr) return '';
  const t = String(timeStr).trim().replace(' ', 'T');
  return t.length === 16 ? `${t}:00` : t;
}

function offerId(row, index, leg) {
  const first = row?.flights?.[0];
  const last = row?.flights?.[row.flights.length - 1];
  const parts = [
    leg,
    first?.flight_number,
    first?.departure_airport?.id,
    last?.arrival_airport?.id,
    first?.departure_airport?.time,
    row?.price,
    index,
  ].filter(Boolean);
  return `serpapi_${parts.join('_').replace(/\s+/g, '')}`;
}

/**
 * @param {object} row
 * @param {number} index
 * @param {string} currency
 * @param {'outbound'|'return'} leg
 */
export function normalizeOffer(row, index = 0, currency = 'USD', leg = 'outbound') {
  const segments = Array.isArray(row?.flights) ? row.flights : [];
  const first = segments[0] || {};
  const last = segments[segments.length - 1] || first;
  const stops = Math.max(segments.length - 1, 0);
  const flightNumber = String(first.flight_number || '').replace(/\s+/g, '');
  const departureToken = row?.departure_token || null;
  const bookingToken = row?.booking_token || null;

  return {
    id: offerId(row, index, leg),
    airline: {
      name: first.airline || row?.airline || '',
      iataCode: flightNumber.slice(0, 2) || '',
      logoLockupUrl: first.airline_logo || row?.airline_logo || '',
      logoSymbolUrl: first.airline_logo || row?.airline_logo || '',
    },
    flightNumber,
    departure: {
      at: toIsoLocal(first?.departure_airport?.time),
      airport: first?.departure_airport?.id || '',
      city: first?.departure_airport?.name || '',
    },
    arrival: {
      at: toIsoLocal(last?.arrival_airport?.time),
      airport: last?.arrival_airport?.id || '',
      city: last?.arrival_airport?.name || '',
    },
    duration: formatDurationMinutes(row?.total_duration),
    stops,
    cabinClass: first?.travel_class || '',
    costPrice: Number(row?.price) || 0,
    currency: String(currency || 'USD').toUpperCase(),
    expiresAt: null,
    leg,
    /** Present on outbound RT results — used for return-leg search */
    departureToken,
    bookingToken,
    /** SerpApi outbound is not a full RT until return selected */
    inbound: null,
    tripType: departureToken ? 'round' : leg === 'return' ? 'round' : 'oneway',
    raw: row,
  };
}

export function normalizeOfferList(data, currency = 'USD', leg = 'outbound') {
  const best = Array.isArray(data?.best_flights) ? data.best_flights : [];
  const other = Array.isArray(data?.other_flights) ? data.other_flights : [];
  const merged = [...best, ...other];
  const offers = merged.map((row, i) =>
    normalizeOffer(row, i, currency, leg)
  );
  const seen = new Set();
  return offers.filter((o) => {
    if (!o.id || seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}
