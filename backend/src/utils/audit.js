import { AuditLog } from '../models/index.js';
import { logger } from './logger.js';

/**
 * Append-only record of who did what. Written for every staff action that changes
 * state or reads a citizen's documents.
 *
 * Deliberately never throws: a failed audit write must not roll back or 500 an
 * action the citizen already saw succeed. It is logged loudly instead, so the gap
 * is visible rather than silent.
 */
export async function recordAudit({ actorId, actorRole, action, entity, entityId, meta, ip }) {
  try {
    await AuditLog.create({ actorId, actorRole, action, entity, entityId, meta, ip });
  } catch (err) {
    logger.error({ err, action, entity, entityId }, 'Audit write failed');
  }
}

/** Actions recorded by the back-office. Kept as constants so queries stay greppable. */
export const AUDIT_ACTIONS = Object.freeze({
  STAFF_LOGIN: 'STAFF_LOGIN',
  STAFF_LOGIN_FAILED: 'STAFF_LOGIN_FAILED',
  REQUEST_VIEWED: 'REQUEST_VIEWED',
  REQUEST_ASSIGNED: 'REQUEST_ASSIGNED',
  REQUEST_APPROVED: 'REQUEST_APPROVED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REQUEST_INFO_REQUESTED: 'REQUEST_INFO_REQUESTED',
  ATTACHMENT_DOWNLOADED: 'ATTACHMENT_DOWNLOADED',
  DOCUMENT_ISSUED: 'DOCUMENT_ISSUED',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  SERVICE_CREATED: 'SERVICE_CREATED',
  SERVICE_UPDATED: 'SERVICE_UPDATED',
});
