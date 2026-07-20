import mongoose from 'mongoose';
import { NINA_REGEX } from '../constants/index.js';

/**
 * A pending SMS one-time-password challenge.
 *
 * The code is never stored in clear: only an HMAC of it. A leaked database dump
 * must not let anyone complete a login.
 */
const otpChallengeSchema = new mongoose.Schema(
  {
    nina: { type: String, required: true, match: NINA_REGEX, index: true },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen', required: true },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    consumedAt: { type: Date },
    phoneMasked: { type: String },
  },
  { timestamps: true },
);

// Mongo reaps expired challenges automatically; no cleanup job needed.
otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpChallenge = mongoose.model('OtpChallenge', otpChallengeSchema);
