import { Notification, Citizen } from '../../models/index.js';
import { sendSms } from '../../adapters/sms.js';
import { sendEmail } from '../../adapters/email.js';
import { templateFor } from './notification.templates.js';
import { NOTIFICATION_CHANNELS } from '../../constants/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Sends one message and records the attempt.
 *
 * Every notification is persisted whether or not the send succeeds, so a citizen
 * complaining they were never told can be answered from the record rather than
 * from the logs.
 */
async function deliver({ citizenId, requestId, channel, recipient, template, payload, send }) {
  const notification = await Notification.create({
    citizenId,
    requestId,
    channel,
    template,
    payload,
    recipient,
    status: 'QUEUED',
  });

  try {
    await send();
    notification.status = 'SENT';
    notification.sentAt = new Date();
  } catch (err) {
    logger.error({ err, channel, recipient, template }, 'Notification delivery failed');
    notification.status = 'FAILED';
  }

  await notification.save();
  return notification;
}

/**
 * Notifies the citizen that their request changed status.
 *
 * Never throws: a request whose status legitimately changed must not be rolled
 * back because an SMS gateway hiccuped. Failures are logged and recorded as
 * FAILED notifications instead.
 */
export async function notifyStatusChange({ request, status, note }) {
  const template = templateFor(status);
  if (!template) return []; // Nothing worth telling the citizen about.

  try {
    // The request may arrive with citizenId populated or as a bare id.
    const citizen =
      request.citizenId?.phone !== undefined
        ? request.citizenId
        : await Citizen.findById(request.citizenId).lean();

    if (!citizen) {
      logger.warn({ requestId: request._id, status }, 'No citizen to notify');
      return [];
    }

    const payload = {
      reference: request.reference,
      amountDue: request.amountDue,
      currency: request.currency,
      note,
      status,
    };
    const body = template.body(payload);
    const common = { citizenId: citizen._id, requestId: request._id, template: status, payload };

    const sent = [];

    if (citizen.phone) {
      sent.push(
        await deliver({
          ...common,
          channel: NOTIFICATION_CHANNELS.SMS,
          recipient: citizen.phone,
          send: () => sendSms({ to: citizen.phone, body }),
        }),
      );
    }

    // Email is a bonus channel: most citizens have a phone, not all have an inbox.
    if (citizen.email) {
      sent.push(
        await deliver({
          ...common,
          channel: NOTIFICATION_CHANNELS.EMAIL,
          recipient: citizen.email,
          send: () => sendEmail({ to: citizen.email, subject: template.subject, body }),
        }),
      );
    }

    return sent;
  } catch (err) {
    logger.error({ err, requestId: request._id, status }, 'Notification dispatch failed');
    return [];
  }
}

/**
 * Flushes the transitions queued on a request by the state machine.
 *
 * Called by `commitRequest` after the save succeeds — notifying before the write
 * lands would tell a citizen about a status change that might never persist.
 */
export async function notifyPendingTransitions(request) {
  const pending = request.$locals?.pendingTransitions ?? [];
  if (!pending.length) return [];

  request.$locals.pendingTransitions = [];

  const results = [];
  for (const { to, note } of pending) {
    results.push(...(await notifyStatusChange({ request, status: to, note })));
  }
  return results;
}
