/**
 * PNR Converter adapter — maps real flightData.flights[] shape into the SAME
 * segment JSON as parseGdsAirSegments(), then merges local GDS fields
 * (status, line number, locator) that the API does not return.
 *
 * Production: use official keyed API (PNR_CONVERTER_API_KEY). Do NOT call the
 * website browser endpoint as a substitute — auth/body may still need one
 * real keyed-API smoke test when the key is available.
 */

import {
  parseGdsAirSegments,
  buildTripSummary,
} from './gdsParser.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

const WEEKDAY_NUMBER = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** "2026-11-03 12:29" -> "2026-11-03" */
function datePart(timestampString) {
  return typeof timestampString === 'string' && timestampString.length >= 10
    ? timestampString.slice(0, 10)
    : null;
}

/**
 * API duration is { hours: "8", minutes: "6" } — minutes is REMAINDER (8h06m).
 * Total = hours * 60 + minutes.
 */
function toTotalMinutes(duration) {
  const hours = Number(duration?.hours);
  const minutes = Number(duration?.minutes);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

/** Empty API strings → null so UI does not show blank city. */
function mapAirport(a = {}) {
  return {
    name: a.airportname || null,
    city: a.cityname || null,
    country: a.countryname || null,
    timezone: a.timezone || null,
  };
}

/**
 * Map PNR Converter JSON → our segment shape.
 * Status / line / operatingInfo left null — filled by mergeLocalFields().
 */
export function adaptPnrConverterResponse(externalJson, rawText) {
  const flights = Array.isArray(externalJson?.flightData?.flights)
    ? externalJson.flightData.flights
    : [];

  const segments = flights.map((f) => {
    const dep = f.dep ?? {};
    const arr = f.arr ?? {};
    const flt = f.flt ?? {};
    const png = flt['png-logo-low-res'] ?? null;
    const svg = flt['svg-logo-high-res'] ?? null;

    return {
      lineNumber: null,
      airlineCode: flt.iatacode ?? null,
      airlineName: flt.name ?? null,
      flightNumber: flt.flightNo != null ? String(flt.flightNo) : null,
      bookingClass: flt.class ?? null,
      departureDate: datePart(flt.departure?.string),
      dayOfWeek: WEEKDAY_NUMBER[flt.departure?.day] ?? null,
      from: dep.airportcode ?? null,
      to: arr.airportcode ?? null,
      status: null,
      departureTime: flt.departure?.hr24 ?? null,
      arrivalTime: flt.arrival?.hr24 ?? null,
      arrivalDate: datePart(flt.arrival?.string),
      arrivalDayOfWeek: WEEKDAY_NUMBER[flt.arrival?.day] ?? null,
      equipmentOrSuffix: null,
      operatingInfo: null,
      durationMinutes: toTotalMinutes(flt.duration),
      // Backward-compatible single logo for mapPnrToOffer
      logoUrl: png || svg || null,
      departureAirport: mapAirport(dep),
      arrivalAirport: mapAirport(arr),
      operatedBy: flt.operated_by ?? null,
      cabin: flt.cabin ?? null,
      distanceKm: flt.distance?.km ?? null,
      airlineLogo: { svg, png },
    };
  });

  return {
    rawText: String(rawText || ''),
    segments,
    tripSummary: buildTripSummary(segments),
    warnings: [],
    source: 'pnr-converter-api',
  };
}

/**
 * API drops GDS status / line / locator; merge from local parse by route match.
 */
export function mergeLocalFields(apiResult, localResult) {
  const warnings = [...(apiResult.warnings || [])];

  if (apiResult.segments.length !== localResult.segments.length) {
    warnings.push({
      reason:
        'Segment count differs between API and local parser — GDS status, line numbers and record-locator info are unavailable for this itinerary.',
    });
    return {
      ...apiResult,
      warnings,
      source: 'pnr-converter-api+local',
    };
  }

  const segments = apiResult.segments.map((apiSeg, i) => {
    const local = localResult.segments[i];
    if (apiSeg.from !== local.from || apiSeg.to !== local.to) {
      warnings.push({
        lineNumber: local.lineNumber,
        reason: `Route mismatch (API ${apiSeg.from}-${apiSeg.to} vs local ${local.from}-${local.to}) — local fields not merged.`,
      });
      return apiSeg;
    }
    if (
      apiSeg.departureDate &&
      local.departureDate &&
      apiSeg.departureDate !== local.departureDate
    ) {
      warnings.push({
        lineNumber: local.lineNumber,
        reason: `Departure date differs (API ${apiSeg.departureDate} vs local ${local.departureDate}) — year inference disagrees, check the pasted text.`,
      });
    }
    return {
      ...apiSeg,
      lineNumber: local.lineNumber,
      flightNumber: local.flightNumber,
      bookingClass: local.bookingClass,
      dayOfWeek: local.dayOfWeek,
      status: local.status,
      equipmentOrSuffix: local.equipmentOrSuffix,
      operatingInfo: local.operatingInfo,
    };
  });

  for (const w of localResult.warnings || []) warnings.push(w);

  return {
    ...apiResult,
    segments,
    tripSummary: buildTripSummary(segments),
    warnings,
    source: 'pnr-converter-api+local',
  };
}

/**
 * Call keyed PNR Converter. Body form-urlencoded matches their public sample;
 * header name still TODO-confirm against dashboard when key is live.
 */
export async function fetchFromPnrConverter(
  rawText,
  { apiKey, baseUrl, fetchImpl = fetch } = {}
) {
  if (!apiKey) throw new Error('PNR_CONVERTER_API_KEY is not set.');
  const url = baseUrl || 'https://api.pnrconverter.com/api';

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      Accept: 'application/json',
      // TODO: confirm exact header name(s) from PNR Converter dashboard
      'X-API-Key': apiKey,
    },
    body: new URLSearchParams({ pnr: String(rawText || '') }).toString(),
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
 * CRM entrypoint: always parse locally; if key set, enrich from API and merge.
 */
export async function getItinerary(rawText, options = {}) {
  const { fetchImpl, now } = options;
  const local = parseGdsAirSegments(rawText, { now });

  const apiKey = config.pnrConverter?.apiKey;
  const baseUrl = config.pnrConverter?.baseUrl;

  if (apiKey) {
    try {
      const api = await fetchFromPnrConverter(rawText, {
        apiKey,
        baseUrl,
        fetchImpl,
      });
      if (api.segments.length > 0) {
        return mergeLocalFields(api, local);
      }
      logger.warn(
        'PNR Converter API returned 0 segments — using local parser'
      );
    } catch (err) {
      logger.warn('PNR Converter API failed — using local parser', {
        message: err.message,
      });
    }
  }

  return local;
}

export default getItinerary;
