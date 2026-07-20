import mongoose from 'mongoose';
import { NINA_REGEX } from '../constants/index.js';

/**
 * A citizen as held in the (mocked) national identity registry.
 * All records in this prototype are fictional — see CLAUDE.md §2.
 */
const citizenSchema = new mongoose.Schema(
  {
    nina: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [NINA_REGEX, 'NINA must be 14 digits'],
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    birthDate: { type: Date, required: true },
    birthPlace: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['M', 'F'], required: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
      line: { type: String, trim: true },
      city: { type: String, trim: true },
      region: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Mali' },
    },
    isDiaspora: { type: Boolean, default: false },
    consulate: { type: String, trim: true },
    photoStorageKey: { type: String },
  },
  { timestamps: true },
);

citizenSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

citizenSchema.set('toJSON', { virtuals: true });

export const Citizen = mongoose.model('Citizen', citizenSchema);
