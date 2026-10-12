/**
 * US ZIP → city/state via Zippopotam.us (no API key).
 * GET https://api.zippopotam.us/us/{zip}
 * Failures are soft — caller should keep form editable / manual.
 */

export function normalizeUsZip(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 5) return '';
  return digits.slice(0, 5);
}

export function isValidUsZipFormat(raw) {
  return Boolean(normalizeUsZip(raw));
}

/**
 * @returns {Promise<{
 *   zip: string,
 *   country: string,
 *   city: string,
 *   state: string,
 *   stateAbbr: string,
 *   places: Array<{ city: string, state: string, stateAbbr: string }>
 * }>}
 */
export async function lookupUsZip(rawZip, { signal } = {}) {
  const zip = normalizeUsZip(rawZip);
  if (!zip) {
    const err = new Error('Enter a 5-digit US ZIP');
    err.code = 'INVALID_FORMAT';
    throw err;
  }

  const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
    method: 'GET',
    signal,
  });

  if (!res.ok) {
    const err = new Error(
      res.status === 404 ? 'ZIP not found' : 'ZIP lookup failed'
    );
    err.code = res.status === 404 ? 'NOT_FOUND' : 'LOOKUP_FAILED';
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const placesRaw = Array.isArray(data?.places) ? data.places : [];
  if (!placesRaw.length) {
    const err = new Error('ZIP not found');
    err.code = 'NOT_FOUND';
    throw err;
  }

  const places = placesRaw.map((p) => ({
    city: p['place name'] || '',
    state: p.state || '',
    stateAbbr: p['state abbreviation'] || '',
  }));

  const first = places[0];
  return {
    zip,
    country: data.country || 'United States',
    city: first.city,
    state: first.stateAbbr || first.state,
    stateAbbr: first.stateAbbr,
    places,
  };
}

export default lookupUsZip;
