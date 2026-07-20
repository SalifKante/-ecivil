import { logger } from '../utils/logger.js';
import { isProduction } from '../config/env.js';
import { PAYMENT_PROVIDERS, PAYMENT_STATUS, PAYMENT_OUTCOMES } from '../constants/index.js';

/**
 * MOCK: mobile money and card payment gateway.
 *
 * A real deployment would call the Orange Money / Wave merchant APIs and a bank
 * acquirer, then wait for a signed server-to-server callback. Here nothing is
 * charged and no money moves: `initiatePayment` mints a fake provider reference
 * and `confirmPayment` settles whichever way the demo operator chose.
 *
 * Keep this module's shape stable: it is the seam a real integration slots into.
 * The service layer never learns which provider is mocked — see CLAUDE.md §2.
 */

/**
 * Per-provider traits the rest of the app is allowed to branch on.
 * `kind` drives the UI: mobile money asks for a number and simulates a USSD push,
 * a card redirects to the partner bank. No card data is ever collected — a
 * prototype has no business rendering something that looks like a real card form.
 */
export const PROVIDER_META = Object.freeze({
  [PAYMENT_PROVIDERS.ORANGE_MONEY]: Object.freeze({
    kind: 'MOBILE_MONEY',
    label: 'Orange Money',
    requiresPayerPhone: true,
    refPrefix: 'OM',
  }),
  [PAYMENT_PROVIDERS.WAVE]: Object.freeze({
    kind: 'MOBILE_MONEY',
    label: 'Wave',
    requiresPayerPhone: true,
    refPrefix: 'WV',
  }),
  [PAYMENT_PROVIDERS.CARD]: Object.freeze({
    kind: 'CARD',
    label: 'Carte bancaire',
    requiresPayerPhone: false,
    refPrefix: 'CB',
  }),
});

export function requiresPayerPhone(provider) {
  return PROVIDER_META[provider]?.requiresPayerPhone ?? false;
}

function assertMockable() {
  if (isProduction) {
    // Failing loudly beats silently pretending a citizen was charged.
    throw new Error('Payment adapter is a mock and must not run in production');
  }
}

// Counter only disambiguates two references minted in the same millisecond.
let sequence = 0;

function mockProviderRef(provider) {
  sequence += 1;
  const stamp = Date.now().toString(36).toUpperCase();
  return `${PROVIDER_META[provider].refPrefix}-MOCK-${stamp}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Opens a payment attempt. Returns the provider's reference for it.
 *
 * The amount is passed in by the service layer, which reads it from the request —
 * a client-supplied amount never reaches this function.
 */
export async function initiatePayment({ provider, amount, currency, reference, payerPhone }) {
  assertMockable();

  const providerRef = mockProviderRef(provider);

  logger.info(
    { provider, amount, currency, reference, payerPhone, providerRef },
    '[MOCK PAYMENT] attempt opened — no real charge',
  );

  return { providerRef, status: PAYMENT_STATUS.PENDING };
}

/**
 * Settles an attempt.
 *
 * MOCK: the outcome is an explicit input so the demo can show both a success and a
 * refusal on request. A real gateway decides this itself and tells us via a signed
 * callback; the `outcome` parameter disappears when that integration lands.
 */
export async function confirmPayment({ provider, providerRef, outcome }) {
  assertMockable();

  const succeeded = outcome === PAYMENT_OUTCOMES.SUCCESS;

  logger.info({ provider, providerRef, outcome }, '[MOCK PAYMENT] attempt settled');

  return succeeded
    ? { status: PAYMENT_STATUS.SUCCEEDED, settledAt: new Date() }
    : { status: PAYMENT_STATUS.FAILED, failureReason: 'DECLINED_BY_PAYER' };
}
