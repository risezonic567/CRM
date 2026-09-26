/**
 * Normalize Duffel offer into CRM-friendly card shape.
 * Keeps full raw offer under `raw` for snapshot storage.
 */
export function normalizeOffer(offer) {
  const slice = offer.slices?.[0];
  const segment = slice?.segments?.[0];
  const lastSegment = slice?.segments?.[slice.segments.length - 1];
  const owner = offer.owner || {};

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
    duration: slice?.duration || offer.total_duration || '',
    stops: Math.max((slice?.segments?.length || 1) - 1, 0),
    cabinClass: segment?.passengers?.[0]?.cabin_class || '',
    costPrice,
    currency,
    expiresAt: offer.expires_at,
    raw: offer,
  };
}

export function normalizeOfferList(offers = []) {
  return offers.map(normalizeOffer);
}
