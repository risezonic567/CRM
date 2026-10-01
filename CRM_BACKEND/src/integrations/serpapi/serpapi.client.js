import config from '../../config/index.js';
import { AppError } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

/**
 * GET SerpApi Google Flights search.
 * @param {Record<string, string|number|boolean>} params
 * @returns {Promise<object>} parsed JSON body
 */
export async function getGoogleFlights(params) {
  const { apiKey, baseUrl, timeoutMs } = config.serpapi;

  if (!apiKey) {
    throw new AppError('SERPAPI_API_KEY is not configured', 503);
  }

  const url = new URL(baseUrl);
  url.searchParams.set('engine', 'google_flights');
  url.searchParams.set('api_key', apiKey);

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        `SerpApi request failed (${response.status})`;
      logger.error('SerpApi Google Flights error', {
        status: response.status,
        message,
      });
      const status =
        response.status >= 400 && response.status < 500 ? response.status : 502;
      throw new AppError(`SERPAPI_ERROR: ${message}`, status);
    }

    if (data?.error) {
      throw new AppError(`SERPAPI_ERROR: ${data.error}`, 502);
    }

    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err?.name === 'AbortError') {
      throw new AppError('SerpApi request timed out', 504);
    }
    logger.error('SerpApi network error', { message: err.message });
    throw new AppError(err.message || 'SerpApi request failed', 502);
  } finally {
    clearTimeout(timeout);
  }
}
