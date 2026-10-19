import { CALL_DISPOSITIONS } from '../config/constants.js';

/** Keep in sync with CRM_FRONTEND/src/constants/serviceDispositions.js */
export const SERVICE_DISPOSITIONS = Object.freeze([
  'flight_changes',
  'cancellation',
  'name_correction',
  'pet_query',
  'document_query',
  'airport_query',
  'car_rental',
  'hotel',
  'others',
]);

export function isServiceDisposition(value) {
  return SERVICE_DISPOSITIONS.includes(value);
}

const LABELS = Object.freeze({
  new_booking: 'New booking',
  flight_changes: 'Flight changes',
  cancellation: 'Cancellation',
  name_correction: 'Name correction',
  pet_query: 'Pet Query',
  document_query: 'Document Query',
  blank_call: 'Blank call',
  airport_query: 'Airport Query',
  car_rental: 'Car rental',
  hotel: 'Hotel',
  others: 'Others',
});

export function dispositionLabel(value) {
  if (LABELS[value]) return LABELS[value];
  if (CALL_DISPOSITIONS.includes(value)) return value;
  return String(value || '');
}

export function servicePurposeLabel(disposition) {
  const label = dispositionLabel(disposition).trim();
  if (!label) return 'travel service fee';
  return `${label.toLowerCase()} service fee`;
}
