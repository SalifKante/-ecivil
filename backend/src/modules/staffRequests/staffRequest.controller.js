import * as staffRequestService from './staffRequest.service.js';

export async function list(req, res) {
  const result = await staffRequestService.listRequests({
    auth: req.auth,
    ...req.validated.query,
  });
  res.json(result);
}

export async function getOne(req, res) {
  const request = await staffRequestService.getRequest({
    auth: req.auth,
    requestId: req.params.id,
    ip: req.ip,
  });
  res.json({ request });
}

export async function assign(req, res) {
  const request = await staffRequestService.assignRequest({
    auth: req.auth,
    requestId: req.params.id,
    ip: req.ip,
  });
  res.json({ request });
}

export async function approve(req, res) {
  const request = await staffRequestService.approveRequest({
    auth: req.auth,
    requestId: req.params.id,
    note: req.body.note,
    ip: req.ip,
  });
  res.json({ request });
}

export async function reject(req, res) {
  const request = await staffRequestService.rejectRequest({
    auth: req.auth,
    requestId: req.params.id,
    reason: req.body.reason,
    ip: req.ip,
  });
  res.json({ request });
}

export async function requestInfo(req, res) {
  const request = await staffRequestService.requestInfo({
    auth: req.auth,
    requestId: req.params.id,
    note: req.body.note,
    ip: req.ip,
  });
  res.json({ request });
}

export async function getAttachmentUrl(req, res) {
  const url = await staffRequestService.getAttachmentUrl({
    auth: req.auth,
    requestId: req.params.id,
    attachmentId: req.params.attachmentId,
    ip: req.ip,
  });
  res.json({ url });
}
