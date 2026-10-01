import { searchFlights, toDateOnly } from '../../integrations/flightProvider.js';
import { suggestPlaces } from '../../integrations/duffel/duffel.places.js';
import { Agency } from '../../models/index.js';
import config from '../../config/index.js';

export async function searchAirports(query) {
  const places = await suggestPlaces(query);
  return { places, source: 'duffel' };
}

export async function search(user, payload) {
  const agency = await Agency.findById(user.agencyId).lean();

  const departureDate = toDateOnly(payload.departureDate);
  const returnDate = toDateOnly(payload.returnDate);

  const result = await searchFlights({
    from: payload.from,
    to: payload.to,
    departureDate,
    returnDate,
    passengers: payload.passengers,
    adults: payload.adults,
    children: payload.children,
    infantsInSeat: payload.infantsInSeat,
    infantsOnLap: payload.infantsOnLap,
    cabinClass: payload.cabinClass,
    currency: agency?.currency || config.pricing.defaultCurrency,
    departureToken: payload.departureToken || null,
  });

  const defaultMarkup =
    agency?.defaultMarkup ?? config.pricing.defaultMarkup;
  const merchantFeePercent = config.pricing.merchantFeePercent;

  return {
    ...result,
    agencyDefaults: {
      defaultMarkup,
      merchantFeePercent,
      currency: agency?.currency || config.pricing.defaultCurrency,
    },
  };
}
