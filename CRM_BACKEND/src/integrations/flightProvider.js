/**
 * Flight search provider switchboard.
 * FLIGHT_PROVIDER=duffel | flightmcp | serpapi | mock
 *
 * Airport suggest stays on Duffel/mock (places API) — unchanged.
 */
import config from '../config/index.js';
import {
  searchFlights as searchFlightsDuffel,
  toDateOnly,
} from './duffel/duffel.flights.js';
import { searchFlights as searchFlightsFlightMcp } from './flightmcp/flightmcp.flights.js';
import { searchFlights as searchFlightsSerpApi } from './serpapi/serpapi.flights.js';
import { getMockFlights } from './mock/mockFlights.js';
import { AppError } from '../utils/apiResponse.js';

export { toDateOnly };

export async function searchFlights(params) {
  const provider = String(config.flightProvider || 'duffel').toLowerCase();

  if (provider === 'mock') {
    const dep = toDateOnly(params.departureDate);
    return getMockFlights({
      from: params.from,
      to: params.to,
      departureDate: dep,
      passengers: params.passengers,
      cabinClass: params.cabinClass,
    });
  }

  if (provider === 'flightmcp') {
    return searchFlightsFlightMcp(params);
  }

  if (provider === 'serpapi') {
    return searchFlightsSerpApi(params);
  }

  if (provider === 'duffel') {
    return searchFlightsDuffel(params);
  }

  throw new AppError(
    `Unknown FLIGHT_PROVIDER "${provider}". Use duffel, flightmcp, serpapi, or mock.`,
    500
  );
}
