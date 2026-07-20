import { Request, Counter } from '../../models/index.js';
import { getServiceById } from '../services/services.service.js';
import { applyTransition, commitRequest } from './requestStateMachine.js';
import { ApiError } from '../../utils/ApiError.js';
import { REQUEST_STATUS, ROLES } from '../../constants/index.js';
import * as storage from '../../adapters/storage.js';

/** ECV-2026-000042 — human-readable, per-year sequence. */
async function generateReference(year) {
  const seq = await Counter.next(`request:${year}`);
  return `ECV-${year}-${String(seq).padStart(6, '0')}`;
}

/**
 * Loads a request and asserts the citizen owns it. Ownership is enforced here, once —
 * exported so sibling services (payments) reuse the rule instead of restating it.
 */
export async function getOwnedRequest(requestId, citizenId) {
  const request = await Request.findById(requestId);
  if (!request) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');

  if (String(request.citizenId) !== String(citizenId)) {
    // Don't reveal that the request exists to a non-owner.
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');
  }
  return request;
}

export async function createDraft({ citizenId, serviceId, formData = {} }) {
  const service = await getServiceById(serviceId);
  const year = new Date().getFullYear();

  const request = await Request.create({
    reference: await generateReference(year),
    citizenId,
    serviceId: service._id,
    moduleKey: service.moduleKey,
    status: REQUEST_STATUS.DRAFT,
    amountDue: service.fee,
    currency: service.currency,
    formData,
    timeline: [{ to: REQUEST_STATUS.DRAFT, actorId: citizenId, actorRole: ROLES.CITIZEN }],
  });

  return request;
}

export async function updateDraft({ requestId, citizenId, formData, delivery }) {
  const request = await getOwnedRequest(requestId, citizenId);

  if (request.status !== REQUEST_STATUS.DRAFT) {
    throw ApiError.conflict('NOT_EDITABLE', 'Only a draft request can be edited');
  }

  if (formData) request.formData = { ...request.formData, ...formData };
  if (delivery) request.delivery = { ...request.delivery, ...delivery };

  await request.save();
  return request;
}

/**
 * Submit: DRAFT → SUBMITTED, then automatically to PENDING_PAYMENT with the amount
 * due carried from the service fee. A free service settles straight through to PAID.
 *
 * DRAFT only, deliberately. The state machine also permits NEEDS_INFO → SUBMITTED,
 * but a request in NEEDS_INFO has already been paid, and this function's next step
 * is always PENDING_PAYMENT — so resubmitting through here would ask the citizen to
 * pay a second time for the same request. Completing a NEEDS_INFO file needs its own
 * path that preserves the settled payment; until that exists, the door stays shut.
 */
export async function submitRequest({ requestId, citizenId }) {
  const request = await getOwnedRequest(requestId, citizenId);
  const actor = { id: citizenId, role: ROLES.CITIZEN };

  if (request.status !== REQUEST_STATUS.DRAFT) {
    throw ApiError.conflict('NOT_SUBMITTABLE', 'Only a draft request can be submitted', {
      status: request.status,
    });
  }

  applyTransition(request, REQUEST_STATUS.SUBMITTED, { actor, note: 'Submitted by citizen' });
  request.submittedAt = new Date();

  // System step — the citizen doesn't act here; the platform moves it forward.
  applyTransition(request, REQUEST_STATUS.PENDING_PAYMENT, {
    actor: { role: 'SYSTEM' },
    note: `Amount due: ${request.amountDue} ${request.currency}`,
  });

  // A free service (e.g. déclaration de naissance, fee 0) has nothing to charge.
  // Settle it here, or it would wait forever for a payment that cannot exist.
  if (!request.amountDue) {
    applyTransition(request, REQUEST_STATUS.PAID, {
      actor: { role: 'SYSTEM' },
      note: 'Free service — no payment due',
    });
  }

  await commitRequest(request);
  return request;
}

export async function addAttachment({ requestId, citizenId, file, label }) {
  const request = await getOwnedRequest(requestId, citizenId);

  if (request.status !== REQUEST_STATUS.DRAFT) {
    throw ApiError.conflict('NOT_EDITABLE', 'Documents can only be added to a draft');
  }

  const { storageKey, mimeType, sizeBytes } = await storage.putObject({
    buffer: file.buffer,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    prefix: `requests/${request._id}`,
  });

  request.attachments.push({
    storageKey,
    mimeType,
    sizeBytes,
    originalName: file.originalname,
    label,
    uploadedBy: citizenId,
    uploadedByModel: 'Citizen',
  });
  await request.save();

  return request.attachments.at(-1);
}

export async function removeAttachment({ requestId, citizenId, attachmentId }) {
  const request = await getOwnedRequest(requestId, citizenId);

  if (request.status !== REQUEST_STATUS.DRAFT) {
    throw ApiError.conflict('NOT_EDITABLE', 'Documents can only be removed from a draft');
  }

  const attachment = request.attachments.id(attachmentId);
  if (!attachment) throw ApiError.notFound('ATTACHMENT_NOT_FOUND', 'Attachment not found');

  await storage.removeObject(attachment.storageKey);
  attachment.deleteOne();
  await request.save();
}

/** A short-lived download link for one of the request's own attachments. */
export async function getAttachmentUrl({ requestId, citizenId, attachmentId }) {
  const request = await getOwnedRequest(requestId, citizenId);
  const attachment = request.attachments.id(attachmentId);
  if (!attachment) throw ApiError.notFound('ATTACHMENT_NOT_FOUND', 'Attachment not found');

  return storage.getSignedUrl(attachment.storageKey);
}

export async function listForCitizen({ citizenId }) {
  return Request.find({ citizenId })
    .sort({ createdAt: -1 })
    .populate('serviceId', 'code label moduleKey')
    .lean();
}

export async function getForCitizen({ requestId, citizenId }) {
  const request = await Request.findById(requestId)
    .populate('serviceId', 'code label moduleKey requiredDocuments fee currency')
    .lean();

  if (!request || String(request.citizenId) !== String(citizenId)) {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');
  }
  return request;
}
