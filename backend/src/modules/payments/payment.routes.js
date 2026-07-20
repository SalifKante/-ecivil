import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import * as controller from './payment.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { initiatePaymentSchema, paymentCallbackSchema } from './payment.schema.js';
import { ROLES } from '../../constants/index.js';

// Exported so tests can reset counters between cases without disabling the limiter.
export const paymentStore = new MemoryStore();

/**
 * Tighter than the app-wide limiter: a payment endpoint is where a stolen session
 * would be spent, and a legitimate citizen needs only a handful of attempts.
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: paymentStore,
  message: {
    error: { code: 'PAYMENT_RATE_LIMITED', message: 'Too many payment attempts. Try again later.' },
  },
});

// Payments are citizen-owned. Ownership is re-checked in the service layer.
const router = Router();

router.use(requireAuth, requireRole(ROLES.CITIZEN));

router.get('/payments/providers', controller.listProviders);

router.get('/requests/:id/payment', controller.getOne);

router.post(
  '/requests/:id/payment',
  paymentLimiter,
  validate(initiatePaymentSchema),
  controller.initiate,
);

// MOCK: stands in for the gateway's server-to-server webhook (see payment.service).
router.post(
  '/requests/:id/payment/callback',
  paymentLimiter,
  validate(paymentCallbackSchema),
  controller.callback,
);

export default router;
