import mongoose from 'mongoose';
import {
  MODULE_KEYS,
  REQUEST_STATUS,
  DELIVERY_MODES,
  CURRENCY,
} from '../constants/index.js';

/** Uploaded file. Stores the storage key only — URLs are signed on read (CLAUDE.md §2). */
const attachmentSchema = new mongoose.Schema(
  {
    storageKey: { type: String, required: true },
    resourceType: { type: String, default: 'auto' },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    originalName: { type: String, required: true },
    label: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'attachments.uploadedByModel' },
    uploadedByModel: { type: String, enum: ['Citizen', 'User'], default: 'Citizen' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

/** Append-only audit trail of every status change. */
const timelineEntrySchema = new mongoose.Schema(
  {
    from: { type: String, enum: Object.values(REQUEST_STATUS) },
    to: { type: String, enum: Object.values(REQUEST_STATUS), required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId },
    actorRole: { type: String },
    note: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const requestSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, uppercase: true },
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen', required: true, index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    moduleKey: { type: String, required: true, enum: Object.values(MODULE_KEYS), index: true },
    status: {
      type: String,
      required: true,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.DRAFT,
      index: true,
    },
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    attachments: [attachmentSchema],
    amountDue: { type: Number, min: 0, validate: { validator: Number.isInteger } },
    currency: { type: String, default: CURRENCY },
    delivery: {
      mode: { type: String, enum: Object.values(DELIVERY_MODES), default: DELIVERY_MODES.DIGITAL },
      address: { type: String },
      pickupPoint: { type: String },
    },
    timeline: [timelineEntrySchema],
    // Points at the settled Payment. The Payment collection stays the source of
    // truth for amounts and provider refs — this is a pointer, not a copy.
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    rejectionReason: { type: String },
    submittedAt: { type: Date },
  },
  { timestamps: true },
);

// Agent inbox: filter by module + status, newest first.
requestSchema.index({ moduleKey: 1, status: 1, createdAt: -1 });

export const Request = mongoose.model('Request', requestSchema);
