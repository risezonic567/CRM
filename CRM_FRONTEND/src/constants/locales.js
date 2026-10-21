/**
 * Customer-facing (PAX) authorization email / confirm page languages.
 * Agent CRM stays English. Keep in sync with CRM_BACKEND CUSTOMER_LOCALES.
 */
export const CUSTOMER_LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'it', label: 'Italiano (Italian)' },
];

export const DEFAULT_CUSTOMER_LOCALE = 'en';

export function normalizeCustomerLocale(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return CUSTOMER_LOCALES.some((l) => l.value === v)
    ? v
    : DEFAULT_CUSTOMER_LOCALE;
}
