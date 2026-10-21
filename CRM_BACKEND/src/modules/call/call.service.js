import { Call, Inquiry } from '../../models/index.js';
import { AppError } from '../../utils/apiResponse.js';
import { generateInquiryRef } from '../../utils/generateInquiryRef.js';
import { generateInvoiceNumber } from '../../utils/generateInvoiceNumber.js';
import { calculatePricing } from '../../utils/calculatePricing.js';
import { isServiceDisposition } from '../../utils/serviceDispositions.js';
import { INQUIRY_STATUSES, ROLES } from '../../config/constants.js';

const CALL_INQUIRY_POPULATE =
  'inquiryReference status closeReason customer.firstName customer.lastName customer.phone pricing.markup pricing.sellingPrice pricing.currency pricing.costPrice';

function splitCallerName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export async function createCall(user, payload) {
  const call = await Call.create({
    callerName: payload.callerName || '',
    phoneNumber: payload.phoneNumber || '',
    disposition: payload.disposition,
    remarks: payload.remarks || '',
    loggedBy: user._id,
    agencyId: user.agencyId,
  });

  let inquiry = null;
  let openWizard = false;

  const isBooking = payload.disposition === 'new_booking';
  const isService = isServiceDisposition(payload.disposition);

  if (isBooking || isService) {
    try {
      const inquiryReference = await generateInquiryRef();
      const invoiceNumber = await generateInvoiceNumber();
      inquiry = await Inquiry.create({
        inquiryReference,
        invoiceNumber,
        callId: call._id,
        agencyId: user.agencyId,
        assignedTo: user._id,
        kind: isService ? 'service' : 'booking',
        ...(isService ? { sourceDisposition: payload.disposition } : {}),
        status: INQUIRY_STATUSES.DRAFT,
        customer: {
          firstName: '',
          middleName: '',
          lastName: '',
          phone: payload.phoneNumber || '',
          email: '',
        },
        notes: payload.remarks || '',
      });

      call.inquiryId = inquiry._id;
      await call.save();
      openWizard = isService ? 'service' : 'booking';
    } catch (err) {
      await Call.findByIdAndDelete(call._id);
      throw err;
    }
  }

  return {
    call,
    inquiry,
    openWizard,
  };
}

/**
 * Admin: all agency calls (optional loggedBy filter).
 * Agent/Viewer: only own calls.
 */
export async function listCalls(user, query) {
  const { page, limit, disposition, search, loggedBy } = query;
  const filter = { agencyId: user.agencyId };

  if (user.role === ROLES.ADMIN) {
    // Ignore non-ObjectId values (e.g. accidental display name from FE)
    if (loggedBy && /^[a-f\d]{24}$/i.test(String(loggedBy))) {
      filter.loggedBy = loggedBy;
    }
  } else {
    filter.loggedBy = user._id;
  }

  if (disposition) filter.disposition = disposition;
  if (search) {
    filter.$or = [
      { callerName: new RegExp(search, 'i') },
      { phoneNumber: new RegExp(search, 'i') },
      { remarks: new RegExp(search, 'i') },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Call.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('loggedBy', 'firstName lastName email')
      .populate('followUpNotes.addedBy', 'firstName lastName')
      .populate('inquiryId', CALL_INQUIRY_POPULATE),
    Call.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

export async function getCall(user, callId) {
  const filter = { _id: callId, agencyId: user.agencyId };
  if (user.role !== ROLES.ADMIN) {
    filter.loggedBy = user._id;
  }

  const call = await Call.findOne(filter)
    .populate('loggedBy', 'firstName lastName email')
    .populate('followUpNotes.addedBy', 'firstName lastName')
    .populate('inquiryId', CALL_INQUIRY_POPULATE);
  if (!call) throw new AppError('Call not found', 404);
  return call;
}

/**
 * Record supplier + markup on a call.
 * Creates a minimal linked inquiry when missing; updates pricing when present.
 * paymentReceived → status authorized (feeds Dashboard Margin Collected).
 */
export async function recordCallPricing(user, callId, payload) {
  const filter = { _id: callId, agencyId: user.agencyId };
  if (user.role !== ROLES.ADMIN) {
    filter.loggedBy = user._id;
  }

  const call = await Call.findOne(filter);
  if (!call) throw new AppError('Call not found', 404);

  const pricing = calculatePricing({
    costPrice: payload.costPrice,
    markup: payload.markup,
    merchantFeePercent: 0,
    currency: payload.currency,
  });

  const paymentReceived = Boolean(payload.paymentReceived);
  let inquiry;

  if (call.inquiryId) {
    inquiry = await Inquiry.findOne({
      _id: call.inquiryId,
      agencyId: user.agencyId,
    });
    if (!inquiry) throw new AppError('Linked inquiry not found', 404);

    inquiry.pricing = {
      ...(inquiry.pricing?.toObject?.() ?? inquiry.pricing ?? {}),
      ...pricing,
    };

    if (paymentReceived && inquiry.status !== INQUIRY_STATUSES.AUTHORIZED) {
      inquiry.status = INQUIRY_STATUSES.AUTHORIZED;
      if (!inquiry.confirmedAt) inquiry.confirmedAt = new Date();
    }

    // Backfill reason fields when recording markup on a non-booking call
    if (call.disposition && call.disposition !== 'new_booking') {
      if (!inquiry.kind || inquiry.kind === 'booking') {
        const hasRoute =
          Boolean(inquiry.travel?.from?.trim?.()) &&
          Boolean(inquiry.travel?.to?.trim?.());
        if (!hasRoute) inquiry.kind = 'service';
      }
      if (!inquiry.sourceDisposition) {
        inquiry.sourceDisposition = call.disposition;
      }
    }

    await inquiry.save();
  } else {
    const { firstName, lastName } = splitCallerName(call.callerName);
    const inquiryReference = await generateInquiryRef();
    const invoiceNumber = await generateInvoiceNumber();
    const isService =
      Boolean(call.disposition) && call.disposition !== 'new_booking';

    inquiry = await Inquiry.create({
      inquiryReference,
      invoiceNumber,
      callId: call._id,
      agencyId: user.agencyId,
      assignedTo: user._id,
      kind: isService ? 'service' : 'booking',
      ...(isService ? { sourceDisposition: call.disposition } : {}),
      status: paymentReceived
        ? INQUIRY_STATUSES.AUTHORIZED
        : INQUIRY_STATUSES.DRAFT,
      confirmedAt: paymentReceived ? new Date() : undefined,
      customer: {
        firstName,
        lastName,
        phone: call.phoneNumber || '',
        email: '',
      },
      pricing,
      notes: call.remarks || '',
    });

    call.inquiryId = inquiry._id;
    await call.save();
  }

  const refreshed = await getCall(user, callId);
  return { call: refreshed, inquiry };
}

/** Append-only follow-up note — does not change remarks or disposition. */
export async function addCallNote(user, callId, text) {
  const filter = { _id: callId, agencyId: user.agencyId };
  if (user.role !== ROLES.ADMIN) {
    filter.loggedBy = user._id;
  }

  const call = await Call.findOne(filter);
  if (!call) throw new AppError('Call not found', 404);

  call.followUpNotes.push({
    text: String(text).trim(),
    addedBy: user._id,
    createdAt: new Date(),
  });
  await call.save();

  return getCall(user, callId);
}
