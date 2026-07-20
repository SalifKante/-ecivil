import { Router } from 'express';
import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit';
import * as controller from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requestOtpSchema, verifyOtpSchema } from './auth.schema.js';

/**
 * Keyed on IP + NINA. Rate limiting on IP alone would let one attacker spray many
 * NINAs; on NINA alone it would let anyone lock a citizen out of their account.
 */
const keyByIpAndNina = (req, res) => `${ipKeyGenerator(req, res)}:${req.body?.nina ?? 'anon'}`;

// Exported so tests can reset counters between cases without disabling the limiter.
export const otpRequestStore = new MemoryStore();
export const otpVerifyStore = new MemoryStore();

const limiterOptions = (code, message) => ({
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyByIpAndNina,
  message: { error: { code, message } },
});

// SMS costs money and unsolicited codes are a nuisance to the citizen.
const requestOtpLimiter = rateLimit({
  ...limiterOptions('OTP_RATE_LIMITED', 'Too many code requests. Try again later.'),
  limit: 5,
  store: otpRequestStore,
});

// Brute-force guard, on top of the per-challenge attempt counter.
const verifyOtpLimiter = rateLimit({
  ...limiterOptions('OTP_RATE_LIMITED', 'Too many attempts. Try again later.'),
  limit: 10,
  store: otpVerifyStore,
});

const router = Router();

router.post(
  '/auth/otp/request',
  requestOtpLimiter,
  validate(requestOtpSchema),
  controller.requestOtp,
);

router.post('/auth/otp/verify', verifyOtpLimiter, validate(verifyOtpSchema), controller.verifyOtp);

router.get('/auth/me', requireAuth, controller.me);

export default router;
