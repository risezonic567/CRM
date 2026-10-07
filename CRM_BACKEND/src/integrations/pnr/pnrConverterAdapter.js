/**
 * Thin wrapper around the official PNR Converter HTTP API
 * (https://www.pnrconverter.com/api-introduction), normalized to the SAME
 * JSON shape as parseGdsAirSegments().
 *
 * FUTURE (when API key + sample response available):
 * 1. buildAuthHeaders() — replace placeholder header name(s)
 * 2. fetchFromPnrConverter body field — confirm `pnr` vs docs
 * 3. adaptPnrConverterResponse() — map real field names
 * See docs/PNR_AUTHORIZE_FLOW.md
 */

import { parseGdsAirSegments } from './gdsParser.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

function buildAuthHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    // TODO: confirm exact header name(s) from PNR Converter dashboard (often 3 values)
    'X-API-Key': apiKey,
  };
}

export function adaptPnrConverterResponse(externalJson, rawText) {
  const rawSegments = Array.isArray(externalJson?.segments)
    ? externalJson.segments
    : Array.isArray(externalJson?.flights)
      ? externalJson.flights
      : [];

  const segments = rawSegments.map((s, index) => ({
    lineNumber: s.lineNumber ?? s.line ?? index + 1,
    airlineCode: s.airlineCode ?? s.carrier ?? s.marketingCarrier ?? null,
    airlineName: s.airlineName ?? s.carrierName ?? null,
    flightNumber: String(s.flightNumber ?? s.flight ?? ''),
    bookingClass: s.bookingClass ?? s.class ?? null,
    departureDate: s.departureDate ?? s.depDate ?? null,
    dayOfWeek: s.dayOfWeek ?? null,
    from: s.from ?? s.origin ?? s.departureAirport ?? null,
    to: s.to ?? s.destination ?? s.arrivalAirport ?? null,
    status: s.status ?? null,
    departureTime: s.departureTime ?? s.depTime ?? null,
    arrivalTime: s.arrivalTime ?? s.arrTime ?? null,
    arrivalDate: s.arrivalDate ?? s.arrDate ?? null,
    arrivalDayOfWeek: s.arrivalDayOfWeek ?? null,
    equipmentOrSuffix: s.equipment ?? s.suffix ?? null,
    operatingInfo: s.operatingInfo ?? s.operatedBy ?? null,
    durationMinutes:
      s.durationMinutes ?? s.duration ?? s.flightDurationMinutes ?? null,
    logoUrl:
      s['svg-logo-high-res'] ??
      s.svgLogoHighRes ??
      s['png-logo-low-res'] ??
      s.logo ??
      null,
  }));

  const origin = segments[0]?.from ?? null;
  const destination = segments.length
    ? segments[segments.length - 1].to
    : null;

  let returnDate = null;
  if (origin && segments.length > 1) {
    for (let i = segments.length - 1; i >= 1; i -= 1) {
      if (segments[i].to === origin) {
        returnDate = segments[i].departureDate;
        break;
      }
    }
  }

  return {
    rawText,
    segments,
    tripSummary: {
      origin,
      destination,
      departureDate: segments[0]?.departureDate ?? null,
      returnDate,
      segmentCount: segments.length,
    },
    warnings: [],
    source: 'pnr-converter-api',
  };
}

export async function fetchFromPnrConverter(
  rawText,
  { apiKey, baseUrl, fetchImpl = fetch } = {}
) {
  if (!apiKey) throw new Error('PNR_CONVERTER_API_KEY is not set.');
  const url = baseUrl || 'https://api.pnrconverter.com/api';

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: buildAuthHeaders(apiKey),
    // TODO: confirm exact request body field name from API docs
    body: JSON.stringify({ pnr: rawText }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(
      `PNR Converter API error ${response.status}: ${bodyText}`
    );
  }

  const json = await response.json();
  return adaptPnrConverterResponse(json, rawText);
}

/**
 * CRM should call this only. API when keyed; else local parser.
 */
export async function getItinerary(rawText) {
  const apiKey = config.pnrConverter?.apiKey;
  const baseUrl = config.pnrConverter?.baseUrl;

  if (apiKey) {
    try {
      return await fetchFromPnrConverter(rawText, { apiKey, baseUrl });
    } catch (err) {
      logger.warn('PNR Converter API failed — using local parser', {
        message: err.message,
      });
    }
  }

  const local = parseGdsAirSegments(rawText);
  return { ...local, source: 'local-parser' };
}

export default getItinerary;
