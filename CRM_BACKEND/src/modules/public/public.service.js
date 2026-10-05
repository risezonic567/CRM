import { Inquiry, Agency } from '../../models/index.js';
import { verifyPublicToken } from '../../utils/signPublicToken.js';
import { AppError } from '../../utils/apiResponse.js';
import { INQUIRY_STATUSES } from '../../config/constants.js';
import { getIO } from '../../socket/socket.js';
import {
  renderTemplate,
  queueConfirmationEmail,
} from '../notification/notification.service.js';
import { parseClientMeta } from '../../utils/clientMeta.js';

export async function loadConfirmPage(inquiryId, token) {
  const { inquiry, agency } = await verifyAndLoad(inquiryId, token);

  if (inquiry.status === INQUIRY_STATUSES.CUSTOMER_CONFIRMED) {
    return {
      alreadyConfirmed: true,
      html: await renderTemplate('thankYou.ejs', { inquiry, agency }),
    };
  }

  if (inquiry.status === INQUIRY_STATUSES.CANCELLED) {
    throw new AppError('This inquiry is no longer available', 410);
  }

  if (inquiry.status !== INQUIRY_STATUSES.PREVIEW_SENT) {
    throw new AppError('Inquiry is not awaiting confirmation', 400);
  }

  const html = await renderTemplate('confirmPage.ejs', {
    inquiry,
    agency,
    token,
    error: null,
  });

  return { alreadyConfirmed: false, html };
}

/**
 * Idempotent confirm: first wins; second click still shows thank-you.
 */
export async function confirmInquiry(inquiryId, { token, agreed }, meta) {
  if (agreed !== true && agreed !== 'true') {
    throw new AppError('You must agree to the terms to confirm', 400);
  }

  const { inquiry, agency, decoded } = await verifyAndLoad(inquiryId, token);

  if (inquiry.status === INQUIRY_STATUSES.CUSTOMER_CONFIRMED) {
    const html = await renderTemplate('thankYou.ejs', { inquiry, agency });
    return { html, alreadyConfirmed: true };
  }

  if (inquiry.status === INQUIRY_STATUSES.CANCELLED) {
    throw new AppError('This inquiry was closed by the agency', 410);
  }

  if (inquiry.status !== INQUIRY_STATUSES.PREVIEW_SENT) {
    throw new AppError('Inquiry is not awaiting confirmation', 400);
  }

  const userAgent = meta.userAgent || '';
  const parsed = parseClientMeta(userAgent);

  // Atomic update — only one request can flip from preview_sent
  const updated = await Inquiry.findOneAndUpdate(
    {
      _id: inquiry._id,
      status: INQUIRY_STATUSES.PREVIEW_SENT,
      publicTokenJti: decoded.jti,
    },
    {
      $set: {
        status: INQUIRY_STATUSES.CUSTOMER_CONFIRMED,
        confirmedAt: new Date(),
        agreement: {
          agreedAt: new Date(),
          agreedIp: meta.ip || '',
          agreedUserAgent: userAgent,
          browser: parsed.browser,
          os: parsed.os,
          deviceType: parsed.deviceType,
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    // Race: another request confirmed first
    const current = await Inquiry.findById(inquiry._id);
    if (current?.status === INQUIRY_STATUSES.CUSTOMER_CONFIRMED) {
      const html = await renderTemplate('thankYou.ejs', {
        inquiry: current,
        agency,
      });
      return { html, alreadyConfirmed: true };
    }
    throw new AppError('Unable to confirm inquiry', 409);
  }

  // Emit AFTER DB write
  try {
    const io = getIO();
    io.to(`inquiry_${updated._id}`).emit('inquiry:confirmed', {
      inquiryId: updated._id.toString(),
      inquiryReference: updated.inquiryReference,
      status: updated.status,
      confirmedAt: updated.confirmedAt,
    });
  } catch {
    // ignore if socket not ready
  }

  // Fire-and-forget confirmation receipt — do not block thank-you page
  queueConfirmationEmail({ inquiry: updated, agency }).catch(() => {});

  const html = await renderTemplate('thankYou.ejs', {
    inquiry: updated,
    agency,
  });

  return { html, alreadyConfirmed: false };
}

async function verifyAndLoad(inquiryId, token) {
  if (!token) throw new AppError('Token required', 401);

  let decoded;
  try {
    decoded = verifyPublicToken(token);
  } catch {
    throw new AppError('Invalid or expired confirmation link', 401);
  }

  if (decoded.inquiryId !== inquiryId) {
    throw new AppError('Token does not match inquiry', 401);
  }

  const inquiry = await Inquiry.findById(inquiryId).select('+publicTokenJti');
  if (!inquiry) throw new AppError('Inquiry not found', 404);

  if (inquiry.publicTokenJti && inquiry.publicTokenJti !== decoded.jti) {
    throw new AppError('Confirmation link is no longer valid', 401);
  }

  const agency = await Agency.findById(inquiry.agencyId);
  return { inquiry, agency, decoded };
}
