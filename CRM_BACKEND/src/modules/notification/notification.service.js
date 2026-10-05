import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import { sendMail } from '../../integrations/nodemailer/nodemailer.client.js';
import { NotificationLog } from '../../models/index.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.resolve(__dirname, '../../templates');

export async function renderTemplate(name, data) {
  const file = path.join(templatesDir, name);
  // async:true makes include() return Promises → "[object Promise]" in email HTML
  return ejs.renderFile(file, data);
}

/**
 * Fire-and-forget friendly — caller should not await for API latency.
 */
export async function queueInquiryEmail({ inquiry, agency, confirmUrl }) {
  const to = inquiry.customer.email;
  const subject = `Your Flight Inquiry — ${inquiry.travel.from} to ${inquiry.travel.to}`;

  try {
    const html = await renderTemplate('inquiryEmail.ejs', {
      agency,
      inquiry,
      confirmUrl,
      grandTotal: inquiry.pricing.sellingPrice,
      currency: inquiry.pricing.currency,
    });

    const info = await sendMail({ to, subject, html });

    await NotificationLog.create({
      type: 'email',
      to,
      subject,
      status: 'sent',
      relatedTo: { model: 'Inquiry', id: inquiry._id },
      messageId: info.messageId || '',
      agencyId: inquiry.agencyId,
    });
  } catch (err) {
    logger.error('Failed to send inquiry email', { message: err.message, to });
    await NotificationLog.create({
      type: 'email',
      to,
      subject,
      status: 'failed',
      relatedTo: { model: 'Inquiry', id: inquiry._id },
      error: err.message,
      agencyId: inquiry.agencyId,
    });
    throw err;
  }
}

/**
 * Confirmation receipt email — sent after customer confirms (and on agent resend).
 */
export async function queueConfirmationEmail({ inquiry, agency }) {
  const to = inquiry.customer.email;
  const subject = `Confirmed — ${inquiry.inquiryReference} · ${inquiry.travel.from} to ${inquiry.travel.to}`;

  try {
    const html = await renderTemplate('confirmationEmail.ejs', {
      agency,
      inquiry,
      grandTotal: inquiry.pricing.sellingPrice,
      currency: inquiry.pricing.currency,
    });

    const info = await sendMail({ to, subject, html });

    await NotificationLog.create({
      type: 'email',
      to,
      subject,
      status: 'sent',
      relatedTo: { model: 'Inquiry', id: inquiry._id },
      messageId: info.messageId || '',
      agencyId: inquiry.agencyId,
    });
  } catch (err) {
    logger.error('Failed to send confirmation email', {
      message: err.message,
      to,
    });
    await NotificationLog.create({
      type: 'email',
      to,
      subject,
      status: 'failed',
      relatedTo: { model: 'Inquiry', id: inquiry._id },
      error: err.message,
      agencyId: inquiry.agencyId,
    });
    throw err;
  }
}
