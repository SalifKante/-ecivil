import * as paymentService from './payment.service.js';
import { PROVIDER_META } from '../../adapters/payment.js';

/** Providers the UI can offer, with the traits it needs to render each one. */
export async function listProviders(req, res) {
  const providers = Object.entries(PROVIDER_META).map(([code, meta]) => ({
    code,
    kind: meta.kind,
    label: meta.label,
    requiresPayerPhone: meta.requiresPayerPhone,
  }));
  res.json({ providers });
}

export async function initiate(req, res) {
  const payment = await paymentService.initiatePayment({
    requestId: req.params.id,
    citizenId: req.auth.id,
    provider: req.body.provider,
    payerPhone: req.body.payerPhone,
  });
  res.status(201).json({ payment });
}

export async function callback(req, res) {
  const { payment, request } = await paymentService.handleProviderCallback({
    requestId: req.params.id,
    citizenId: req.auth.id,
    providerRef: req.body.providerRef,
    outcome: req.body.outcome,
  });
  res.json({ payment, request });
}

export async function getOne(req, res) {
  const payment = await paymentService.getPaymentForRequest({
    requestId: req.params.id,
    citizenId: req.auth.id,
  });
  res.json({ payment });
}
