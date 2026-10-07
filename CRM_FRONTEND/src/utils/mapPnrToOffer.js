/**
 * Map decoded PNR itinerary → CRM selectedOffer + travel patch.
 */

export function travelPatchFromPnr(itinerary, existingTravel = {}) {
  const summary = itinerary?.tripSummary || {};
  const patch = { ...existingTravel };
  if (summary.origin) {
    patch.from = summary.origin;
    patch.fromLabel = summary.origin;
  }
  if (summary.destination) {
    patch.to = summary.destination;
    patch.toLabel = summary.destination;
  }
  if (summary.departureDate) patch.departureDate = summary.departureDate;
  if (summary.returnDate) patch.returnDate = summary.returnDate;
  else if (summary.origin && summary.destination !== summary.origin) {
    patch.returnDate = '';
  }
  return patch;
}

export function mapPnrToOffer(itinerary, { costPrice = 0, currency = 'USD' } = {}) {
  const segments = Array.isArray(itinerary?.segments)
    ? itinerary.segments
    : [];
  const first = segments[0] || {};
  const last = segments[segments.length - 1] || first;
  const airlineName = first.airlineName || first.airlineCode || 'PNR itinerary';
  const id = `pnr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    airline: {
      name: airlineName,
      iataCode: first.airlineCode || '',
      logoLockupUrl: first.logoUrl || '',
      logoSymbolUrl: first.logoUrl || '',
    },
    flightNumber: first.flightNumber
      ? `${first.airlineCode || ''} ${first.flightNumber}`.trim()
      : '',
    departure: {
      at: [first.departureDate, first.departureTime]
        .filter(Boolean)
        .join('T'),
      airport: first.from || '',
      city: '',
    },
    arrival: {
      at: [last.arrivalDate || last.departureDate, last.arrivalTime]
        .filter(Boolean)
        .join('T'),
      airport: last.to || '',
      city: '',
    },
    duration: '',
    stops: Math.max(0, segments.length - 1),
    cabinClass: first.bookingClass || '',
    costPrice: Number(costPrice) || 0,
    currency,
    expiresAt: null,
    raw: {
      source: 'pnr',
      segments,
      tripSummary: itinerary?.tripSummary || null,
      warnings: itinerary?.warnings || [],
      decodeSource: itinerary?.source || 'local-parser',
      pnrRaw: itinerary?.rawText || '',
    },
  };
}

export default mapPnrToOffer;
