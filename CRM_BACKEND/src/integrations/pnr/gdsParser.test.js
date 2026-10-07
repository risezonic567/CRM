// Run: node --test src/integrations/pnr/gdsParser.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGdsAirSegments } from './gdsParser.js';

const SAMPLE = `
2 NZ 456 H 26OCT 5 WLGAKL HK1 1945 2050 26OCT E NZ/W268NH
3 NZ 002 W 26OCT 5 AKLLAX HK1 2250 1500 26OCT E NZ/W268NH
4 CM 362 T 26OCT 5 LAXPTY HK1 2200 0637 27OCT E CM/BIDQUI
5 CM 472 T 03NOV 6 PTYLAX HK1 1229 1735 03NOV E CM/BIDQUI
6 NZ 005 W 03NOV 6 LAXAKL HK1 2240 0730 05NOV E NZ/W268NH
7 NZ 413 H 05NOV 1 AKLWLG HK1 0900 1005 05NOV E NZ/W268NH
`;

const FIXED_NOW = new Date('2026-10-07T00:00:00Z');

test('parses all 6 segments with correct field mapping', () => {
  const result = parseGdsAirSegments(SAMPLE, { now: FIXED_NOW });
  assert.equal(result.segments.length, 6);
  assert.equal(result.warnings.length, 0);

  const seg1 = result.segments[0];
  assert.equal(seg1.lineNumber, 2);
  assert.equal(seg1.airlineCode, 'NZ');
  assert.equal(seg1.airlineName, 'Air New Zealand');
  assert.equal(seg1.flightNumber, '456');
  assert.equal(seg1.bookingClass, 'H');
  assert.equal(seg1.departureDate, '2026-10-26');
  assert.equal(seg1.dayOfWeek, 5);
  assert.equal(seg1.from, 'WLG');
  assert.equal(seg1.to, 'AKL');
  assert.equal(seg1.status, 'HK1');
  assert.equal(seg1.departureTime, '19:45');
  assert.equal(seg1.arrivalTime, '20:50');
  assert.equal(seg1.arrivalDate, '2026-10-26');
  assert.equal(seg1.equipmentOrSuffix, 'E');
  assert.equal(seg1.operatingInfo, 'NZ/W268NH');
});

test('preserves leading-zero flight numbers as strings', () => {
  const result = parseGdsAirSegments(SAMPLE, { now: FIXED_NOW });
  assert.equal(result.segments[1].flightNumber, '002');
});

test('handles overnight + international-date-line arrivals correctly', () => {
  const result = parseGdsAirSegments(SAMPLE, { now: FIXED_NOW });
  const laxToAkl = result.segments[4];
  assert.equal(laxToAkl.departureDate, '2026-11-03');
  assert.equal(laxToAkl.arrivalDate, '2026-11-05');
});

test('computes tripSummary for a round trip', () => {
  const result = parseGdsAirSegments(SAMPLE, { now: FIXED_NOW });
  assert.deepEqual(result.tripSummary, {
    origin: 'WLG',
    destination: 'WLG',
    departureDate: '2026-10-26',
    returnDate: '2026-11-05',
    segmentCount: 6,
  });
});

test('ignores blank lines and reports malformed lines as warnings', () => {
  const messy = `${SAMPLE}\n\nTHIS IS NOT A VALID SEGMENT LINE\n`;
  const result = parseGdsAirSegments(messy, { now: FIXED_NOW });
  assert.equal(result.segments.length, 6);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0].reason, /Expected 13 fields/);
});

test('flags non-HK status as a warning without dropping the segment', () => {
  const xxLine = '2 NZ 456 H 26OCT 5 WLGAKL XX1 1945 2050 26OCT E NZ/W268NH';
  const result = parseGdsAirSegments(xxLine, { now: FIXED_NOW });
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].status, 'XX1');
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0].reason, /XX \(cancelled/);
});

test('rolls the year forward once the departure date has already passed', () => {
  const lateNow = new Date('2026-12-01T00:00:00Z');
  const line = '2 NZ 456 H 26OCT 5 WLGAKL HK1 1945 2050 26OCT E NZ/W268NH';
  const result = parseGdsAirSegments(line, { now: lateNow });
  assert.equal(result.segments[0].departureDate, '2027-10-26');
});

test('returns empty structure for blank input without throwing', () => {
  const result = parseGdsAirSegments('   \n\n  ', { now: FIXED_NOW });
  assert.deepEqual(result.segments, []);
  assert.deepEqual(result.tripSummary, {
    origin: null,
    destination: null,
    departureDate: null,
    returnDate: null,
    segmentCount: 0,
  });
});
