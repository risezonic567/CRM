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
    cabinClass: payload.cabinClass,
    currency: agency?.currency || config.pricing.defaultCurrency,
  });

  const defaultMarkup =
    agency?.defaultMarkup ?? config.pricing.defaultMarkup;
  // Merchant % always from env (config) — amount is computed per booking
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
