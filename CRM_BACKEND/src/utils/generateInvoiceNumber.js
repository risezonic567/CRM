import { Inquiry } from '../models/index.js';

/**
 * Customer-facing invoice number: INV-YYYY-####
 * Separate from internal inquiryReference (INQ-YYYY-####).
 */
export async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await Inquiry.findOne({
    invoiceNumber: new RegExp(`^${prefix}`),
  })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber')
    .lean();

  let next = 1;
  if (latest?.invoiceNumber) {
    const part = latest.invoiceNumber.split('-').pop();
    const num = parseInt(part, 10);
    if (!Number.isNaN(num)) next = num + 1;
  }

  return `${prefix}${String(next).padStart(4, '0')}`;
}

export default generateInvoiceNumber;
