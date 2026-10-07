/**
 * Persistable billing fields only. CVV must never be stored.
 */
export function sanitizeBilling(billing = {}) {
  const src = billing && typeof billing === 'object' ? billing : {};
  const last4 = String(src.last4 || '')
    .replace(/\D/g, '')
    .slice(-4);

  return {
    phone: String(src.phone || '').trim(),
    address: String(src.address || '').trim(),
    state: String(src.state || '').trim(),
    zip: String(src.zip || '').trim(),
    country: String(src.country || '').trim(),
    cardType: String(src.cardType || '').trim(),
    cardholderName: String(src.cardholderName || '').trim(),
    last4,
    expiryMonth: String(src.expiryMonth || '').trim(),
    expiryYear: String(src.expiryYear || '').trim(),
  };
}

export default sanitizeBilling;
