import mongoose from 'mongoose';
import { STAFF_ROLES, MODULE_KEYS } from '../constants/index.js';

/** Back-office user: agent, module admin, or super-admin. Citizens are not Users. */
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    fullName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: STAFF_ROLES },
    // Modules an AGENT/ADMIN is scoped to. Empty for SUPER_ADMIN, who is global.
    moduleScope: [{ type: String, enum: Object.values(MODULE_KEYS) }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Defence in depth: the hash must never reach a response body even if `select` is bypassed.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
