import * as authService from './auth.service.js';
import { findByNina } from '../../adapters/ninaRegistry.js';
import { ApiError } from '../../utils/ApiError.js';

export async function requestOtp(req, res) {
  const result = await authService.requestOtp({ nina: req.body.nina, ip: req.ip });
  res.status(202).json(result);
}

export async function verifyOtp(req, res) {
  const result = await authService.verifyOtp({
    nina: req.body.nina,
    code: req.body.code,
    ip: req.ip,
  });
  res.json(result);
}

/** The authenticated citizen's own registry record — powers form pre-filling. */
export async function me(req, res) {
  const record = await findByNina(req.auth.nina);
  if (!record) throw ApiError.notFound('CITIZEN_NOT_FOUND', 'Citizen not found');

  res.json({ citizen: record });
}
