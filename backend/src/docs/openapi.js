import { components } from './components.js';
import { paths } from './paths.js';
import { env } from '../config/env.js';

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'eCivil API',
    version: '0.1.0',
    description:
      'API of the eCivil unified digital citizenship platform (Mali).\n\n' +
      '**⚠️ Prototype** — all external integrations (NINA registry, SMS, payments) are mocked, ' +
      'all data is fictional, and generated documents have no legal value.\n\n' +
      'Log in with a demo NINA (e.g. `99990000000101`); the OTP is returned as `devCode` in ' +
      'development. Paste the token from `/auth/otp/verify` into **Authorize** to call ' +
      'protected endpoints.',
    license: { name: 'UNLICENSED' },
  },
  servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local development' }],
  tags: [
    { name: 'System', description: 'Health and service metadata' },
    { name: 'Auth', description: 'NINA + OTP authentication' },
    { name: 'Services', description: 'Public service catalog (four modules)' },
    { name: 'Requests', description: 'Citizen request lifecycle (auth required)' },
    { name: 'Payments', description: 'Mock mobile money and card payments (auth required)' },
    { name: 'Back-office', description: 'Staff authentication and request review (RBAC)' },
    { name: 'Documents', description: 'Demo document issuance and public QR verification' },
    { name: 'Administration', description: 'Module-admin and super-admin management + stats' },
  ],
  // Applied by default; endpoints that are public override with `security: []`.
  security: [{ bearerAuth: [] }],
  components,
  paths,
};
