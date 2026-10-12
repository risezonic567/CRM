// Run: node --test src/integrations/pnr/pnrConverterAdapter.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGdsAirSegments } from './gdsParser.js';
import {
  adaptPnrConverterResponse,
  mergeLocalFields,
} from './pnrConverterAdapter.js';

const FIXED_NOW = new Date('2026-10-07T00:00:00Z');
const RAW = '5 CM 472 T 03NOV 6 PTYLAX HK1 1229 1735 03NOV E CM/BIDQUI';

const REAL_RESPONSE = {
  flightData: {
    names: [],
    flights: [
      {
        dep: {
          airportname: 'Tocumen Airport',
          cityname: 'Panama City',
          countryname: 'Panama',
          airportcode: 'PTY',
          timezone: 'America/Panama',
        },
        arr: {
          airportname: 'Los Angeles Intl Airport',
          cityname: '',
          countryname: 'United States',
          airportcode: 'LAX',
          timezone: 'America/Los_Angeles',
        },
        flt: {
          flightNo: '472',
          iatacode: 'CM',
          name: 'Copa Air',
          operated_by: 'Copa Air',
          cabin: 'Economy',
          class: 'T',
          aircraft: null,
          departure: {
            day: 'Tue',
            string: '2026-11-03 12:29',
            hr24: '12:29',
          },
          arrival: {
            day: 'Tue',
            string: '2026-11-03 17:35',
            hr24: '17:35',
          },
          transit_time: {},
          duration: { minutes: '6', hours: '8' },
          distance: { miles: 2984, km: 4803 },
          'svg-logo-high-res':
            'https://www.pnrconverter.com/images/airlines/cm.svg',
          'png-logo-low-res':
            'https://www.pnrconverter.com/images/airlines/png/150/cm.png',
        },
      },
    ],
    meta: { pnr: null },
  },
};

test('maps the real response into our segment shape', () => {
  const r = adaptPnrConverterResponse(REAL_RESPONSE, RAW);
  const s = r.segments[0];
  assert.equal(s.airlineCode, 'CM');
  assert.equal(s.flightNumber, '472');
  assert.equal(s.from, 'PTY');
  assert.equal(s.to, 'LAX');
  assert.equal(s.departureDate, '2026-11-03');
  assert.equal(s.departureTime, '12:29');
  assert.equal(s.arrivalTime, '17:35');
  assert.equal(s.departureAirport.name, 'Tocumen Airport');
  assert.equal(s.arrivalAirport.timezone, 'America/Los_Angeles');
  assert.equal(
    s.airlineLogo.png,
    'https://www.pnrconverter.com/images/airlines/png/150/cm.png'
  );
});

test('duration is hours*60 + minutes (8h06m = 486)', () => {
  const s = adaptPnrConverterResponse(REAL_RESPONSE, RAW).segments[0];
  assert.equal(s.durationMinutes, 486);
});

test('empty strings from the API become null', () => {
  const s = adaptPnrConverterResponse(REAL_RESPONSE, RAW).segments[0];
  assert.equal(s.arrivalAirport.city, null);
});

test('merge restores status, line number, locator from local parser', () => {
  const api = adaptPnrConverterResponse(REAL_RESPONSE, RAW);
  assert.equal(api.segments[0].status, null);
  const merged = mergeLocalFields(
    api,
    parseGdsAirSegments(RAW, { now: FIXED_NOW })
  );
  const s = merged.segments[0];
  assert.equal(s.status, 'HK1');
  assert.equal(s.lineNumber, 5);
  assert.equal(s.operatingInfo, 'CM/BIDQUI');
  assert.equal(s.equipmentOrSuffix, 'E');
  assert.equal(s.durationMinutes, 486);
});

test('merge keeps an XX warning', () => {
  const xx = RAW.replace('HK1', 'XX1');
  const merged = mergeLocalFields(
    adaptPnrConverterResponse(REAL_RESPONSE, xx),
    parseGdsAirSegments(xx, { now: FIXED_NOW })
  );
  assert.equal(merged.segments[0].status, 'XX1');
  assert.match(merged.warnings[0].reason, /XX/);
});
