import { postFlightSearch } from './flightmcp.client.js';
import { normalizeOfferList } from './flightmcp.normalizer.js';
import { toDateOnly } from '../duffel/duffel.flights.js';
import { resolvePassengerCounts } from '../passengerCounts.js';
import config from '../../config/index.js';
import { AppError } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

/**
 * Search via Flight MCP — same shape as Duffel searchFlights.
 * Pax: sends adults count (total seating pax). Extra child/infant breakdown
 * logged when present — MCP may not support full Google-style split.
 */
export async function searchFlights({
  from,
  to,
  departureDate,
  returnDate,
  passengers,
  adults,
  children,
  infantsInSeat,
  infantsOnLap,
  cabinClass = 'economy',
  currency,
}) {
  const dep = toDateOnly(departureDate);
  const ret = toDateOnly(returnDate);

  if (!dep) {
    throw new AppError('Invalid departure date', 400);
  }

  const counts = resolvePassengerCounts({
    passengers,
    adults,
    children,
    infantsInSeat,
    infantsOnLap,
  });
  const seatingAdults = Math.max(
    1,
    counts.adults + counts.children + counts.infantsInSeat
  );

  if (counts.children || counts.infantsInSeat || counts.infantsOnLap) {
    logger.warn(
      'Flight MCP: child/infant breakdown collapsed into adults seating count',
      counts
    );
  }

  const mcp = config.flightmcp;
  const requestCurrency = (
    currency ||
    mcp.currency ||
    config.pricing.defaultCurrency ||
    'USD'
  ).toUpperCase();

  const body = {
    origin: String(from).toUpperCase(),
    destination: String(to).toUpperCase(),
    departureDate: dep,
    adults: seatingAdults,
    cabinClass: cabinClass || 'economy',
    currency: requestCurrency,
    locale: mcp.locale,
    pointOfSaleCountry: mcp.pointOfSaleCountry,
    maxResults: mcp.maxResults,
    cacheTtlSeconds: mcp.cacheTtlSeconds,
  };

  if (ret) {
    body.returnDate = ret;
  }

  const data = await postFlightSearch(body);
  const rawOffers = Array.isArray(data?.offers) ? data.offers : [];
  const offers = normalizeOfferList(rawOffers);

  logger.info('Flight MCP search OK', {
    requestId: data?.requestId,
    offerCount: offers.length,
    cached: data?.meta?.cached,
    from: body.origin,
    to: body.destination,
    departureDate: dep,
  });

  return {
    requestId: data?.requestId || '',
    offers,
    source: 'flightmcp',
    meta: {
      from: body.origin,
      to: body.destination,
      departureDate: dep,
      returnDate: ret,
      passengers: counts.total,
      adults: counts.adults,
      children: counts.children,
      infantsInSeat: counts.infantsInSeat,
      infantsOnLap: counts.infantsOnLap,
      cabinClass: body.cabinClass,
      offerCount: offers.length,
      cached: Boolean(data?.meta?.cached),
      remainingApiCalls: data?.remainingApiCalls,
    },
  };
}
