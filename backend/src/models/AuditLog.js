import mongoose from 'mongoose';

/** Append-only. Who did what, to which entity. Never updated or deleted by app code. */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
