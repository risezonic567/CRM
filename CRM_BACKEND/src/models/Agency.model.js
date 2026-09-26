import mongoose from 'mongoose';

const agencySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
    address: { type: String, default: '' },
    country: { type: String, default: 'US' },
    currency: { type: String, default: 'USD' },
    gstNumber: { type: String, default: '' },
    iataNumber: { type: String, default: '' },
    duffelAccountId: { type: String, default: '' },
    defaultMarkup: { type: Number, default: 50 },
    merchantFeePercent: { type: Number, default: 2 },
    notificationSettings: {
      emailEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Agency = mongoose.model('Agency', agencySchema);
export default Agency;
