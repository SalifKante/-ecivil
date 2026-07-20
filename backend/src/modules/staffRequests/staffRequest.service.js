import { Request } from '../../models/index.js';
import { applyTransition, commitRequest } from '../requests/requestStateMachine.js';
import { ApiError } from '../../utils/ApiError.js';
import { assertModuleAccess, moduleScopeFilter } from '../../middleware/rbac.js';
import { recordAudit, AUDIT_ACTIONS } from '../../utils/audit.js';
import { REQUEST_STATUS, ROLES } from '../../constants/index.js';
import * as storage from '../../adapters/storage.js';

/** Roles allowed to decide on a request they are not personally assigned to. */
const SUPERVISOR_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

/**
 * A draft belongs to the citizen alone — it has not been submitted to the
 * administration and must never surface in a back-office queue.
 */
const INBOX_EXCLUDED = [REQUEST_STATUS.DRAFT];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Loads a request and asserts the caller's module scope covers it.
 *
 * 404 rather than 403 when out of scope: an agent for Titres Fonciers should not
 * learn that a given passport request exists.
 */
async function getScopedRequest(requestId, auth) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');

  if (INBOX_EXCLUDED.includes(request.status)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');
  }

  try {
    assertModuleAccess(auth, request.moduleKey);
  } catch {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');
  }

  return request;
}

/** The agent inbox: everything visible to this principal, newest first. */
export async function listRequests({ auth, status, moduleKey, q, assigned, page, limit }) {
  const filter = { status: { $nin: INBOX_EXCLUDED } };

  const scope = moduleScopeFilter(auth);
  if (scope) filter.moduleKey = scope;

  // An explicit moduleKey narrows within the scope; it can never widen it.
  if (moduleKey) {
    assertModuleAccess(auth, moduleKey);
    filter.moduleKey = moduleKey;
  }

  if (status) filter.status = status;
  if (q) filter.reference = new RegExp(escapeRegex(q), 'i');
  if (assigned === 'me') filter.assignedAgentId = auth.id;
  if (assigned === 'unassigned') filter.assignedAgentId = null;

  const [requests, total] = await Promise.all([
    Request.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('serviceId', 'code label moduleKey processingDays')
      .populate('citizenId', 'nina firstName lastName')
      .populate('assignedAgentId', 'fullName email')
      .lean(),
    Request.countDocuments(filter),
  ]);

  return { requests, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getRequest({ auth, requestId, ip }) {
  await getScopedRequest(requestId, auth);

  const request = await Request.findById(requestId)
    .populate('serviceId', 'code label moduleKey requiredDocuments fee currency processingDays')
    .populate('citizenId', 'nina firstName lastName birthDate phone email isDiaspora consulate')
    .populate('assignedAgentId', 'fullName email')
    .lean();

  // Reading a citizen's file is itself a privileged act, so it is recorded.
  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.REQUEST_VIEWED,
    entity: 'Request',
    entityId: request._id,
    meta: { reference: request.reference },
    ip,
  });

  return request;
}

/**
 * Take a request: assign it to the caller and open the review.
 *
 * PAID → UNDER_REVIEW is the transition that starts the work. Re-taking an
 * already-open request is allowed for the same agent (idempotent) and for
 * supervisors, who may reassign.
 */
export async function assignRequest({ auth, requestId, ip }) {
  const request = await getScopedRequest(requestId, auth);

  const alreadyOwned = request.assignedAgentId && String(request.assignedAgentId) !== auth.id;
  if (alreadyOwned && !SUPERVISOR_ROLES.includes(auth.role)) {
    throw ApiError.conflict('ALREADY_ASSIGNED', 'Another agent is handling this request');
  }

  request.assignedAgentId = auth.id;

  // Only the first take moves the status; a reassignment leaves it under review.
  if (request.status === REQUEST_STATUS.PAID) {
    applyTransition(request, REQUEST_STATUS.UNDER_REVIEW, {
      actor: { id: auth.id, role: auth.role },
      note: 'Review started',
    });
  }

  await commitRequest(request);

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.REQUEST_ASSIGNED,
    entity: 'Request',
    entityId: request._id,
    meta: { reference: request.reference, reassigned: Boolean(alreadyOwned) },
    ip,
  });

  return request;
}

/**
 * Guards every decision: the request must be open, and the caller must be the
 * agent holding it (or a supervisor). Without the ownership half, any agent in
 * the module could decide a case another agent is actively working.
 */
function assertMayDecide(request, auth) {
  if (request.status !== REQUEST_STATUS.UNDER_REVIEW) {
    throw ApiError.conflict('NOT_UNDER_REVIEW', 'Take the request before deciding on it', {
      status: request.status,
    });
  }

  const isHolder = String(request.assignedAgentId ?? '') === auth.id;
  if (!isHolder && !SUPERVISOR_ROLES.includes(auth.role)) {
    throw ApiError.forbidden('NOT_ASSIGNED', 'This request is assigned to another agent');
  }
}

async function decide({ auth, requestId, ip, to, note, action, extra = {} }) {
  const request = await getScopedRequest(requestId, auth);
  assertMayDecide(request, auth);

  applyTransition(request, to, { actor: { id: auth.id, role: auth.role }, note });
  Object.assign(request, extra);
  await commitRequest(request);

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action,
    entity: 'Request',
    entityId: request._id,
    meta: { reference: request.reference, note },
    ip,
  });

  return request;
}

export async function approveRequest({ auth, requestId, note, ip }) {
  return decide({
    auth,
    requestId,
    ip,
    to: REQUEST_STATUS.APPROVED,
    note: note || 'Approved',
    action: AUDIT_ACTIONS.REQUEST_APPROVED,
  });
}

export async function rejectRequest({ auth, requestId, reason, ip }) {
  return decide({
    auth,
    requestId,
    ip,
    to: REQUEST_STATUS.REJECTED,
    note: reason,
    action: AUDIT_ACTIONS.REQUEST_REJECTED,
    extra: { rejectionReason: reason },
  });
}

/** NEEDS_INFO hands the file back to the citizen, who can resubmit it. */
export async function requestInfo({ auth, requestId, note, ip }) {
  return decide({
    auth,
    requestId,
    ip,
    to: REQUEST_STATUS.NEEDS_INFO,
    note,
    action: AUDIT_ACTIONS.REQUEST_INFO_REQUESTED,
  });
}

/** Short-lived link to a supporting document, recorded because it is citizen data. */
export async function getAttachmentUrl({ auth, requestId, attachmentId, ip }) {
  const request = await getScopedRequest(requestId, auth);

  const attachment = request.attachments.id(attachmentId);
  if (!attachment) throw ApiError.notFound('ATTACHMENT_NOT_FOUND', 'Attachment not found');

  const url = await storage.getSignedUrl(attachment.storageKey);

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.ATTACHMENT_DOWNLOADED,
    entity: 'Request',
    entityId: request._id,
    meta: { reference: request.reference, attachmentId, originalName: attachment.originalName },
    ip,
  });

  return url;
}
