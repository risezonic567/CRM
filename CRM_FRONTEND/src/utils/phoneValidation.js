/** Digits only, max 12 — for controlled phone inputs. */
export function clampPhone10(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 12);
}

/** Exactly 10 or 12 digits (spaces / dashes stripped). */
export function isValidPhone10(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^\d{10}$/.test(digits) || /^\d{12}$/.test(digits);
}

export const PHONE_10_ERROR = 'Phone must be 10 or 12 digits';
