import mongoose from 'mongoose';
import { CALL_DISPOSITIONS } from '../config/constants.js';

const callSchema = new mongoose.Schema(
  {
    callerName: { type: String, trim: true, default: '' },
    phoneNumber: { type: String, trim: true, default: '' },
    disposition: {
      type: String,
      enum: CALL_DISPOSITIONS,
      required: true,
    },
    remarks: { type: String, trim: true, default: '' },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      default: null,
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
    },
  },
  { timestamps: true }
);

callSchema.index({ agencyId: 1, createdAt: -1 });
callSchema.index({ disposition: 1 });
callSchema.index({ phoneNumber: 1 });

export const Call = mongoose.model('Call', callSchema);
export default Call;
