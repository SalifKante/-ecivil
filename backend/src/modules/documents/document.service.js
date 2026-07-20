import { randomBytes } from 'node:crypto';
import { Document, Request } from '../../models/index.js';
import { renderDocumentPdf } from './documentPdf.js';
import { applyTransition, commitRequest } from '../requests/requestStateMachine.js';
import { ApiError } from '../../utils/ApiError.js';
import { assertModuleAccess } from '../../middleware/rbac.js';
import { recordAudit, AUDIT_ACTIONS } from '../../utils/audit.js';
import { REQUEST_STATUS } from '../../constants/index.js';
import { env } from '../../config/env.js';
import * as storage from '../../adapters/storage.js';

/**
 * 32 bytes of randomness, base64url. The token is the only thing standing between
 * a guess and someone else's verification record, so it must not be derived from
 * the reference or any other predictable value.
 */
function generateQrToken() {
  return randomBytes(32).toString('base64url');
}

export function verificationUrl(qrToken) {
  return `${env.APP_PUBLIC_URL}/verifier/${qrToken}`;
}

/**
 * Issues the demo document for an approved request: renders the PDF, stores it
 * privately, and moves APPROVED → ISSUED.
 *
 * Deliberately a separate act from approving. Approval is a decision and must not
 * fail because object storage is briefly unavailable; if issuing fails the request
 * stays APPROVED and can be retried.
 */
export async function issueDocument({ auth, requestId, ip }) {
  const request = await Request.findById(requestId)
    .populate('serviceId', 'code label moduleKey')
    .populate('citizenId', 'nina firstName lastName birthDate birthPlace');

  if (!request) throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');

  try {
    assertModuleAccess(auth, request.moduleKey);
  } catch {
    throw ApiError.notFound('REQUEST_NOT_FOUND', 'Request not found');
  }

  // Checked before the status guard: once issued the request has moved past
  // APPROVED, and answering "not approved" to a second attempt would be both
  // true and useless. Re-issuing would also orphan the first PDF and invalidate
  // a QR code the citizen may already be holding.
  const existing = await Document.findOne({ requestId: request._id });
  if (existing) {
    throw ApiError.conflict('ALREADY_ISSUED', 'A document has already been issued', {
      documentId: existing._id,
    });
  }

  if (request.status !== REQUEST_STATUS.APPROVED) {
    throw ApiError.conflict('NOT_APPROVED', 'Only an approved request can be issued', {
      status: request.status,
    });
  }

  const qrToken = generateQrToken();
  const citizen = request.citizenId;

  const pdf = await renderDocumentPdf({
    title: request.serviceId?.label ?? 'Document administratif',
    reference: request.reference,
    citizen,
    verifyUrl: verificationUrl(qrToken),
    issuedAt: new Date(),
  });

  const { storageKey } = await storage.putObject({
    buffer: pdf,
    mimeType: 'application/pdf',
    prefix: `documents/${request._id}`,
  });

  const document = await Document.create({
    requestId: request._id,
    citizenId: citizen._id,
    type: request.serviceId?.code ?? 'DOCUMENT',
    storageKey,
    qrToken,
  });

  applyTransition(request, REQUEST_STATUS.ISSUED, {
    actor: { id: auth.id, role: auth.role },
    note: 'Demo document issued',
  });
  request.documentId = document._id;
  await commitRequest(request);

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.DOCUMENT_ISSUED,
    entity: 'Document',
    entityId: document._id,
    meta: { reference: request.reference },
    ip,
  });

  return { document, request };
}

/** Short-lived download link, for the citizen who owns the request. */
export async function getDocumentUrlForCitizen({ requestId, citizenId }) {
  const document = await Document.findOne({ requestId });
  if (!document) throw ApiError.notFound('DOCUMENT_NOT_FOUND', 'No document for this request');

  if (String(document.citizenId) !== String(citizenId)) {
    throw ApiError.notFound('DOCUMENT_NOT_FOUND', 'No document for this request');
  }

  if (document.isRevoked) {
    throw ApiError.conflict('DOCUMENT_REVOKED', 'This document has been revoked');
  }

  return storage.getSignedUrl(document.storageKey);
}

/**
 * Public verification by QR token. No authentication — anyone holding the document
 * can check it.
 *
 * Returns only what a verifier legitimately needs: whether it is valid, what it is,
 * and when it was issued. Deliberately NOT the citizen's full record — a scanned QR
 * code must not become an identity-lookup oracle. The prototype disclaimer is part
 * of the payload so no caller can present this as a genuine check.
 */
export async function verifyByToken(qrToken) {
  const document = await Document.findOne({ qrToken })
    .populate('requestId', 'reference moduleKey')
    .populate('citizenId', 'firstName lastName')
    .lean();

  if (!document) {
    return {
      valid: false,
      reason: 'UNKNOWN_TOKEN',
      disclaimer: PROTOTYPE_DISCLAIMER,
    };
  }

  const citizen = document.citizenId;

  return {
    valid: !document.isRevoked,
    reason: document.isRevoked ? 'REVOKED' : null,
    document: {
      type: document.type,
      reference: document.requestId?.reference,
      moduleKey: document.requestId?.moduleKey,
      issuedAt: document.issuedAt,
      // Initial only: enough to confirm the document matches the person in front
      // of you, without handing a full identity to anyone who scans the code.
      holder: citizen ? `${citizen.firstName} ${citizen.lastName?.[0] ?? ''}.` : null,
    },
    disclaimer: PROTOTYPE_DISCLAIMER,
  };
}

export const PROTOTYPE_DISCLAIMER =
  'PROTOTYPE — Ce document est un spécimen de démonstration sans valeur légale. ' +
  'Les données sont fictives.';
