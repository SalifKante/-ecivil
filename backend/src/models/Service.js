import mongoose from 'mongoose';
import { MODULE_KEYS, CURRENCY } from '../constants/index.js';

/** A requestable administrative service with its official tariff. */
const serviceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    moduleKey: { type: String, required: true, enum: Object.values(MODULE_KEYS), index: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    partner: { type: String, trim: true },
    requiredDocuments: [{ type: String, trim: true }],
    // Integer minor-unit-free amount: XOF has no decimal subdivision.
    fee: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger } },
    currency: { type: String, default: CURRENCY },
    processingDays: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Service = mongoose.model('Service', serviceSchema);
