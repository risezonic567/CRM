/**
 * Map manually entered flight legs → CRM selectedOffer + itinerary shape
 * (same segment keys as PNR decode for shared tables / pricing steps).
 */

import { travelPatchFromPnr } from './mapPnrToOffer';

export { travelPatchFromPnr as travelPatchFromManualItinerary };

/** Parse "1h 05m", "12h10m", "65", "1:05" → minutes (or null). */
export function parseDurationToMinutes(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const hm = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const h = s.match(/(\d+)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  if (h || m) {
    return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  }
  return null;
}

export function buildTripSummaryFromSegments(segments, travel = {}) {
  const list = Array.isArray(segments) ? segments : [];
  const origin = travel.from || list[0]?.from || null;
  const destination = travel.to || (list.length ? list[0]?.to : null);
  const departureDate = travel.departureDate || list[0]?.departureDate || null;
  const returnDate = travel.returnDate || null;

  return {
    origin,
    destination,
    departureDate,
    returnDate: returnDate || null,
    segmentCount: list.length,
  };
}

function normalizeLeg(leg, index, defaults = {}) {
  const airlineCode = String(leg.airlineCode || '')
    .trim()
    .toUpperCase();
  const from = String(leg.from || defaults.from || '')
    .trim()
    .toUpperCase();
  const to = String(leg.to || defaults.to || '')
    .trim()
    .toUpperCase();
  const departureDate = leg.departureDate || defaults.departureDate || '';
  const arrivalDate = String(leg.arrivalDate || '').trim() || departureDate;
  const durationMinutes = parseDurationToMinutes(leg.duration);

  return {
    lineNumber: index + 1,
    airlineCode,
    airlineName: String(leg.airlineName || '').trim() || null,
    flightNumber: String(leg.flightNumber || '').trim(),
    bookingClass: String(leg.bookingClass || '')
      .trim()
      .toUpperCase(),
    departureDate,
    dayOfWeek: null,
    from,
    to,
    status: 'HK',
    departureTime: String(leg.departureTime || '').trim(),
    arrivalTime: String(leg.arrivalTime || '').trim(),
    arrivalDate,
    arrivalDayOfWeek: null,
    equipmentOrSuffix: null,
    operatingInfo: null,
    durationMinutes,
    durationLabel: String(leg.duration || '').trim() || null,
  };
}

/**
 * Build itinerary from Google-Flights-style travel + outbound/return legs.
 */
export function buildManualItineraryFromLegs({
  travel = {},
  tripType = 'oneway',
  outbound = {},
  inbound = null,
} = {}) {
  const segments = [
    normalizeLeg(outbound, 0, {
      from: travel.from,
      to: travel.to,
      departureDate: travel.departureDate,
    }),
  ];

  if (tripType === 'round' && inbound) {
    segments.push(
      normalizeLeg(inbound, 1, {
        from: travel.to,
        to: travel.from,
        departureDate: travel.returnDate,
      })
    );
  }

  return {
    segments,
    tripSummary: buildTripSummaryFromSegments(segments, travel),
    warnings: [],
  };
}

export function mapManualToOffer(itinerary, { costPrice = 0, currency = 'USD' } = {}) {
  const segments = Array.isArray(itinerary?.segments) ? itinerary.segments : [];
  const first = segments[0] || {};
  const lastOutbound =
    segments.length > 1 && itinerary?.tripSummary?.returnDate
      ? segments[0]
      : segments[segments.length - 1] || first;
  const airlineName =
    first.airlineName || first.airlineCode || 'Manual itinerary';
  const id = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const duration =
    first.durationLabel ||
    (first.durationMinutes != null
      ? `${Math.floor(first.durationMinutes / 60)}h ${String(
          first.durationMinutes % 60
        ).padStart(2, '0')}m`
      : '');

  return {
    id,
    airline: {
      name: airlineName,
      iataCode: first.airlineCode || '',
      logoLockupUrl: '',
      logoSymbolUrl: '',
    },
    flightNumber: first.flightNumber
      ? `${first.airlineCode || ''} ${first.flightNumber}`.trim()
      : '',
    departure: {
      at: [first.departureDate, first.departureTime].filter(Boolean).join('T'),
      airport: first.from || '',
      city: '',
    },
    arrival: {
      at: [
        lastOutbound.arrivalDate || lastOutbound.departureDate,
        lastOutbound.arrivalTime,
      ]
        .filter(Boolean)
        .join('T'),
      airport: lastOutbound.to || '',
      city: '',
    },
    duration,
    stops: 0,
    cabinClass: first.bookingClass || '',
    costPrice: Number(costPrice) || 0,
    currency,
    expiresAt: null,
    raw: {
      source: 'manual',
      segments,
      tripSummary:
        itinerary?.tripSummary || buildTripSummaryFromSegments(segments),
      warnings: [],
    },
  };
}

export default mapManualToOffer;
