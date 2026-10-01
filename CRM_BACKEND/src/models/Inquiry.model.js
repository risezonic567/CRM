import mongoose from 'mongoose';
import {
  INQUIRY_STATUSES,
  PASSENGER_TYPES,
  CABIN_CLASSES,
  CLOSE_SOURCES,
} from '../config/constants.js';

const passengerSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    middleName: { type: String, trim: true, default: '' },
    dob: { type: Date },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    documentType: { type: String, trim: true, default: '' },
    documentNumber: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: PASSENGER_TYPES,
      default: 'adult',
    },
  },
  { _id: true }
);

const inquirySchema = new mongoose.Schema(
  {
    inquiryReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call',
      required: true,
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
    },
    customer: {
      firstName: { type: String, trim: true, default: '' },
      lastName: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
    },
    travel: {
      type: {
        type: String,
        default: 'flight',
      },
      from: { type: String, trim: true, default: '' },
      fromLabel: { type: String, trim: true, default: '' },
      to: { type: String, trim: true, default: '' },
      toLabel: { type: String, trim: true, default: '' },
      departureDate: { type: Date },
      returnDate: { type: Date },
      passengers: { type: Number, default: 1, min: 1, max: 9 },
      adults: { type: Number, default: 1, min: 0, max: 9 },
      children: { type: Number, default: 0, min: 0, max: 8 },
      infantsInSeat: { type: Number, default: 0, min: 0, max: 8 },
      infantsOnLap: { type: Number, default: 0, min: 0, max: 8 },
      cabinClass: {
        type: String,
        enum: CABIN_CLASSES,
        default: 'economy',
      },
    },
    selectedOffer: { type: mongoose.Schema.Types.Mixed, default: null },
    pricing: {
      costPrice: { type: Number, default: 0 },
      markup: { type: Number, default: 0 },
      merchantFee: { type: Number, default: 0 },
      merchantFeePercent: { type: Number, default: 2 },
      sellingPrice: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    /** Wizard step index (0–5) for resume — draft only */
    wizardStep: { type: Number, default: 0, min: 0, max: 5 },
    passengers: { type: [passengerSchema], default: [] },
    billing: {
      phone: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      zip: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
    },
    status: {
      type: String,
      enum: Object.values(INQUIRY_STATUSES),
      default: INQUIRY_STATUSES.DRAFT,
      index: true,
    },
    agreement: {
      agreedAt: { type: Date },
      agreedIp: { type: String },
      agreedUserAgent: { type: String },
    },
    emailSentAt: { type: Date },
    confirmedAt: { type: Date },
    closeReason: { type: String, trim: true, default: '' },
    closeSource: {
      type: String,
      enum: Object.values(CLOSE_SOURCES),
      default: undefined,
    },
    closedAt: { type: Date },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: { type: String, default: '' },
    publicTokenJti: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

inquirySchema.index({ agencyId: 1, createdAt: -1 });
inquirySchema.index({ 'customer.email': 1 });
inquirySchema.index({ 'customer.phone': 1 });
inquirySchema.index({ status: 1, agencyId: 1 });

export const Inquiry = mongoose.model('Inquiry', inquirySchema);
export default Inquiry;
