import { getDuffelClient } from './duffel.client.js';
import { normalizeOfferList } from './duffel.normalizer.js';
import { getMockFlights } from '../mock/mockFlights.js';
import {
  resolvePassengerCounts,
  duffelPassengersFromCounts,
} from '../passengerCounts.js';
import config from '../../config/index.js';
import { AppError } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

const CABIN_MAP = {
  economy: 'economy',
  premium_economy: 'premium_economy',
  business: 'business',
  first: 'first',
};

/**
 * Keep calendar date as YYYY-MM-DD — never use Date#toISOString (timezone shift).
 */
export function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const mo = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return null;
}

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
}) {
  const dep = toDateOnly(departureDate);
  const ret = toDateOnly(returnDate);
  const counts = resolvePassengerCounts({
    passengers,
    adults,
    children,
    infantsInSeat,
    infantsOnLap,
  });

  if (!dep) {
    throw new AppError('Invalid departure date', 400);
  }

  if (config.duffel.useMock) {
    logger.warn('USE_MOCK_DUFFEL=true — returning mock flights, not live Duffel');
    return getMockFlights({
      from,
      to,
      departureDate: dep,
      passengers: counts.total,
      cabinClass,
    });
  }

  if (!config.duffel.apiKey) {
    throw new AppError('DUFFEL_API_KEY is not configured', 503);
  }

  const client = getDuffelClient();
  const passengersPayload = duffelPassengersFromCounts(counts);

  const slices = [
    {
      origin: String(from).toUpperCase(),
      destination: String(to).toUpperCase(),
      departure_date: dep,
    },
  ];

  if (ret) {
    slices.push({
      origin: String(to).toUpperCase(),
      destination: String(from).toUpperCase(),
      departure_date: ret,
    });
  }

  try {
    const { data } = await client.post('/air/offer_requests', {
      data: {
        slices,
        passengers: passengersPayload,
        cabin_class: CABIN_MAP[cabinClass] || 'economy',
      },
    });

    const offers = data?.data?.offers || [];
    logger.info('Duffel flight search OK', {
      requestId: data?.data?.id,
      offerCount: offers.length,
      from,
      to,
      departureDate: dep,
      adults: counts.adults,
      children: counts.children,
    });

    return {
      requestId: data?.data?.id,
      offers: normalizeOfferList(offers),
      source: 'duffel',
      meta: {
        from: String(from).toUpperCase(),
        to: String(to).toUpperCase(),
        departureDate: dep,
        returnDate: ret,
        passengers: counts.total,
        adults: counts.adults,
        children: counts.children,
        infantsInSeat: counts.infantsInSeat,
        infantsOnLap: counts.infantsOnLap,
        cabinClass,
        offerCount: offers.length,
      },
    };
  } catch (err) {
    const status = err.response?.status;
    const message =
      err.response?.data?.errors?.[0]?.message ||
      err.message ||
      'Duffel search failed';
    logger.error('Duffel search error', { status, message, from, to, dep });
    throw new AppError(message, status && status < 500 ? status : 502);
  }
}
