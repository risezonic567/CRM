/**
 * Pax grand total = costPrice + markup (what customer pays).
 * Merchant fee is auto-calculated for staff CRM only — does NOT reduce pax total.
 */
export function calculatePricing({
  costPrice,
  markup,
  merchantFeePercent,
  currency = 'USD',
}) {
  const cost = round2(Number(costPrice));
  const agencyFee = round2(Number(markup));
  const feePercent = Number(merchantFeePercent);

  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error('Invalid costPrice');
  }
  if (!Number.isFinite(agencyFee) || agencyFee < 0) {
    throw new Error('Invalid markup');
  }
  if (!Number.isFinite(feePercent) || feePercent < 0) {
    throw new Error('Invalid merchantFeePercent');
  }

  const subtotal = round2(cost + agencyFee);
  const merchantFee = round2((subtotal * feePercent) / 100);
  const sellingPrice = subtotal; // pax pays cost + markup

  return {
    costPrice: cost,
    markup: agencyFee,
    merchantFee,
    merchantFeePercent: feePercent,
    sellingPrice,
    currency,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default calculatePricing;
