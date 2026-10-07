// Pure, network-free parser for Galileo/Sabre/Amadeus-style printed air-segment lines.
// Node 20 ESM. No dependencies.

const MONTHS = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const AIRLINE_NAMES = {
  NZ: 'Air New Zealand',
  CM: 'Copa Airlines',
  AA: 'American Airlines',
  DL: 'Delta Air Lines',
  UA: 'United Airlines',
  BA: 'British Airways',
  EK: 'Emirates',
  QF: 'Qantas',
  SQ: 'Singapore Airlines',
  LH: 'Lufthansa',
  AF: 'Air France',
  CX: 'Cathay Pacific',
  JL: 'Japan Airlines',
  NH: 'All Nippon Airways',
  QR: 'Qatar Airways',
  TG: 'Thai Airways',
  VA: 'Virgin Australia',
  VS: 'Virgin Atlantic',
  AC: 'Air Canada',
  IB: 'Iberia',
  KL: 'KLM',
  AY: 'Finnair',
  TK: 'Turkish Airlines',
  WN: 'Southwest Airlines',
  B6: 'JetBlue',
  AS: 'Alaska Airlines',
  AI: 'Air India',
  IN: 'IndiGo',
  UK: 'Vistara',
  SG: 'SpiceJet',
};

function parseDDMMM(token) {
  const match = /^(\d{2})([A-Z]{3})$/.exec(token);
  if (!match) return null;
  const day = Number(match[1]);
  const monthIndex = MONTHS[match[2]];
  if (monthIndex === undefined || day < 1 || day > 31) return null;
  return { day, monthIndex };
}

function formatISODate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function resolveDateOnOrAfter(day, monthIndex, anchor) {
  const anchorYear = anchor.getUTCFullYear();
  let candidate = new Date(Date.UTC(anchorYear, monthIndex, day));
  if (candidate.getTime() < anchor.getTime()) {
    candidate = new Date(Date.UTC(anchorYear + 1, monthIndex, day));
  }
  return candidate;
}

function formatTime(token) {
  if (!/^\d{4}$/.test(token)) return null;
  return `${token.slice(0, 2)}:${token.slice(2, 4)}`;
}

function tokenize(line) {
  return line.trim().split(/\s+/);
}

const STATUS_RE = /^([A-Z]{2})(\d{1,2})$/;
const ORIGIN_DEST_RE = /^([A-Z]{3})([A-Z]{3})$/;
const AIRLINE_CODE_RE = /^[A-Z0-9]{2}$/;
const FLIGHT_NUMBER_RE = /^\d{1,4}[A-Z]?$/;

function parseLine(rawLine, anchor) {
  const tokens = tokenize(rawLine);

  if (tokens.length !== 13) {
    return {
      error: `Expected 13 fields, found ${tokens.length}. Line: "${rawLine}"`,
    };
  }

  const [
    lineNumberTok,
    airlineCodeTok,
    flightNumberTok,
    bookingClassTok,
    depDateTok,
    dayOfWeekTok,
    originDestTok,
    statusTok,
    depTimeTok,
    arrTimeTok,
    arrDateTok,
    equipOrSuffixTok,
    operatingInfoTok,
  ] = tokens;

  const lineNumber = Number(lineNumberTok);
  if (!Number.isInteger(lineNumber)) {
    return { error: `Invalid line number "${lineNumberTok}" in: "${rawLine}"` };
  }
  if (!AIRLINE_CODE_RE.test(airlineCodeTok)) {
    return {
      error: `Invalid airline code "${airlineCodeTok}" in: "${rawLine}"`,
    };
  }
  if (!FLIGHT_NUMBER_RE.test(flightNumberTok)) {
    return {
      error: `Invalid flight number "${flightNumberTok}" in: "${rawLine}"`,
    };
  }

  const depParts = parseDDMMM(depDateTok);
  if (!depParts) {
    return {
      error: `Invalid departure date "${depDateTok}" in: "${rawLine}"`,
    };
  }

  const odMatch = ORIGIN_DEST_RE.exec(originDestTok);
  if (!odMatch) {
    return {
      error: `Invalid origin/destination block "${originDestTok}" in: "${rawLine}"`,
    };
  }
  const [, from, to] = odMatch;

  const dayOfWeek = /^[1-7]$/.test(dayOfWeekTok)
    ? Number(dayOfWeekTok)
    : null;
  const statusMatch = STATUS_RE.exec(statusTok);

  const departureDateObj = resolveDateOnOrAfter(
    depParts.day,
    depParts.monthIndex,
    anchor
  );
  const departureDate = formatISODate(departureDateObj);

  const arrParts = parseDDMMM(arrDateTok);
  let arrivalDate = null;
  let arrivalDateObj = departureDateObj;
  if (arrParts) {
    arrivalDateObj = resolveDateOnOrAfter(
      arrParts.day,
      arrParts.monthIndex,
      departureDateObj
    );
    arrivalDate = formatISODate(arrivalDateObj);
  }

  const departureTime = formatTime(depTimeTok);
  const arrivalTime = formatTime(arrTimeTok);

  const segment = {
    lineNumber,
    airlineCode: airlineCodeTok,
    airlineName: AIRLINE_NAMES[airlineCodeTok] || null,
    flightNumber: flightNumberTok,
    bookingClass: bookingClassTok,
    departureDate,
    dayOfWeek,
    from,
    to,
    status: statusTok,
    departureTime,
    arrivalTime,
    arrivalDate,
    arrivalDayOfWeek: null,
    equipmentOrSuffix: equipOrSuffixTok,
    operatingInfo: operatingInfoTok,
    durationMinutes: null,
  };

  const warnings = [];
  if (!statusMatch) {
    warnings.push(
      `Unrecognized status code "${statusTok}" — passed through as-is.`
    );
  } else if (statusMatch[1] === 'XX') {
    warnings.push(
      'Status is XX (cancelled/unconfirmed segment) — verify before quoting.'
    );
  } else if (statusMatch[1] !== 'HK') {
    warnings.push(
      `Status "${statusMatch[1]}" is not HK (confirmed) — needs agent review.`
    );
  }
  if (!departureTime) warnings.push('Missing or malformed departure time.');
  if (!arrivalTime) warnings.push('Missing or malformed arrival time.');

  return { segment, nextAnchor: arrivalDateObj, warnings };
}

/**
 * Parse pasted GDS air-segment lines into a structured itinerary.
 * @param {string} rawText
 * @param {{ now?: Date }} [options]
 */
export function parseGdsAirSegments(rawText, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  let anchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const lines = String(rawText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const segments = [];
  const warnings = [];

  for (const line of lines) {
    const result = parseLine(line, anchor);
    if (result.error) {
      warnings.push({ line, reason: result.error });
      continue;
    }
    segments.push(result.segment);
    anchor = result.nextAnchor;
    for (const w of result.warnings) {
      warnings.push({ lineNumber: result.segment.lineNumber, reason: w });
    }
  }

  const origin = segments[0]?.from ?? null;
  const destination = segments.length
    ? segments[segments.length - 1].to
    : null;
  const departureDate = segments[0]?.departureDate ?? null;

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
    rawText: String(rawText || ''),
    segments,
    tripSummary: {
      origin,
      destination,
      departureDate,
      returnDate,
      segmentCount: segments.length,
    },
    warnings,
    source: 'local-parser',
  };
}

export {
  parseLine,
  parseDDMMM,
  resolveDateOnOrAfter,
  formatISODate,
  formatTime,
  MONTHS,
  AIRLINE_NAMES,
};

export default parseGdsAirSegments;
