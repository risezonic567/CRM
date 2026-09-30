import config from '../../config/index.js';
import { AppError } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';

/**
 * POST Flight MCP search. Uses native fetch (Node 20+).
 * @returns {Promise<object>} parsed JSON body
 */
export async function postFlightSearch(body) {
  const { apiKey, url, timeoutMs } = config.flightmcp;

  if (!apiKey) {
    throw new AppError('FLIGHT_MCP_API_KEY is not configured', 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const code = data?.error?.code || 'FLIGHT_MCP_ERROR';
      const message =
        data?.error?.message || `Flight MCP request failed (${response.status})`;
      logger.error('Flight MCP search error', {
        status: response.status,
        code,
        message,
        requestId: data?.error?.requestId || data?.requestId,
      });
      const status =
        response.status >= 400 && response.status < 500 ? response.status : 502;
      throw new AppError(`${code}: ${message}`, status);
    }

    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err?.name === 'AbortError') {
      throw new AppError('Flight MCP request timed out', 504);
    }
    logger.error('Flight MCP network error', { message: err.message });
    throw new AppError(err.message || 'Flight MCP request failed', 502);
  } finally {
    clearTimeout(timeout);
  }
}
