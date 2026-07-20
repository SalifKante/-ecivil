import mongoose from 'mongoose';
import { PAYMENT_PROVIDERS, PAYMENT_STATUS, CURRENCY } from '../constants/index.js';

const paymentSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen', required: true },
    provider: { type: String, required: true, enum: Object.values(PAYMENT_PROVIDERS) },
    // XOF is a non-decimal currency — always an integer, never a float.
    amount: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger } },
    currency: { type: String, default: CURRENCY },
    status: {
      type: String,
      required: true,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    providerRef: { type: String, index: true },
    // Mobile money only — the wallet debited. Fictional, like all prototype data.
    payerPhone: { type: String },
    failureReason: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

export const Payment = mongoose.model('Payment', paymentSchema);
