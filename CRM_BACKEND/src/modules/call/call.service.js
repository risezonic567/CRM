import { Call, Inquiry } from '../../models/index.js';
import { AppError } from '../../utils/apiResponse.js';
import { generateInquiryRef } from '../../utils/generateInquiryRef.js';
import { INQUIRY_STATUSES, ROLES } from '../../config/constants.js';

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

  if (payload.disposition === 'new_booking') {
    try {
      const inquiryReference = await generateInquiryRef();
      inquiry = await Inquiry.create({
        inquiryReference,
        callId: call._id,
        agencyId: user.agencyId,
        assignedTo: user._id,
        status: INQUIRY_STATUSES.DRAFT,
        customer: {
          firstName: '',
          lastName: '',
          phone: payload.phoneNumber || '',
          email: '',
        },
      });

      call.inquiryId = inquiry._id;
      await call.save();
    } catch (err) {
      await Call.findByIdAndDelete(call._id);
      throw err;
    }
  }

  return {
    call,
    inquiry,
    openWizard: payload.disposition === 'new_booking',
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
    if (loggedBy) filter.loggedBy = loggedBy;
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
      .populate(
        'inquiryId',
        'inquiryReference status customer.firstName customer.lastName customer.phone'
      ),
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
    .populate(
      'inquiryId',
      'inquiryReference status customer.firstName customer.lastName customer.phone'
    );
  if (!call) throw new AppError('Call not found', 404);
  return call;
}
