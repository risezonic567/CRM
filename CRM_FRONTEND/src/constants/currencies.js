/** Inquiry quote currencies — agent picks one; amounts are entered in that currency (no FX). */
export const INQUIRY_CURRENCIES = Object.freeze(['USD', 'EUR']);

export const DEFAULT_INQUIRY_CURRENCY = 'USD';

/**
 * Normalize to an allowed currency.
 * Invalid / empty → DEFAULT_INQUIRY_CURRENCY (env/agency default is applied elsewhere as seed only).
 */
export function normalizeInquiryCurrency(value) {
  const code = String(value || '')
    .trim()
    .toUpperCase();
  return INQUIRY_CURRENCIES.includes(code)
    ? code
    : DEFAULT_INQUIRY_CURRENCY;
}
