import { apiClient } from '../../lib/apiClient';

export async function fetchProviders() {
  const { data } = await apiClient.get('/payments/providers');
  return data.providers;
}

export async function fetchPayment(requestId) {
  const { data } = await apiClient.get(`/requests/${requestId}/payment`);
  return data.payment;
}

/** Opens an attempt. The amount is decided server-side from the request. */
export async function initiatePayment(requestId, { provider, payerPhone }) {
  const { data } = await apiClient.post(`/requests/${requestId}/payment`, {
    provider,
    ...(payerPhone ? { payerPhone } : {}),
  });
  return data.payment;
}

/**
 * MOCK: stands in for the gateway's callback. The demo picks the outcome so a
 * refusal can be shown too; a real provider decides this itself.
 */
export async function settlePayment(requestId, { providerRef, outcome }) {
  const { data } = await apiClient.post(`/requests/${requestId}/payment/callback`, {
    providerRef,
    outcome,
  });
  return data;
}
