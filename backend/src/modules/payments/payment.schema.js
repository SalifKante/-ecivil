import { z } from 'zod';
import { PAYMENT_PROVIDERS, PAYMENT_OUTCOMES } from '../../constants/index.js';

/**
 * Note what is absent: an `amount`. The amount charged is read from the request
 * server-side, so a client cannot choose what it pays.
 */
export const initiatePaymentSchema = z.object({
  provider: z.enum(Object.values(PAYMENT_PROVIDERS)),
  // Mobile money wallet to debit. Required per-provider in the service layer.
  payerPhone: z
    .string()
    .trim()
    .regex(/^\+?\d{8,15}$/, 'Invalid phone number')
    .optional(),
});

/** MOCK: a real gateway callback would carry a signature, not a chosen outcome. */
export const paymentCallbackSchema = z.object({
  providerRef: z.string().trim().min(1),
  outcome: z.enum(Object.values(PAYMENT_OUTCOMES)),
});
