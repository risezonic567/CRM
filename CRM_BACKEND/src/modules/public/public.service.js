import { Inquiry, Agency } from '../../models/index.js';
import { verifyPublicToken } from '../../utils/signPublicToken.js';
import { AppError } from '../../utils/apiResponse.js';
import { INQUIRY_STATUSES } from '../../config/constants.js';
import { getIO } from '../../socket/socket.js';
import { renderTemplate } from '../notification/notification.service.js';
import { parseClientMeta } from '../../utils/clientMeta.js';
import {
  fillsFromInquiry,
  renderAuthorizationHtml,
} from '../../utils/buildAuthorizationText.js';
import { buildDocSlots } from '../../utils/supportDocuments.js';

function authorizationLocals(inquiry, agency) {
  const fills = fillsFromInquiry(inquiry, agency);
  return {
    authorizationHtml: renderAuthorizationHtml(
      inquiry.authorizationText || '',
      fills
    ),
    docSlots: buildDocSlots(inquiry),
  };
}

export async function loadConfirmPage(inquiryId, token) {
  const { inquiry, agency } = await verifyAndLoad(inquiryId, token);

  if (inquiry.status === INQUIRY_STATUSES.AUTHORIZED) {
    return {
      alreadyConfirmed: true,
      html: await renderTemplate('thankYou.ejs', { inquiry, agency }),
    };
  }

  if (inquiry.status === INQUIRY_STATUSES.CANCELLED) {
    throw new AppError('This inquiry is no longer available', 410);
  }

  if (inquiry.status !== INQUIRY_STATUSES.PREVIEW_SENT) {
    throw new AppError('Inquiry is not awaiting authorization', 400);
  }

  const html = await renderTemplate('confirmPage.ejs', {
    inquiry,
    agency,
    token,
    error: null,
    ...authorizationLocals(inquiry, agency),
  });

  return { alreadyConfirmed: false, html };
}

/**
 * Idempotent authorize: first wins; second click still shows thank-you.
 * No checkbox — POST with valid token is the authorization action.
 * Does NOT send an automatic confirmation/receipt email — agent downloads or resends.
 */
/**
 * @param {{
 *   token: string,
 *   supportDocuments?: object[],
 *   supportDocument?: object|null
 * }} payload
 * @returns {{ html: string, alreadyConfirmed: boolean, savedDocuments: boolean }}
 */
export async function confirmInquiry(
  inquiryId,
  { token, supportDocuments, supportDocument },
  meta
) {
  const { inquiry, agency, decoded } = await verifyAndLoad(inquiryId, token);

  if (inquiry.status === INQUIRY_STATUSES.AUTHORIZED) {
    const html = await renderTemplate('thankYou.ejs', { inquiry, agency });
    return { html, alreadyConfirmed: true, savedDocuments: false };
  }

  if (inquiry.status === INQUIRY_STATUSES.CANCELLED) {
    throw new AppError('This inquiry was closed by the agency', 410);
  }

  if (inquiry.status !== INQUIRY_STATUSES.PREVIEW_SENT) {
    throw new AppError('Inquiry is not awaiting authorization', 400);
  }

  const userAgent = meta.userAgent || '';
  const parsed = parseClientMeta(userAgent);

  const docs = Array.isArray(supportDocuments)
    ? supportDocuments.filter((d) => d?.relativePath)
    : [];

  const $set = {
    status: INQUIRY_STATUSES.AUTHORIZED,
    confirmedAt: new Date(),
    agreement: {
      agreedAt: new Date(),
      agreedIp: meta.ip || '',
      agreedUserAgent: userAgent,
      browser: parsed.browser,
      os: parsed.os,
      deviceType: parsed.deviceType,
    },
  };

  if (docs.length) {
    $set.supportDocuments = docs;
  } else if (supportDocument?.relativePath) {
    // Legacy single-file path
    $set.supportDocument = supportDocument;
  }

  // Atomic update — only one request can flip from preview_sent
  const updated = await Inquiry.findOneAndUpdate(
    {
      _id: inquiry._id,
      status: INQUIRY_STATUSES.PREVIEW_SENT,
      publicTokenJti: decoded.jti,
    },
    { $set },
    { new: true }
  );

  if (!updated) {
    // Race: another request authorized first — caller should orphan-clean uploads
    const current = await Inquiry.findById(inquiry._id);
    if (current?.status === INQUIRY_STATUSES.AUTHORIZED) {
      const html = await renderTemplate('thankYou.ejs', {
        inquiry: current,
        agency,
      });
      return { html, alreadyConfirmed: true, savedDocuments: false };
    }
    throw new AppError('Unable to authorize inquiry', 409);
  }

  // Emit AFTER DB write
  try {
    const io = getIO();
    const payload = {
      inquiryId: updated._id.toString(),
      inquiryReference: updated.inquiryReference,
      status: updated.status,
      confirmedAt: updated.confirmedAt,
    };
    io.to(`inquiry_${updated._id}`).emit('inquiry:authorized', payload);
    // Back-compat alias for any lingering listeners
    io.to(`inquiry_${updated._id}`).emit('inquiry:confirmed', payload);
  } catch {
    // ignore if socket not ready
  }

  const html = await renderTemplate('thankYou.ejs', {
    inquiry: updated,
    agency,
  });

  const savedDocuments =
    docs.length > 0 || Boolean(supportDocument?.relativePath);
  return { html, alreadyConfirmed: false, savedDocuments };
}

async function verifyAndLoad(inquiryId, token) {
  if (!token) throw new AppError('Token required', 401);

  let decoded;
  try {
    decoded = verifyPublicToken(token);
  } catch {
    throw new AppError('Invalid or expired authorization link', 401);
  }

  if (decoded.inquiryId !== inquiryId) {
    throw new AppError('Token does not match inquiry', 401);
  }

  const inquiry = await Inquiry.findById(inquiryId).select('+publicTokenJti');
  if (!inquiry) throw new AppError('Inquiry not found', 404);

  if (inquiry.publicTokenJti && inquiry.publicTokenJti !== decoded.jti) {
    throw new AppError('Authorization link is no longer valid', 401);
  }

  const agency = await Agency.findById(inquiry.agencyId);
  return { inquiry, agency, decoded };
}
