import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment schema. The app refuses to boot on an invalid config rather than
 * failing later at an unpredictable point.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Long enough that a leaked short secret can't be brute-forced offline.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('30m'),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // MinIO / S3 object storage. Use the scoped app credentials, never MinIO root.
  MINIO_ENDPOINT: z.string().default('127.0.0.1'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  MINIO_ACCESS_KEY: z.string().min(1, 'MINIO_ACCESS_KEY is required'),
  MINIO_SECRET_KEY: z.string().min(1, 'MINIO_SECRET_KEY is required'),
  MINIO_BUCKET: z.string().default('ecivil-documents'),
  MINIO_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // Public base URL of the citizen site. Embedded in document QR codes, so a
  // scanned code resolves to the verification page rather than to the API.
  APP_PUBLIC_URL: z.string().url().default('http://localhost:5173'),

  // API docs. On by default; a real deployment would gate or disable this.
  DOCS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Invalid environment configuration:\n${issues.join('\n')}`);
  console.error('\nCopy .env.example to .env and fill in the values.');
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
