import { getDuffelClient } from './duffel.client.js';
import config from '../../config/index.js';
import { AppError } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

/**
 * Normalize Duffel place → CRM dropdown option.
 * No hardcoded airports — live Places API only.
 */
export function normalizePlace(place) {
  if (!place) return null;

  const iata = place.iata_code || '';
  if (!iata) return null;

  const city =
    place.city_name ||
    place.city?.name ||
    '';
  const name = place.name || iata;
  const country = place.iata_country_code || place.city?.iata_country_code || '';

  const label = [iata, name].filter(Boolean).join(' — ')
    + (city && city !== name ? ` (${city})` : '')
    + (country ? `, ${country}` : '');

  return {
    id: place.id,
    type: place.type || 'airport',
    iataCode: iata.toUpperCase(),
    name,
    cityName: city,
    countryCode: country,
    label,
    raw: place,
  };
}

/**
 * Duffel Places suggestions (airports / cities by name or IATA).
 * GET /places/suggestions?query=...
 */
export async function suggestPlaces(query) {
  const q = String(query || '').trim();
  if (q.length < 2) {
    return [];
  }

  if (!config.duffel.apiKey) {
    throw new AppError('DUFFEL_API_KEY is not configured', 503);
  }

  const client = getDuffelClient();

  try {
    const { data } = await client.get('/places/suggestions', {
      params: { query: q },
    });

    const places = Array.isArray(data?.data) ? data.data : [];

    // Prefer airports with IATA; also keep cities that have iata_code (e.g. LON)
    const normalized = places
      .map(normalizePlace)
      .filter(Boolean);

    // Dedupe by IATA
    const seen = new Set();
    const unique = [];
    for (const p of normalized) {
      if (seen.has(p.iataCode)) continue;
      seen.add(p.iataCode);
      unique.push(p);
    }

    return unique.slice(0, 12);
  } catch (err) {
    const status = err.response?.status;
    const message =
      err.response?.data?.errors?.[0]?.message ||
      err.message ||
      'Airport search failed';
    logger.error('Duffel places error', { status, message, query: q });
    throw new AppError(message, status && status < 500 ? status : 502);
  }
}

export default suggestPlaces;
