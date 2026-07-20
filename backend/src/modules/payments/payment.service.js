import { Payment } from '../../models/index.js';
import { getOwnedRequest } from '../requests/request.service.js';
import { applyTransition, commitRequest } from '../requests/requestStateMachine.js';
import { ApiError } from '../../utils/ApiError.js';
import { PAYMENT_STATUS, REQUEST_STATUS, ROLES } from '../../constants/index.js';
import * as gateway from '../../adapters/payment.js';

/**
 * Opens a payment attempt for a request awaiting payment.
 *
 * The amount is taken from the request, never from the caller.
 */
export async function initiatePayment({ requestId, citizenId, provider, payerPhone }) {
  const request = await getOwnedRequest(requestId, citizenId);

  if (request.status !== REQUEST_STATUS.PENDING_PAYMENT) {
    throw ApiError.conflict(
      'NOT_PAYABLE',
      `A request can only be paid from ${REQUEST_STATUS.PENDING_PAYMENT}`,
      { status: request.status },
    );
  }

  if (!request.amountDue) {
    throw ApiError.conflict('NO_PAYMENT_DUE', 'This service is free — nothing to pay');
  }

  if (gateway.requiresPayerPhone(provider) && !payerPhone) {
    throw ApiError.badRequest(
      'PAYER_PHONE_REQUIRED',
      `${provider} requires the payer's mobile money number`,
    );
  }

  // Changing provider mid-flow abandons the previous attempt rather than leaving
  // two PENDING rows racing to settle the same request.
  await Payment.updateMany(
    { requestId: request._id, status: PAYMENT_STATUS.PENDING },
    { $set: { status: PAYMENT_STATUS.FAILED, failureReason: 'SUPERSEDED' } },
  );

  const { providerRef } = await gateway.initiatePayment({
    provider,
    amount: request.amountDue,
    currency: request.currency,
    reference: request.reference,
    payerPhone,
  });

  return Payment.create({
    requestId: request._id,
    citizenId,
    provider,
    amount: request.amountDue,
    currency: request.currency,
    status: PAYMENT_STATUS.PENDING,
    providerRef,
    payerPhone: gateway.requiresPayerPhone(provider) ? payerPhone : undefined,
  });
}

/**
 * Settles an attempt and, on success, moves the request PENDING_PAYMENT → PAID.
 *
 * MOCK: in a real system this is an unauthenticated server-to-server webhook whose
 * signature we verify. Here the citizen's own session drives it from the demo UI,
 * so ownership is still checked — the shortcut must not become a hole.
 */
export async function handleProviderCallback({ requestId, citizenId, providerRef, outcome }) {
  const request = await getOwnedRequest(requestId, citizenId);

  const payment = await Payment.findOne({ requestId: request._id, providerRef });
  if (!payment) throw ApiError.notFound('PAYMENT_NOT_FOUND', 'Payment attempt not found');

  const result = await gateway.confirmPayment({
    provider: payment.provider,
    providerRef,
    outcome,
  });

  const update = { status: result.status };
  if (result.status === PAYMENT_STATUS.SUCCEEDED) update.paidAt = result.settledAt;
  if (result.failureReason) update.failureReason = result.failureReason;

  // Conditional on PENDING, so settlement is atomic: a replayed or duplicated
  // callback finds the attempt already settled and is rejected, never paid twice.
  const settled = await Payment.findOneAndUpdate(
    { _id: payment._id, status: PAYMENT_STATUS.PENDING },
    { $set: update },
    { new: true },
  );

  if (!settled) {
    throw ApiError.conflict('PAYMENT_ALREADY_SETTLED', 'This payment attempt is already settled', {
      status: payment.status,
    });
  }

  if (settled.status === PAYMENT_STATUS.SUCCEEDED) {
    applyTransition(request, REQUEST_STATUS.PAID, {
      actor: { id: citizenId, role: ROLES.CITIZEN },
      note: `Paid ${settled.amount} ${settled.currency} via ${settled.provider}`,
    });
    request.paymentId = settled._id;
    await commitRequest(request);
  }

  return { payment: settled, request };
}

/** The latest attempt for a request — powers the payment screen and the receipt. */
export async function getPaymentForRequest({ requestId, citizenId }) {
  const request = await getOwnedRequest(requestId, citizenId);

  return Payment.findOne({ requestId: request._id }).sort({ createdAt: -1 }).lean();
}
