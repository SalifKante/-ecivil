import * as requestService from './request.service.js';
import { ApiError } from '../../utils/ApiError.js';

export async function create(req, res) {
  const request = await requestService.createDraft({
    citizenId: req.auth.id,
    serviceId: req.body.serviceId,
    formData: req.body.formData,
  });
  res.status(201).json({ request });
}

export async function update(req, res) {
  const request = await requestService.updateDraft({
    requestId: req.params.id,
    citizenId: req.auth.id,
    formData: req.body.formData,
    delivery: req.body.delivery,
  });
  res.json({ request });
}

export async function submit(req, res) {
  const request = await requestService.submitRequest({
    requestId: req.params.id,
    citizenId: req.auth.id,
  });
  res.json({ request });
}

export async function list(req, res) {
  const requests = await requestService.listForCitizen({ citizenId: req.auth.id });
  res.json({ requests });
}

export async function getOne(req, res) {
  const request = await requestService.getForCitizen({
    requestId: req.params.id,
    citizenId: req.auth.id,
  });
  res.json({ request });
}

export async function addAttachment(req, res) {
  if (!req.file) {
    throw ApiError.badRequest('NO_FILE', 'A file is required under the "file" field');
  }
  const attachment = await requestService.addAttachment({
    requestId: req.params.id,
    citizenId: req.auth.id,
    file: req.file,
    label: req.body?.label,
  });
  res.status(201).json({ attachment });
}

export async function removeAttachment(req, res) {
  await requestService.removeAttachment({
    requestId: req.params.id,
    citizenId: req.auth.id,
    attachmentId: req.params.attachmentId,
  });
  res.status(204).end();
}

export async function getAttachmentUrl(req, res) {
  const url = await requestService.getAttachmentUrl({
    requestId: req.params.id,
    citizenId: req.auth.id,
    attachmentId: req.params.attachmentId,
  });
  res.json({ url });
}
