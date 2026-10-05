import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

const refreshSessionSchema = new mongoose.Schema(
  {
    /** sha256 of the active refresh token for this browser/device */
    current: { type: String, required: true },
    /**
     * sha256 of the previous refresh token (rotation grace).
     * Lets a concurrent refresh that still holds the old cookie succeed
     * instead of 401 → forced logout.
     */
    previous: { type: String, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true, default: '' },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.AGENT,
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    /** @deprecated single-session; migrate-on-read */
    refreshTokenHash: { type: String, select: false },
    /** @deprecated plain hash list; migrate-on-read into refreshSessions */
    refreshTokenHashes: { type: [String], select: false, default: [] },
    /** Multi-browser sessions with rotation grace (current + previous) */
    refreshSessions: {
      type: [refreshSessionSchema],
      select: false,
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    role: this.role,
    agencyId: this.agencyId,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model('User', userSchema);
export default User;
