export const ROLES = Object.freeze({
  ADMIN: 'admin',
  AGENT: 'agent',
  VIEWER: 'viewer',
});

export const CALL_DISPOSITIONS = Object.freeze([
  'new_booking',
  'flight_changes',
  'cancellation',
  'name_correction',
  'pet_query',
  'document_query',
  'blank_call',
  'airport_query',
  'car_rental',
  'hotel',
  'others',
]);

export const INQUIRY_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SEARCHING: 'searching',
  SELECTED: 'selected',
  PREVIEW_SENT: 'preview_sent',
  CUSTOMER_CONFIRMED: 'customer_confirmed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

export const PASSENGER_TYPES = Object.freeze([
  'adult',
  'child',
  'infant',
  'senior',
]);

export const CABIN_CLASSES = Object.freeze([
  'economy',
  'premium_economy',
  'business',
  'first',
]);

export const CLOSE_SOURCES = Object.freeze({
  WAITING_MODAL: 'waiting_modal',
  DETAIL_PAGE: 'detail_page',
});
