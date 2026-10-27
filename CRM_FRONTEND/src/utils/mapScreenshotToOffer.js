/**
 * Build a stub selectedOffer for screenshot itinerary mode.
 * Pricing / auth use travel.from-to; PAX sees the image, not a segment table.
 */

export function mapScreenshotToOffer({
  travel = {},
  currency = 'USD',
  screenshot = null,
} = {}) {
  const from = String(travel.from || '')
    .trim()
    .toUpperCase();
  const to = String(travel.to || '')
    .trim()
    .toUpperCase();
  const departureDate = travel.departureDate || null;
  const returnDate = travel.returnDate || null;

  return {
    id: `screenshot-${from}-${to}-${departureDate || 'na'}`,
    airline: { name: 'See itinerary image', iataCode: '' },
    flightNumber: '',
    costPrice: 0,
    currency,
    departure: {
      at: departureDate ? `${departureDate}T00:00:00` : null,
      iataCode: from,
    },
    arrival: {
      at: null,
      iataCode: to,
    },
    raw: {
      source: 'screenshot',
      segments: [],
      tripSummary: {
        origin: from || null,
        destination: to || null,
        departureDate,
        returnDate: returnDate || null,
        segmentCount: 0,
        outboundSegmentCount: 0,
      },
      screenshot: screenshot
        ? {
            relativePath: screenshot.relativePath || '',
            mimeType: screenshot.mimeType || '',
            originalName: screenshot.originalName || '',
          }
        : null,
    },
  };
}
