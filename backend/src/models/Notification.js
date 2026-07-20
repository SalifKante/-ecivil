import mongoose from 'mongoose';
import { NOTIFICATION_CHANNELS } from '../constants/index.js';

const notificationSchema = new mongoose.Schema(
  {
    citizenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen', required: true, index: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    channel: { type: String, required: true, enum: Object.values(NOTIFICATION_CHANNELS) },
    template: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    recipient: { type: String, required: true },
    status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED'], default: 'QUEUED' },
    sentAt: { type: Date },
  },
  { timestamps: true },
);

export const Notification = mongoose.model('Notification', notificationSchema);
