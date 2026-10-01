import { getGoogleFlights } from './serpapi.client.js';
import { normalizeOfferList } from './serpapi.normalizer.js';
import { toDateOnly } from '../duffel/duffel.flights.js';
import { resolvePassengerCounts } from '../passengerCounts.js';
import config from '../../config/index.js';
import { AppError } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

const CABIN_TO_SERP = {
  economy: 1,
  premium_economy: 2,
  business: 3,
  first: 4,
};

/**
 * Single SerpApi Google Flights param builder (docs-aligned).
 *
 * Outbound search: full route + dates + pax.
 * Return leg (RT step 2): SAME search context + departure_token.
 * type=1 requires outbound_date + return_date — never omit them on RT.
 *
 * @see https://serpapi.com/google-flights-api
 */
function buildSerpParams({
  from,
  to,
  dep,
  ret,
  counts,
  cabinClass,
  currency,
  hl,
  gl,
  deepSearch,
  departureToken,
}) {
  const origin = String(from || '').toUpperCase();
  const dest = String(to || '').toUpperCase();

  if (!origin || !dest) {
    throw new AppError('from and to airport codes are required', 400);
  }
  if (!dep) {
    throw new AppError('departureDate (outbound_date) is required', 400);
  }

  const isReturnLeg = Boolean(departureToken);
  const isRoundTrip = Boolean(ret) || isReturnLeg;

  if (isRoundTrip && !ret) {
    throw new AppError(
      'returnDate is required for round-trip (and return-leg) searches',
      400
    );
  }

  const params = {
    departure_id: origin,
    arrival_id: dest,
    outbound_date: dep,
    type: isRoundTrip ? 1 : 2,
    adults: counts.adults,
    children: counts.children,
    infants_in_seat: counts.infantsInSeat,
    infants_on_lap: counts.infantsOnLap,
    travel_class: CABIN_TO_SERP[cabinClass] || 1,
    currency,
    hl,
    gl,
    deep_search: deepSearch ? 'true' : 'false',
  };

  if (isRoundTrip) {
    params.return_date = ret;
  }

  if (isReturnLeg) {
    params.departure_token = departureToken;
  }

  return params;
}

/**
 * Search via SerpApi Google Flights — same return shape as Duffel/MCP searchFlights.
 * Round-trip return leg: pass departureToken from an outbound offer (plus full context).
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
  departureToken,
}) {
  const dep = toDateOnly(departureDate);
  const ret = toDateOnly(returnDate);
  const token = departureToken ? String(departureToken).trim() : '';

  const counts = resolvePassengerCounts({
    passengers,
    adults,
    children,
    infantsInSeat,
    infantsOnLap,
  });
  const serp = config.serpapi;
  const requestCurrency = (
    currency ||
    serp.currency ||
    config.pricing.defaultCurrency ||
    'USD'
  ).toUpperCase();

  const params = buildSerpParams({
    from,
    to,
    dep,
    ret,
    counts,
    cabinClass,
    currency: requestCurrency,
    hl: serp.hl,
    gl: serp.gl,
    deepSearch: serp.deepSearch,
    departureToken: token || null,
  });

  const data = await getGoogleFlights(params);
  const leg = token ? 'return' : 'outbound';
  const offers = normalizeOfferList(data, requestCurrency, leg);

  logger.info('SerpApi Google Flights search OK', {
    offerCount: offers.length,
    from: params.departure_id,
    to: params.arrival_id,
    departureDate: dep,
    returnDate: ret,
    returnLeg: Boolean(token),
    adults: counts.adults,
    children: counts.children,
  });

  return {
    requestId: data?.search_metadata?.id || '',
    offers,
    source: 'serpapi',
    meta: {
      from: params.departure_id,
      to: params.arrival_id,
      departureDate: dep,
      returnDate: ret,
      passengers: counts.total,
      adults: counts.adults,
      children: counts.children,
      infantsInSeat: counts.infantsInSeat,
      infantsOnLap: counts.infantsOnLap,
      cabinClass: cabinClass || 'economy',
      offerCount: offers.length,
      leg,
      gl: serp.gl,
      currency: requestCurrency,
      priceInsights: data?.price_insights || null,
    },
  };
}
