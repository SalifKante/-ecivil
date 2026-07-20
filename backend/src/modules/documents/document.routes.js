import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import * as controller from './document.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { requireStaff } from '../../middleware/rbac.js';
import { ROLES } from '../../constants/index.js';

/**
 * Three audiences, three routers, mounted separately in app.js so each carries
 * only the guard it needs — the public verification route in particular must not
 * sit behind an authenticated router.
 */

// Exported so tests can reset counters between cases without disabling the limiter.
export const verifyStore = new MemoryStore();

/**
 * Unauthenticated and enumerable in principle, so it is limited harder than the
 * app-wide default. Tokens are 32 random bytes, so brute force is impractical
 * anyway; this caps the damage of someone trying.
 */
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: verifyStore,
  message: {
    error: { code: 'VERIFY_RATE_LIMITED', message: 'Too many verification attempts' },
  },
});

/** Public — mounted above every authenticated router. */
export const publicDocumentRoutes = Router();
publicDocumentRoutes.get('/verify/:qrToken', verifyLimiter, controller.verify);

/** Back-office — mounted under /api/v1/staff. */
export const staffDocumentRoutes = Router();
staffDocumentRoutes.use(requireAuth, requireStaff);
staffDocumentRoutes.post('/requests/:id/issue', controller.issue);

/** Citizen — mounted under /api/v1. */
export const citizenDocumentRoutes = Router();
citizenDocumentRoutes.use(requireAuth, requireRole(ROLES.CITIZEN));
citizenDocumentRoutes.get('/requests/:id/document', controller.getMyDocumentUrl);
