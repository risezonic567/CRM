import crypto from 'crypto';
import fs from 'fs';
import mongoose from 'mongoose';
import { Inquiry, Agency, Call } from '../../models/index.js';
import { AppError } from '../../utils/apiResponse.js';
import { calculatePricing } from '../../utils/calculatePricing.js';
import { sanitizeBilling } from '../../utils/sanitizeBilling.js';
import {
  buildAuthPurpose,
  buildAuthorizationText,
  extractAuthFillsFromText,
  resolveAuthFills,
} from '../../utils/buildAuthorizationText.js';
import { servicePurposeLabel } from '../../utils/serviceDispositions.js';
import { resolveSupportDocumentAbsolutePath } from '../../middlewares/authorizeUpload.middleware.js';
import {
  itineraryScreenshotMetaFromFile,
  assertItineraryScreenshotMagic,
  resolveItineraryScreenshotAbsolutePath,
} from '../../middlewares/itineraryScreenshot.middleware.js';
import {
  findSupportDocument,
  attachSupportDocAvailability,
  resolveDocRequest,
} from '../../utils/supportDocuments.js';
import { signPublicToken } from '../../utils/signPublicToken.js';
import {
  INQUIRY_STATUSES,
  CLOSE_SOURCES,
  ROLES,
} from '../../config/constants.js';
import config from '../../config/index.js';
import {
  queueInquiryEmail,
  queueConfirmationEmail,
  renderTemplate,
} from '../notification/notification.service.js';
import {
  normalizeCustomerLocale,
  paxAuthorizationHtml,
  paxTemplateLocals,
} from '../../i18n/index.js';
import { enrichAgreement } from '../../utils/enrichAgreement.js';
import { getIO } from '../../socket/socket.js';
import logger from '../../utils/logger.js';

/** New authorize flow: customer total = cost + markup only (no merchant fee). */
const AUTHORIZE_MERCHANT_FEE_PERCENT = 0;

function buildInquiryScopeFilter(user, extra = {}) {
  const filter = { agencyId: user.agencyId, ...extra };
  if (user.role !== ROLES.ADMIN) {
    filter.assignedTo = user._id;
  }
  return filter;
}

async function findInquiryForUser(user, inquiryId) {
  const inquiry = await Inquiry.findOne(
    buildInquiryScopeFilter(user, { _id: inquiryId })
  );
  if (!inquiry) throw new AppError('Inquiry not found', 404);
  return inquiry;
}

/**
 * Push inquiry customer name/phone onto the linked Call (optional fields stay optional).
 */
async function syncLinkedCallFromCustomer(inquiry) {
  if (!inquiry?.callId) return;

  const customer = inquiry.customer || {};
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const phone = String(customer.phone || '').trim();

  const $set = {};
  if (name) $set.callerName = name;
  if (phone) $set.phoneNumber = phone;
  if (!Object.keys($set).length) return;

  await Call.updateOne({ _id: inquiry.callId }, { $set });
}

/**
 * Admin: all agency inquiries (optional assignedTo filter).
 * Agent/Viewer: only own assigned inquiries.
 */
export async function listInquiries(user, query) {
  const { page, limit, status, search, assignedTo } = query;
  const filter = { agencyId: user.agencyId };

  if (user.role === ROLES.ADMIN) {
    if (assignedTo) filter.assignedTo = assignedTo;
  } else {
    filter.assignedTo = user._id;
  }

  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(search, 'i');
    filter.$or = [
      { inquiryReference: rx },
      { invoiceNumber: rx },
      { 'customer.email': rx },
      { 'customer.phone': rx },
      { 'customer.firstName': rx },
      { 'customer.lastName': rx },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'firstName lastName email')
      .populate('callId', 'disposition remarks phoneNumber'),
    Inquiry.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

/**
 * Authorized inquiries only — sum real pricing.markup (agency fee / margin).
 * Does not include merchant fee estimates.
 */
export async function getMarginStats(user) {
  const match = buildInquiryScopeFilter(user, {
    status: INQUIRY_STATUSES.AUTHORIZED,
  });

  const rows = await Inquiry.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $ifNull: ['$pricing.currency', 'USD'] },
        totalMargin: { $sum: { $ifNull: ['$pricing.markup', 0] } },
        totalSelling: { $sum: { $ifNull: ['$pricing.sellingPrice', 0] } },
        confirmedCount: { $sum: 1 },
      },
    },
    { $sort: { confirmedCount: -1 } },
  ]);

  if (!rows.length) {
    return {
      totalMargin: 0,
      totalSelling: 0,
      confirmedCount: 0,
      currency: 'USD',
      byCurrency: [],
    };
  }

  // Primary row = most confirmed currency (typical agency is single-currency)
  const primary = rows[0];
  return {
    totalMargin: primary.totalMargin,
    totalSelling: primary.totalSelling,
    confirmedCount: primary.confirmedCount,
    currency: primary._id || 'USD',
    byCurrency: rows.map((r) => ({
      currency: r._id || 'USD',
      totalMargin: r.totalMargin,
      totalSelling: r.totalSelling,
      confirmedCount: r.confirmedCount,
    })),
  };
}

export async function getInquiry(user, inquiryId) {
  const inquiry = await Inquiry.findOne(
    buildInquiryScopeFilter(user, { _id: inquiryId })
  )
    .populate('assignedTo', 'firstName lastName email')
    .populate('callId')
    .populate('closedBy', 'firstName lastName email');
  if (!inquiry) throw new AppError('Inquiry not found', 404);

  const doc = inquiry.toObject();
  if (doc.agreement) {
    doc.agreement = enrichAgreement(doc.agreement);
  }
  return attachSupportDocAvailability(doc);
}

export async function lookupInquiries(user, q) {
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = {
    agencyId: user.agencyId,
    $or: [
      { inquiryReference: rx },
      { invoiceNumber: rx },
      { 'customer.email': rx },
      { 'customer.phone': rx },
    ],
  };
  if (user.role !== ROLES.ADMIN) {
    filter.assignedTo = user._id;
  }

  const items = await Inquiry.find(filter)
    .sort({ createdAt: -1 })
    .limit(25)
    .select(
      'inquiryReference invoiceNumber status customer pricing travel createdAt confirmedAt emailSentAt assignedTo'
    );

  return items;
}

/**
 * Persist full wizard payload, compute pricing server-side, send email (async).
 */
export async function sendInquiryToCustomer(user, inquiryId, payload) {
  const inquiry = await findInquiryForUser(user, inquiryId);

  if (
    ![INQUIRY_STATUSES.DRAFT, INQUIRY_STATUSES.PREVIEW_SENT].includes(
      inquiry.status
    )
  ) {
    throw new AppError(
      `Cannot send inquiry in status "${inquiry.status}"`,
      400
    );
  }

  const agency = await Agency.findById(user.agencyId);
  if (!agency) throw new AppError('Agency not found', 404);

  const isService = inquiry.kind === 'service';

  // Booking path still requires itinerary + offer + passengers
  if (!isService) {
    if (!payload.selectedOffer) {
      throw new AppError('selectedOffer is required for booking inquiries', 400);
    }
    if (!payload.travel?.from || !payload.travel?.to) {
      throw new AppError('Travel route is required for booking inquiries', 400);
    }
    if (!payload.travel?.departureDate) {
      throw new AppError('Departure date is required for booking inquiries', 400);
    }
    if (!Array.isArray(payload.passengers) || payload.passengers.length < 1) {
      throw new AppError('At least one passenger is required for booking inquiries', 400);
    }
    const isScreenshot =
      payload.selectedOffer?.raw?.source === 'screenshot' ||
      inquiry.selectedOffer?.raw?.source === 'screenshot';
    if (isScreenshot) {
      const shot =
        inquiry.itineraryScreenshot?.relativePath ||
        payload.itineraryScreenshot?.relativePath;
      if (!shot) {
        throw new AppError(
          'Itinerary screenshot is required for screenshot mode',
          400
        );
      }
    }
  }

  // Never trust frontend sellingPrice — recompute (merchant fee stripped for authorize flow)
  const pricing = calculatePricing({
    costPrice: payload.costPrice,
    markup: payload.markup,
    merchantFeePercent: AUTHORIZE_MERCHANT_FEE_PERCENT,
    currency: payload.currency || agency.currency || config.pricing.defaultCurrency,
  });

  const jti = crypto.randomUUID();
  const token = signPublicToken({
    inquiryId: inquiry._id.toString(),
    agencyId: user.agencyId.toString(),
    jti,
  });

  inquiry.customer = payload.customer;
  if (!isService) {
    inquiry.travel = {
      type: 'flight',
      ...payload.travel,
    };
    inquiry.selectedOffer = payload.selectedOffer;
    // Ensure passenger subdocs have _ids so docRequest slots resolve stably
    inquiry.passengers = (payload.passengers || []).map((p) => {
      const row = { ...(p && typeof p === 'object' ? p : {}) };
      if (!row._id) {
        row._id = new mongoose.Types.ObjectId();
      }
      return row;
    });
  } else {
    inquiry.selectedOffer = payload.selectedOffer || null;
    inquiry.passengers = [];
  }
  inquiry.pricing = pricing;
  inquiry.billing = sanitizeBilling(payload.billing || {});
  inquiry.notes = payload.notes || inquiry.notes || '';
  inquiry.docRequest = resolveDocRequest(payload.docRequest, inquiry);

  const authorizerName =
    payload.billing?.cardholderName ||
    [
      payload.customer?.firstName,
      payload.customer?.middleName,
      payload.customer?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  const purpose = isService
    ? servicePurposeLabel(inquiry.sourceDisposition) ||
      String(payload.authorizationFills?.purpose || '').trim() ||
      'travel service fee'
    : buildAuthPurpose(payload.travel?.from, payload.travel?.to) ||
      'the itinerary detailed above';

  // Server-owned amount — never trust client amountLabel / mismatched auth text
  const serverFills = resolveAuthFills({
    authorizerName,
    agencyName: agency.name || 'Airline Ticket Booking',
    currency: pricing.currency,
    total: pricing.sellingPrice,
    purpose,
  });
  const fromAgent = String(payload.authorizationText || '').trim();
  const fallbackAuth = buildAuthorizationText({
    authorizerName: serverFills.authorizerName,
    agencyName: serverFills.agencyName,
    currency: serverFills.currency,
    total: pricing.sellingPrice,
    purpose: serverFills.purpose,
  });

  let authText = fromAgent || fallbackAuth;
  if (!authText.includes(serverFills.amountLabel)) {
    const replaced = authText.replace(
      /for the amount of\s+[A-Z]{3}\s+\d+(?:\.\d{1,2})?/i,
      `for the amount of ${serverFills.amountLabel}`
    );
    authText =
      replaced !== authText && replaced.includes(serverFills.amountLabel)
        ? replaced
        : fallbackAuth;
  }
  inquiry.authorizationText = authText;

  const extracted = extractAuthFillsFromText(inquiry.authorizationText, {
    authorizerName: serverFills.authorizerName,
    agencyName: serverFills.agencyName,
    currency: serverFills.currency,
    total: pricing.sellingPrice,
    purpose: serverFills.purpose,
  });
  inquiry.authorizationFills = {
    ...extracted,
    amountLabel: serverFills.amountLabel,
    currency: serverFills.currency,
    amount: serverFills.amount,
  };

  inquiry.wizardStep = isService ? 3 : 5;
  inquiry.status = INQUIRY_STATUSES.PREVIEW_SENT;
  inquiry.publicTokenJti = jti;
  inquiry.customerLocale = normalizeCustomerLocale(payload.customerLocale);
  inquiry.closeReason = '';
  inquiry.closeSource = null;
  inquiry.closedAt = undefined;
  inquiry.closedBy = null;

  await inquiry.save();

  await syncLinkedCallFromCustomer(inquiry);

  const confirmUrl = `${config.urls.api}/public/confirm/${inquiry._id}?token=${token}`;

  let emailSent = false;
  try {
    await queueInquiryEmail({
      inquiry,
      agency,
      confirmUrl,
    });
    inquiry.emailSentAt = new Date();
    await inquiry.save();
    emailSent = true;
  } catch (err) {
    logger.error('Inquiry authorization email failed after send', {
      inquiryId: inquiry._id.toString(),
      message: err.message,
    });
  }

  return { inquiry, confirmUrl, emailSent };
}

/**
 * Autosave wizard progress while status is still draft.
 */
export async function saveDraft(user, inquiryId, payload) {
  const inquiry = await findInquiryForUser(user, inquiryId);

  if (inquiry.status !== INQUIRY_STATUSES.DRAFT) {
    throw new AppError(
      `Can only autosave drafts (current: "${inquiry.status}")`,
      400
    );
  }

  if (payload.customer) {
    inquiry.customer = { ...inquiry.customer.toObject?.() ?? inquiry.customer, ...payload.customer };
  }
  if (payload.travel) {
    const travel = { ...payload.travel };
    if (travel.departureDate === '' || travel.departureDate == null) {
      delete travel.departureDate;
    }
    if (travel.returnDate === '' || travel.returnDate == null) {
      travel.returnDate = undefined;
    }
    inquiry.travel = {
      ...(inquiry.travel?.toObject?.() ?? inquiry.travel ?? {}),
      type: 'flight',
      ...travel,
    };
  }
  if (payload.selectedOffer !== undefined) {
    inquiry.selectedOffer = payload.selectedOffer;
  }
  if (payload.passengers) {
    inquiry.passengers = payload.passengers;
  }
  if (payload.billing) {
    inquiry.billing = sanitizeBilling({
      ...(inquiry.billing?.toObject?.() ?? inquiry.billing ?? {}),
      ...payload.billing,
    });
  }
  if (payload.notes !== undefined) {
    inquiry.notes = payload.notes;
  }
  if (payload.customerLocale !== undefined) {
    inquiry.customerLocale = normalizeCustomerLocale(payload.customerLocale);
  }
  if (payload.authorizationText !== undefined) {
    inquiry.authorizationText = String(payload.authorizationText || '').trim();
  }
  if (payload.authorizationFills !== undefined) {
    const f = payload.authorizationFills || {};
    inquiry.authorizationFills = {
      authorizerName: String(f.authorizerName || '').trim(),
      agencyName: String(f.agencyName || '').trim(),
      amountLabel: String(f.amountLabel || '').trim(),
      purpose: String(f.purpose || '').trim(),
      currency: String(f.currency || '').trim(),
      amount: String(f.amount || '').trim(),
    };
  }
  if (typeof payload.wizardStep === 'number') {
    inquiry.wizardStep = payload.wizardStep;
  }

  const costPrice =
    payload.costPrice !== undefined
      ? payload.costPrice
      : inquiry.pricing?.costPrice ?? 0;
  const markup =
    payload.markup !== undefined ? payload.markup : inquiry.pricing?.markup ?? 0;
  const currency =
    payload.currency ||
    inquiry.pricing?.currency ||
    config.pricing.defaultCurrency;

  if (
    payload.costPrice !== undefined ||
    payload.markup !== undefined ||
    payload.currency !== undefined ||
    inquiry.selectedOffer
  ) {
    inquiry.pricing = calculatePricing({
      costPrice,
      markup,
      merchantFeePercent: AUTHORIZE_MERCHANT_FEE_PERCENT,
      currency,
    });
  }

  await inquiry.save();

  if (payload.customer) {
    await syncLinkedCallFromCustomer(inquiry);
  }

  return inquiry;
}

/**
 * Agent closes waiting modal / cancels inquiry with required reason.
 * Does NOT confirm on behalf of customer.
 */
export async function closeInquiry(user, inquiryId, { reason, source }) {
  const inquiry = await findInquiryForUser(user, inquiryId);

  if (inquiry.status === INQUIRY_STATUSES.AUTHORIZED) {
    throw new AppError('Inquiry already authorized by customer', 400);
  }
  if (inquiry.status === INQUIRY_STATUSES.CANCELLED) {
    throw new AppError('Inquiry already closed', 400);
  }

  inquiry.status = INQUIRY_STATUSES.CANCELLED;
  inquiry.closeReason = reason;
  inquiry.closeSource = source || CLOSE_SOURCES.DETAIL_PAGE;
  inquiry.closedAt = new Date();
  inquiry.closedBy = user._id;
  await inquiry.save();

  try {
    const io = getIO();
    io.to(`inquiry_${inquiry._id}`).emit('inquiry:closed', {
      inquiryId: inquiry._id.toString(),
      inquiryReference: inquiry.inquiryReference,
      status: inquiry.status,
      closeReason: inquiry.closeReason,
      closeSource: inquiry.closeSource,
    });
  } catch {
    // socket may not be ready in tests
  }

  return inquiry;
}

/**
 * Agent resends authorization receipt email (authorized only).
 * Does not auto-send on customer authorize — agent-triggered only.
 */
export async function resendConfirmationEmail(user, inquiryId) {
  const inquiry = await findInquiryForUser(user, inquiryId);

  if (inquiry.status !== INQUIRY_STATUSES.AUTHORIZED) {
    throw new AppError(
      'Authorization receipt can only be resent for authorized inquiries',
      400
    );
  }

  const email = inquiry.customer?.email?.trim();
  if (!email) {
    throw new AppError('Customer email is missing', 400);
  }

  const agency = await Agency.findById(inquiry.agencyId);
  if (!agency) throw new AppError('Agency not found', 404);

  await queueConfirmationEmail({ inquiry, agency });

  return { inquiry, emailedTo: email };
}

/**
 * HTML authorization receipt for agent download (authorized only).
 */
export async function getConfirmationReceipt(user, inquiryId) {
  const inquiry = await findInquiryForUser(user, inquiryId);

  if (inquiry.status !== INQUIRY_STATUSES.AUTHORIZED) {
    throw new AppError(
      'Authorization receipt is only available for authorized inquiries',
      400
    );
  }

  const agency = await Agency.findById(inquiry.agencyId);
  if (!agency) throw new AppError('Agency not found', 404);

  const authorizationHtml = paxAuthorizationHtml(inquiry, agency);

  let showItineraryScreenshot = false;
  let itineraryScreenshotSrc = null;
  if (
    inquiry.selectedOffer?.raw?.source === 'screenshot' &&
    inquiry.itineraryScreenshot?.relativePath
  ) {
    try {
      const abs = resolveItineraryScreenshotAbsolutePath(
        inquiry.itineraryScreenshot.relativePath
      );
      if (abs && fs.existsSync(abs)) {
        const buf = fs.readFileSync(abs);
        const mime = inquiry.itineraryScreenshot.mimeType || 'image/jpeg';
        itineraryScreenshotSrc = `data:${mime};base64,${buf.toString('base64')}`;
        showItineraryScreenshot = true;
      }
    } catch {
      /* omit image from receipt */
    }
  }

  const html = await renderTemplate('confirmationEmail.ejs', {
    agency,
    inquiry,
    grandTotal: inquiry.pricing.sellingPrice,
    currency: inquiry.pricing.currency,
    authorizationHtml,
    showItineraryScreenshot,
    itineraryScreenshotSrc,
    ...paxTemplateLocals(inquiry),
  });

  const safeRef = String(inquiry.inquiryReference || inquiryId).replace(
    /[^\w.-]+/g,
    '_'
  );
  const filename = `Authorized-${safeRef}.html`;

  return { html, filename };
}

/**
 * Agent uploads itinerary screenshot (draft only). Replaces prior file if any.
 */
export async function uploadItineraryScreenshot(user, inquiryId, file) {
  const inquiry = await findInquiryForUser(user, inquiryId);
  if (inquiry.status !== INQUIRY_STATUSES.DRAFT) {
    throw new AppError('Screenshot can only be uploaded on draft inquiries', 400);
  }
  if (!file) throw new AppError('Screenshot file is required', 400);

  assertItineraryScreenshotMagic(file);
  const meta = itineraryScreenshotMetaFromFile(file);
  if (!meta?.relativePath) {
    throw new AppError('Upload failed', 400);
  }

  // Remove previous file if path differs
  const prev = inquiry.itineraryScreenshot?.relativePath;
  if (prev && prev !== meta.relativePath) {
    try {
      const oldAbs = resolveItineraryScreenshotAbsolutePath(prev);
      if (oldAbs && fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
    } catch {
      /* ignore cleanup errors */
    }
  }

  inquiry.itineraryScreenshot = meta;
  await inquiry.save();
  return inquiry;
}

/** Agent inline view of itinerary screenshot. */
export async function getItineraryScreenshot(user, inquiryId) {
  const inquiry = await findInquiryForUser(user, inquiryId);
  const shot = inquiry.itineraryScreenshot;
  if (!shot?.relativePath) {
    throw new AppError('No itinerary screenshot on this inquiry', 404);
  }
  const abs = resolveItineraryScreenshotAbsolutePath(shot.relativePath);
  if (!abs || !fs.existsSync(abs)) {
    throw new AppError('Screenshot file removed', 410);
  }
  const safeName = String(shot.originalName || shot.storedName || 'itinerary.jpg')
    .replace(/[^\w.\- ()]+/g, '_')
    .slice(0, 180);
  return {
    absolutePath: abs,
    mimeType: shot.mimeType || 'image/jpeg',
    downloadName: safeName,
  };
}

/**
 * Stream one pax-uploaded supporting document for in-browser view (inline).
 * @param {string} [docId] — supportDocuments[].id; omit / "legacy" for first/legacy
 */
export async function getSupportDocument(user, inquiryId, docId) {
  const inquiry = await findInquiryForUser(user, inquiryId);
  const doc = findSupportDocument(inquiry, docId);
  if (!doc?.relativePath) {
    throw new AppError('No supporting document on this inquiry', 404);
  }

  const abs = resolveSupportDocumentAbsolutePath(doc.relativePath);
  if (!abs || !fs.existsSync(abs)) {
    throw new AppError('Document removed', 410);
  }

  const safeName = String(doc.originalName || doc.storedName || 'document')
    .replace(/[^\w.\- ()]+/g, '_')
    .slice(0, 180);

  return {
    absolutePath: abs,
    mimeType: doc.mimeType || 'application/octet-stream',
    downloadName: safeName,
  };
}

/**
 * Hard-delete inquiry (dev / cleanup). Respects agency + assignment scope.
 */
export async function deleteInquiry(user, inquiryId) {
  const inquiry = await findInquiryForUser(user, inquiryId);
  await Inquiry.deleteOne({ _id: inquiry._id });
  return inquiry;
}
