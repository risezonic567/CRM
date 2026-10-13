/** Digits only, max 10 — for controlled phone inputs. */
export function clampPhone10(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

/** Exactly 10 digits (spaces / dashes stripped). */
export function isValidPhone10(value) {
  return /^\d{10}$/.test(String(value || '').replace(/\D/g, ''));
}

export const PHONE_10_ERROR = 'Phone must be exactly 10 digits';
