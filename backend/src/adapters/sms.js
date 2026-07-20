import { logger } from '../utils/logger.js';
import { isProduction } from '../config/env.js';

/**
 * MOCK: SMS gateway.
 *
 * A real deployment would call an operator API (Orange, Malitel...). Here we log
 * the message instead. Nothing is ever actually sent to a phone number.
 */
export async function sendSms({ to, body }) {
  if (isProduction) {
    // Failing loudly beats silently pretending a citizen was notified.
    throw new Error('SMS adapter is a mock and must not run in production');
  }

  logger.info({ to, body }, '[MOCK SMS] message not actually sent');
  return { providerRef: `mock-sms-${Date.now()}`, status: 'SENT' };
}

export function otpMessage(code) {
  return `eCivil : votre code de connexion est ${code}. Il expire dans 5 minutes. Ne le partagez avec personne.`;
}
