/**
 * Inquiry quote currencies — agent picks one; amounts are entered in that currency (no FX).
 * Allowlist = ISO 4217 alphabetic codes commonly used in travel / payments.
 */

/** Shown first in the picker (travel desk favorites). */
export const POPULAR_INQUIRY_CURRENCIES = Object.freeze([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'NZD',
  'CHF',
  'INR',
  'AED',
  'SAR',
  'QAR',
  'JPY',
  'CNY',
  'HKD',
  'SGD',
  'THB',
  'MYR',
  'PHP',
  'IDR',
  'KRW',
  'ZAR',
  'MXN',
  'BRL',
  'TRY',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'ILS',
  'EGP',
  'PKR',
  'BDT',
  'LKR',
  'NPR',
  'KWD',
  'BHD',
  'OMR',
  'FJD',
  'VND',
  'TWD',
]);

/** Full inquiry allowlist (popular + broader ISO 4217 set). */
export const INQUIRY_CURRENCIES = Object.freeze([
  ...POPULAR_INQUIRY_CURRENCIES,
  'AFN',
  'ALL',
  'AMD',
  'AOA',
  'ARS',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BGN',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CDF',
  'CLP',
  'COP',
  'CRC',
  'CUP',
  'CVE',
  'DJF',
  'DOP',
  'DZD',
  'ERN',
  'ETB',
  'GEL',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HNL',
  'HTG',
  'IQD',
  'IRR',
  'ISK',
  'JMD',
  'JOD',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LRD',
  'LSL',
  'LYD',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'PAB',
  'PEN',
  'PGK',
  'PYG',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SBD',
  'SCR',
  'SDG',
  'SHP',
  'SLE',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SVC',
  'SYP',
  'SZL',
  'TJS',
  'TMT',
  'TND',
  'TOP',
  'TTD',
  'TZS',
  'UAH',
  'UGX',
  'UYU',
  'UZS',
  'VES',
  'VUV',
  'WST',
  'XAF',
  'XCD',
  'XOF',
  'XPF',
  'YER',
  'ZMW',
  'ZWL',
].filter((code, i, arr) => arr.indexOf(code) === i));

/** Short labels for picker / search (code always shown). */
export const CURRENCY_NAMES = Object.freeze({
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'Pound Sterling',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  NZD: 'New Zealand Dollar',
  CHF: 'Swiss Franc',
  INR: 'Indian Rupee',
  AED: 'UAE Dirham',
  SAR: 'Saudi Riyal',
  QAR: 'Qatari Riyal',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  HKD: 'Hong Kong Dollar',
  SGD: 'Singapore Dollar',
  THB: 'Thai Baht',
  MYR: 'Malaysian Ringgit',
  PHP: 'Philippine Peso',
  IDR: 'Indonesian Rupiah',
  KRW: 'South Korean Won',
  ZAR: 'South African Rand',
  MXN: 'Mexican Peso',
  BRL: 'Brazilian Real',
  TRY: 'Turkish Lira',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
  PLN: 'Polish Zloty',
  CZK: 'Czech Koruna',
  HUF: 'Hungarian Forint',
  ILS: 'Israeli Shekel',
  EGP: 'Egyptian Pound',
  PKR: 'Pakistani Rupee',
  BDT: 'Bangladeshi Taka',
  LKR: 'Sri Lankan Rupee',
  NPR: 'Nepalese Rupee',
  KWD: 'Kuwaiti Dinar',
  BHD: 'Bahraini Dinar',
  OMR: 'Omani Rial',
  FJD: 'Fiji Dollar',
  VND: 'Vietnamese Dong',
  TWD: 'New Taiwan Dollar',
});

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

/** Label for UI option / search match. */
export function currencyOptionLabel(code) {
  const name = CURRENCY_NAMES[code];
  return name ? `${code} — ${name}` : code;
}

/** Filter allowlist by code or known name (case-insensitive). */
export function filterInquiryCurrencies(query) {
  const q = String(query || '')
    .trim()
    .toUpperCase();
  if (!q) return INQUIRY_CURRENCIES;
  return INQUIRY_CURRENCIES.filter((code) => {
    if (code.includes(q)) return true;
    const name = (CURRENCY_NAMES[code] || '').toUpperCase();
    return name.includes(q);
  });
}
