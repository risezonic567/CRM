import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CUSTOMER_LOCALES,
  DEFAULT_CUSTOMER_LOCALE,
} from '../config/constants.js';
import {
  localizeAuthPurpose,
  renderAuthParagraph,
} from './authParagraphs.js';
import {
  fillsFromInquiry,
  renderAuthorizationHtml,
} from '../utils/buildAuthorizationText.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogsDir = path.join(__dirname, 'locales');

const catalogs = Object.create(null);
for (const loc of CUSTOMER_LOCALES) {
  const file = path.join(catalogsDir, `${loc}.json`);
  catalogs[loc] = JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function normalizeCustomerLocale(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return CUSTOMER_LOCALES.includes(v) ? v : DEFAULT_CUSTOMER_LOCALE;
}

export function resolveLocale(inquiryOrLocale) {
  if (typeof inquiryOrLocale === 'string') {
    return normalizeCustomerLocale(inquiryOrLocale);
  }
  return normalizeCustomerLocale(inquiryOrLocale?.customerLocale);
}

function lookup(catalog, keyPath) {
  const parts = String(keyPath || '').split('.');
  let cur = catalog;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(str, vars = {}) {
  return String(str).replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] == null ? '' : String(vars[k])
  );
}

/** Translate PAX UI string. Falls back to English then to key. */
export function t(key, locale, vars = {}) {
  const loc = normalizeCustomerLocale(locale);
  const raw =
    lookup(catalogs[loc], key) ??
    lookup(catalogs[DEFAULT_CUSTOMER_LOCALE], key) ??
    key;
  return interpolate(raw, vars);
}

export function makeT(locale) {
  const loc = normalizeCustomerLocale(locale);
  return (key, vars) => t(key, loc, vars);
}

/**
 * Plain auth text the customer sees.
 * en → stored authorizationText (agent-edited).
 * es/it → locale template × frozen fills (agent EN edits do not auto-translate).
 */
export function paxAuthorizationPlain(inquiry, agency, locale) {
  const loc = resolveLocale(locale ?? inquiry);
  const fills = fillsFromInquiry(inquiry, agency);
  if (loc === DEFAULT_CUSTOMER_LOCALE) {
    return (
      String(inquiry?.authorizationText || '').trim() ||
      renderAuthParagraph(loc, fills)
    );
  }
  return renderAuthParagraph(loc, fills);
}

export function paxAuthorizationHtml(inquiry, agency, locale) {
  const loc = resolveLocale(locale ?? inquiry);
  const fills = fillsFromInquiry(inquiry, agency);
  const plain = paxAuthorizationPlain(inquiry, agency, loc);
  // Underline slots as they appear in PAX text (purpose may be localized)
  const underlineFills = {
    ...fills,
    purpose: localizeAuthPurpose(fills.purpose, loc),
  };
  return renderAuthorizationHtml(plain, underlineFills);
}

/** Locals shared by all PAX EJS templates. */
export function paxTemplateLocals(inquiry, extra = {}) {
  const locale = resolveLocale(inquiry);
  const translate = makeT(locale);
  return {
    locale,
    htmlLang: translate('htmlLang') || locale,
    t: translate,
    // EJS treats ".es"/".it" as an extension and will NOT append ".ejs"
    // unless the path already ends with ".ejs" — so include must be explicit.
    termsPartial:
      locale === 'es'
        ? 'partials/gotoflyerTerms.es.ejs'
        : locale === 'it'
          ? 'partials/gotoflyerTerms.it.ejs'
          : 'partials/gotoflyerTerms',
    ...extra,
  };
}

export { CUSTOMER_LOCALES, DEFAULT_CUSTOMER_LOCALE };
