import crypto from 'crypto';
import { Inquiry, Agency, Call } from '../../models/index.js';
import { AppError } from '../../utils/apiResponse.js';
import { calculatePricing } from '../../utils/calculatePricing.js';
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
import { enrichAgreement } from '../../utils/enrichAgreement.js';
import { getIO } from '../../socket/socket.js';

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
 * Confirmed inquiries only — sum real pricing.markup (agency fee / margin).
 * Does not include merchant fee estimates.
 */
export async function getMarginStats(user) {
  const match = buildInquiryScopeFilter(user, {
    status: INQUIRY_STATUSES.CUSTOMER_CONFIRMED,
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
  return doc;
}

export async function lookupInquiries(user, q) {
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = {
    agencyId: user.agencyId,
    $or: [
      { inquiryReference: rx },
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
      'inquiryReference status customer pricing travel createdAt confirmedAt emailSentAt assignedTo'
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

  // Merchant % from env only; amount = (cost + markup) * percent / 100 (staff-only)
  const merchantFeePercent = config.pricing.merchantFeePercent;

  // Never trust frontend sellingPrice — recompute
  // Customer pays cost + markup; merchant fee is NOT deducted from pax total
  const pricing = calculatePricing({
    costPrice: payload.costPrice,
    markup: payload.markup,
    merchantFeePercent,
    currency: payload.currency || agency.currency || config.pricing.defaultCurrency,
  });

  const jti = crypto.randomUUID();
  const token = signPublicToken({
    inquiryId: inquiry._id.toString(),
    agencyId: user.agencyId.toString(),
    jti,
  });

  inquiry.customer = payload.customer;
  inquiry.travel = {
    type: 'flight',
    ...payload.travel,
  };
  inquiry.selectedOffer = payload.selectedOffer;
  inquiry.pricing = pricing;
  inquiry.passengers = payload.passengers;
  inquiry.billing = payload.billing || {};
  inquiry.notes = payload.notes || '';
  inquiry.wizardStep = 5;
  inquiry.status = INQUIRY_STATUSES.PREVIEW_SENT;
  inquiry.emailSentAt = new Date();
  inquiry.publicTokenJti = jti;
  inquiry.closeReason = '';
  inquiry.closeSource = null;
  inquiry.closedAt = undefined;
  inquiry.closedBy = null;

  await inquiry.save();

  await syncLinkedCallFromCustomer(inquiry);

  const confirmUrl = `${config.urls.api}/public/confirm/${inquiry._id}?token=${token}`;

  // Fire-and-forget email — do not block response
  queueInquiryEmail({
    inquiry,
    agency,
    confirmUrl,
  }).catch(() => {});

  return { inquiry, confirmUrl };
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
    inquiry.billing = {
      ...(inquiry.billing?.toObject?.() ?? inquiry.billing ?? {}),
      ...payload.billing,
    };
  }
  if (payload.notes !== undefined) {
    inquiry.notes = payload.notes;
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
      merchantFeePercent: config.pricing.merchantFeePercent,
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

  if (inquiry.status === INQUIRY_STATUSES.CUSTOMER_CONFIRMED) {
    throw new AppError('Inquiry already confirmed by customer', 400);
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
 * Agent resends confirmation receipt email (customer_confirmed only).
 */
export async function resendConfirmationEmail(user, inquiryId) {
  const inquiry = await findInquiryForUser(user, inquiryId);

  if (inquiry.status !== INQUIRY_STATUSES.CUSTOMER_CONFIRMED) {
    throw new AppError(
      'Confirmation email can only be resent for confirmed inquiries',
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
 * HTML confirmation receipt for agent download (customer_confirmed only).
 */
export async function getConfirmationReceipt(user, inquiryId) {
  const inquiry = await findInquiryForUser(user, inquiryId);

  if (inquiry.status !== INQUIRY_STATUSES.CUSTOMER_CONFIRMED) {
    throw new AppError(
      'Confirmation receipt is only available for confirmed inquiries',
      400
    );
  }

  const agency = await Agency.findById(inquiry.agencyId);
  if (!agency) throw new AppError('Agency not found', 404);

  const html = await renderTemplate('confirmationEmail.ejs', {
    agency,
    inquiry,
    grandTotal: inquiry.pricing.sellingPrice,
    currency: inquiry.pricing.currency,
  });

  const safeRef = String(inquiry.inquiryReference || inquiryId).replace(
    /[^\w.-]+/g,
    '_'
  );
  const filename = `Confirmed-${safeRef}.html`;

  return { html, filename };
}

/**
 * Hard-delete inquiry (dev / cleanup). Respects agency + assignment scope.
 */
export async function deleteInquiry(user, inquiryId) {
  const inquiry = await findInquiryForUser(user, inquiryId);
  await Inquiry.deleteOne({ _id: inquiry._id });
  return inquiry;
}
