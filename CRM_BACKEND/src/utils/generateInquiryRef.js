import { Inquiry } from '../models/index.js';

/**
 * Generates unique inquiry reference: INQ-YYYY-####
 */
export async function generateInquiryRef() {
  const year = new Date().getFullYear();
  const prefix = `INQ-${year}-`;

  const latest = await Inquiry.findOne({
    inquiryReference: new RegExp(`^${prefix}`),
  })
    .sort({ inquiryReference: -1 })
    .select('inquiryReference')
    .lean();

  let next = 1;
  if (latest?.inquiryReference) {
    const part = latest.inquiryReference.split('-').pop();
    const num = parseInt(part, 10);
    if (!Number.isNaN(num)) next = num + 1;
  }

  return `${prefix}${String(next).padStart(4, '0')}`;
}

export default generateInquiryRef;
