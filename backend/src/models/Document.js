import mongoose from 'mongoose';

/**
 * A delivered document. Every generated file is a watermarked SPÉCIMEN with no
 * legal value — see CLAUDE.md §2.
 */
const documentSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen', required: true },
    type: { type: String, required: true },
    storageKey: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isRevoked: { type: Boolean, default: false },
    revokedReason: { type: String },
  },
  { timestamps: true },
);

export const Document = mongoose.model('Document', documentSchema);
