import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import config from '../../config/index.js';
import { sendMail } from '../../integrations/nodemailer/nodemailer.client.js';
import { NotificationLog } from '../../models/index.js';
import logger from '../../utils/logger.js';
import {
  fillsFromInquiry,
  renderAuthorizationHtml,
} from '../../utils/buildAuthorizationText.js';
import { resolveSupportDocumentAbsolutePath } from '../../middlewares/authorizeUpload.middleware.js';

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
  const subject = `Authorize your itinerary — ${inquiry.inquiryReference} · ${inquiry.travel.from} to ${inquiry.travel.to}`;

  try {
    const fills = fillsFromInquiry(inquiry, agency);
    const authorizationHtml = renderAuthorizationHtml(
      inquiry.authorizationText || '',
      fills
    );
    const html = await renderTemplate('inquiryEmail.ejs', {
      agency,
      inquiry,
      confirmUrl,
      grandTotal: inquiry.pricing.sellingPrice,
      currency: inquiry.pricing.currency,
      authorizationHtml,
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
 * Staff inbox: authorization packet (receipt-style) + support docs as attachments.
 * Uses supportDocsNotify.ejs — does not alter customer confirmationEmail.
 * Never throws to caller (authorize must not fail).
 * Skips when SUPPORT_DOCS_NOTIFY_EMAIL is empty or no readable files.
 */
export async function queueSupportDocsNotifyEmail({ inquiry, agency, docs }) {
  const to = config.supportDocs.notifyEmail;
  if (!to) return;

  const list = Array.isArray(docs) ? docs.filter((d) => d?.relativePath) : [];
  if (!list.length) return;

  const ref = inquiry?.inquiryReference || String(inquiry?._id || '');
  const route =
    inquiry?.travel?.from && inquiry?.travel?.to
      ? `${inquiry.travel.from} to ${inquiry.travel.to}`
      : '';
  const subject = route
    ? `Authorized packet — ${ref} · ${route}`
    : `Authorized packet — ${ref}`;

  const attachments = [];
  const attachedDocs = [];
  const usedNames = new Set();

  for (const doc of list) {
    let abs;
    try {
      abs = resolveSupportDocumentAbsolutePath(doc.relativePath);
    } catch {
      continue;
    }
    if (!abs || !fs.existsSync(abs)) continue;

    let filename =
      String(doc.originalName || doc.storedName || 'document').slice(0, 180) ||
      'document';
    if (usedNames.has(filename)) {
      const base = path.parse(filename);
      filename = `${base.name}-${attachments.length + 1}${base.ext || ''}`;
    }
    usedNames.add(filename);

    attachments.push({
      filename,
      path: abs,
      contentType: doc.mimeType || undefined,
    });
    attachedDocs.push({
      label: doc.label || '',
      originalName: doc.originalName || filename,
      filename,
      role: doc.role || '',
    });
  }

  if (!attachments.length) {
    logger.warn('Support docs notify skipped — no files on disk', { ref, to });
    return;
  }

  try {
    const fills = fillsFromInquiry(inquiry, agency);
    const authorizationHtml = renderAuthorizationHtml(
      inquiry.authorizationText || '',
      fills
    );
    const html = await renderTemplate('supportDocsNotify.ejs', {
      agency,
      inquiry,
      grandTotal: inquiry.pricing?.sellingPrice,
      currency: inquiry.pricing?.currency || 'USD',
      authorizationHtml,
      attachedDocs,
      attachmentCount: attachments.length,
    });

    const info = await sendMail({ to, subject, html, attachments });
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
    logger.error('Failed to send support docs notify email', {
      message: err.message,
      to,
      ref,
    });
    try {
      await NotificationLog.create({
        type: 'email',
        to,
        subject,
        status: 'failed',
        relatedTo: { model: 'Inquiry', id: inquiry._id },
        error: err.message,
        agencyId: inquiry.agencyId,
      });
    } catch {
      // ignore log write failure
    }
    // do not rethrow — authorize path must stay unaffected
  }
}

/**
 * Authorization receipt email — agent resend / download packet only (not auto on authorize).
 */
export async function queueConfirmationEmail({ inquiry, agency }) {
  const to = inquiry.customer.email;
  const subject = `Authorized — ${inquiry.inquiryReference} · ${inquiry.travel.from} to ${inquiry.travel.to}`;

  try {
    const fills = fillsFromInquiry(inquiry, agency);
    const authorizationHtml = renderAuthorizationHtml(
      inquiry.authorizationText || '',
      fills
    );
    const html = await renderTemplate('confirmationEmail.ejs', {
      agency,
      inquiry,
      grandTotal: inquiry.pricing.sellingPrice,
      currency: inquiry.pricing.currency,
      authorizationHtml,
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
