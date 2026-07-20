import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import servicesRoutes from './modules/services/services.routes.js';
import requestRoutes from './modules/requests/request.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import staffAuthRoutes from './modules/staffAuth/staffAuth.routes.js';
import staffRequestRoutes from './modules/staffRequests/staffRequest.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import {
  publicDocumentRoutes,
  staffDocumentRoutes,
  citizenDocumentRoutes,
} from './modules/documents/document.routes.js';
import docsRoutes from './docs/docs.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Docs mount before helmet: Swagger UI's inline assets trip helmet's default CSP.
  // Only the docs page is exempt; the whole API below keeps full helmet protection.
  if (env.DOCS_ENABLED) {
    app.use(docsRoutes);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Baseline limiter. Sensitive routes (OTP, payments) add stricter ones of their own.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    }),
  );

  app.use(healthRoutes);

  app.get('/api/v1', (req, res) => {
    res.json({
      service: 'eCivil API',
      version: 'v1',
      notice: 'PROTOTYPE — mock integrations, fictional data, no legal value.',
    });
  });

  app.use('/api/v1', authRoutes);
  app.use('/api/v1', servicesRoutes);
  // Public QR verification — must stay above the authenticated routers below.
  app.use('/api/v1', publicDocumentRoutes);
  // Back-office. Mounted on their own prefix so their staff-only guard applies to
  // /staff/* alone — on the bare /api/v1 it would 403 every citizen request that
  // reached it.
  app.use('/api/v1/staff', staffAuthRoutes);
  app.use('/api/v1/staff', staffRequestRoutes);
  app.use('/api/v1/staff', staffDocumentRoutes);
  app.use('/api/v1/staff', adminRoutes);

  // ORDER MATTERS: the citizen routers below apply `requireAuth` + CITIZEN via a
  // pathless router.use, which runs for every /api/v1 request that reaches them.
  // Anything public, or for staff, must be mounted ABOVE this line or it will 401.
  app.use('/api/v1', requestRoutes);
  app.use('/api/v1', paymentRoutes);
  app.use('/api/v1', citizenDocumentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
