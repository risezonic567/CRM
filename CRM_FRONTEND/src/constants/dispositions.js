export const CALL_DISPOSITIONS = [
  { value: 'new_booking', label: 'New booking' },
  { value: 'flight_changes', label: 'Flight changes' },
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'name_correction', label: 'Name correction' },
  { value: 'pet_query', label: 'Pet Query' },
  { value: 'document_query', label: 'Document Query' },
  { value: 'blank_call', label: 'Blank call' },
  { value: 'airport_query', label: 'Airport Query' },
  { value: 'car_rental', label: 'Car rental' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'others', label: 'Others' },
];

export const INQUIRY_STATUSES = {
  draft: 'Draft',
  searching: 'Searching',
  selected: 'Selected',
  preview_sent: 'Preview sent',
  authorized: 'Authorized',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const CABIN_CLASSES = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
];

export const PASSENGER_TYPES = ['adult', 'child', 'infant', 'senior'];

export const CLOSE_SOURCES = {
  WAITING_MODAL: 'waiting_modal',
  DETAIL_PAGE: 'detail_page',
};
