import { normalizeOfferList } from '../duffel/duffel.normalizer.js';

/**
 * Offline mock offers for local development without Duffel key.
 */
export function getMockFlights({ from, to, departureDate, passengers, cabinClass }) {
  const depDate = departureDate || new Date().toISOString().slice(0, 10);
  const baseOffers = [
    {
      id: 'off_mock_1',
      total_amount: '200.00',
      total_currency: 'USD',
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      owner: {
        name: 'Mock Air',
        iata_code: 'MA',
        logo_symbol_url: '',
      },
      slices: [
        {
          duration: 'PT5H30M',
          segments: [
            {
              departing_at: `${depDate}T08:00:00`,
              arriving_at: `${depDate}T13:30:00`,
              origin: { iata_code: from.toUpperCase(), city_name: from },
              destination: { iata_code: to.toUpperCase(), city_name: to },
              marketing_carrier: { name: 'Mock Air', iata_code: 'MA' },
              marketing_carrier_flight_number: '101',
              passengers: [{ cabin_class: cabinClass || 'economy' }],
            },
          ],
        },
      ],
    },
    {
      id: 'off_mock_2',
      total_amount: '320.00',
      total_currency: 'USD',
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      owner: {
        name: 'Sky Demo',
        iata_code: 'SD',
        logo_symbol_url: '',
      },
      slices: [
        {
          duration: 'PT7H15M',
          segments: [
            {
              departing_at: `${depDate}T10:15:00`,
              arriving_at: `${depDate}T14:00:00`,
              origin: { iata_code: from.toUpperCase(), city_name: from },
              destination: { iata_code: 'JFK', city_name: 'New York' },
              marketing_carrier: { name: 'Sky Demo', iata_code: 'SD' },
              marketing_carrier_flight_number: '220',
              passengers: [{ cabin_class: cabinClass || 'economy' }],
            },
            {
              departing_at: `${depDate}T15:30:00`,
              arriving_at: `${depDate}T17:30:00`,
              origin: { iata_code: 'JFK', city_name: 'New York' },
              destination: { iata_code: to.toUpperCase(), city_name: to },
              marketing_carrier: { name: 'Sky Demo', iata_code: 'SD' },
              marketing_carrier_flight_number: '221',
              passengers: [{ cabin_class: cabinClass || 'economy' }],
            },
          ],
        },
      ],
    },
  ];

  return {
    requestId: 'orq_mock_local',
    offers: normalizeOfferList(baseOffers),
    source: 'mock',
    meta: {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      departureDate: depDate,
      passengers,
      cabinClass,
      offerCount: baseOffers.length,
    },
  };
}
