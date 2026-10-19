import { CALL_DISPOSITIONS } from './dispositions';

/** Dispositions that open the short service authorize wizard (not booking, not blank). */
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

export function isBlankCallDisposition(value) {
  return value === 'blank_call';
}

export function dispositionLabel(value) {
  return (
    CALL_DISPOSITIONS.find((d) => d.value === value)?.label || value || ''
  );
}

/** Auth purpose fill, e.g. "flight changes service fee". */
export function servicePurposeLabel(disposition) {
  const label = dispositionLabel(disposition).trim();
  if (!label) return 'travel service fee';
  return `${label.toLowerCase()} service fee`;
}
