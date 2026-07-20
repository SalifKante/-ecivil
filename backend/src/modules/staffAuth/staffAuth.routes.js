import { Router } from 'express';
import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit';
import * as controller from './staffAuth.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireStaff } from '../../middleware/rbac.js';
import { staffLoginSchema } from './staffAuth.schema.js';

// Exported so tests can reset counters between cases without disabling the limiter.
export const staffLoginStore = new MemoryStore();

/**
 * Keyed on IP + email. On IP alone one attacker could spray many accounts; on
 * email alone anyone could lock a named official out of the back-office.
 */
const keyByIpAndEmail = (req, res) => `${ipKeyGenerator(req, res)}:${req.body?.email ?? 'anon'}`;

// Password endpoints are the brute-force target; tighter than the app-wide limiter.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: keyByIpAndEmail,
  store: staffLoginStore,
  message: {
    error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many attempts. Try again later.' },
  },
});

const router = Router();

router.post('/staff/auth/login', loginLimiter, validate(staffLoginSchema), controller.login);
router.get('/staff/auth/me', requireAuth, requireStaff, controller.me);

export default router;
