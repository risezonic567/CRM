import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['email'], default: 'email' },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    relatedTo: {
      model: { type: String, default: 'Inquiry' },
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
    },
    messageId: { type: String, default: '' },
    error: { type: String, default: '' },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NotificationLog = mongoose.model(
  'NotificationLog',
  notificationLogSchema
);
export default NotificationLog;
