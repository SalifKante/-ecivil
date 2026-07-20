import { logger } from '../utils/logger.js';
import { isProduction } from '../config/env.js';

/**
 * MOCK: email gateway.
 *
 * A real deployment would call an SMTP relay or a transactional provider. Here we
 * log the message instead. Nothing is ever actually delivered to an inbox.
 */
export async function sendEmail({ to, subject, body }) {
  if (isProduction) {
    // Failing loudly beats silently pretending a citizen was notified.
    throw new Error('Email adapter is a mock and must not run in production');
  }

  logger.info({ to, subject, body }, '[MOCK EMAIL] message not actually sent');
  return { providerRef: `mock-email-${Date.now()}`, status: 'SENT' };
}
