/**
 * Normalize Duffel offer into CRM-friendly card shape.
 * Keeps full raw offer under `raw` for snapshot storage.
 * Round-trip: attaches inbound from slices[1] when present (complete itinerary).
 */
import { formatDuration } from '../../utils/formatDuration.js';

function sliceLeg(slice) {
  if (!slice) return null;
  const segments = slice.segments || [];
  const first = segments[0];
  const last = segments[segments.length - 1] || first;
  if (!first) return null;
  return {
    airline: {
      name: first.marketing_carrier?.name || '',
      iataCode: first.marketing_carrier?.iata_code || '',
      logoLockupUrl: '',
      logoSymbolUrl: '',
    },
    flightNumber: `${first.marketing_carrier?.iata_code || ''}${first.marketing_carrier_flight_number || ''}`,
    departure: {
      at: first.departing_at,
      airport: first.origin?.iata_code,
      city: first.origin?.city_name || first.origin?.name,
    },
    arrival: {
      at: last?.arriving_at,
      airport: last?.destination?.iata_code,
      city: last?.destination?.city_name || last?.destination?.name,
    },
    duration: formatDuration(slice.duration || ''),
    stops: Math.max(segments.length - 1, 0),
    cabinClass: first.passengers?.[0]?.cabin_class || '',
  };
}

export function normalizeOffer(offer) {
  const slice = offer.slices?.[0];
  const segment = slice?.segments?.[0];
  const lastSegment = slice?.segments?.[slice.segments.length - 1];
  const owner = offer.owner || {};
  const inboundLeg = sliceLeg(offer.slices?.[1]);

  const costPrice = Number(offer.total_amount);
  const currency = offer.total_currency || 'USD';

  return {
    id: offer.id,
    airline: {
      name: owner.name || segment?.marketing_carrier?.name || '',
      iataCode: owner.iata_code || segment?.marketing_carrier?.iata_code || '',
      logoLockupUrl: owner.logo_lockup_url || '',
      logoSymbolUrl: owner.logo_symbol_url || '',
    },
    flightNumber: segment
      ? `${segment.marketing_carrier?.iata_code || ''}${segment.marketing_carrier_flight_number || ''}`
      : '',
    departure: {
      at: segment?.departing_at,
      airport: segment?.origin?.iata_code,
      city: segment?.origin?.city_name || segment?.origin?.name,
    },
    arrival: {
      at: lastSegment?.arriving_at,
      airport: lastSegment?.destination?.iata_code,
      city: lastSegment?.destination?.city_name || lastSegment?.destination?.name,
    },
    duration: formatDuration(slice?.duration || offer.total_duration || ''),
    stops: Math.max((slice?.segments?.length || 1) - 1, 0),
    cabinClass: segment?.passengers?.[0]?.cabin_class || '',
    costPrice,
    currency,
    expiresAt: offer.expires_at,
    leg: 'outbound',
    departureToken: null,
    bookingToken: null,
    inbound: inboundLeg,
    tripType: inboundLeg ? 'round' : 'oneway',
    raw: offer,
  };
}

export function normalizeOfferList(offers = []) {
  return offers.map(normalizeOffer);
}
