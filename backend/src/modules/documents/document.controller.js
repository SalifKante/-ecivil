import * as documentService from './document.service.js';

/** Staff: issue the demo document for an approved request. */
export async function issue(req, res) {
  const { document, request } = await documentService.issueDocument({
    auth: req.auth,
    requestId: req.params.id,
    ip: req.ip,
  });
  res.status(201).json({ document, request });
}

/** Citizen: short-lived download link for their own document. */
export async function getMyDocumentUrl(req, res) {
  const url = await documentService.getDocumentUrlForCitizen({
    requestId: req.params.id,
    citizenId: req.auth.id,
  });
  res.json({ url });
}

/** Public: verify a document by the token encoded in its QR code. */
export async function verify(req, res) {
  const result = await documentService.verifyByToken(req.params.qrToken);
  res.json(result);
}
