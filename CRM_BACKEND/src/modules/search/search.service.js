import { suggestPlaces } from '../../integrations/duffel/duffel.places.js';

/** Airport autocomplete only — no flight search on this branch. */
export async function searchAirports(query) {
  const places = await suggestPlaces(query);
  return { places, source: 'duffel' };
}
