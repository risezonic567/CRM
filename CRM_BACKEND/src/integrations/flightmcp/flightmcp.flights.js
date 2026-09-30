import { postFlightSearch } from './flightmcp.client.js';
import { normalizeOfferList } from './flightmcp.normalizer.js';
import { toDateOnly } from '../duffel/duffel.flights.js';
import config from '../../config/index.js';
import { AppError } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

/**
 * Search via Flight MCP — returns same shape as Duffel searchFlights.
 */
export async function searchFlights({
  from,
  to,
  departureDate,
  returnDate,
  passengers,
  cabinClass = 'economy',
  currency,
}) {
  const dep = toDateOnly(departureDate);
  const ret = toDateOnly(returnDate);

  if (!dep) {
    throw new AppError('Invalid departure date', 400);
  }

  const adults = Math.min(Math.max(Number(passengers) || 1, 1), 9);
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
    adults,
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
      passengers: adults,
      cabinClass: body.cabinClass,
      offerCount: offers.length,
      cached: Boolean(data?.meta?.cached),
      remainingApiCalls: data?.remainingApiCalls,
    },
  };
}
