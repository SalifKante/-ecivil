import { randomUUID } from 'node:crypto';
import path from 'node:path';
import * as Minio from 'minio';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * REAL adapter — self-hosted MinIO (S3-compatible), see CLAUDE.md §2.
 *
 * The ONLY module that talks to the object store. Services and controllers go
 * through here so the store stays private, keys are server-generated, and a
 * later move (managed S3, sovereign cloud) is a single-file change.
 */

const ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['application/pdf', 'pdf'],
]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const client = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const BUCKET = env.MINIO_BUCKET;

export function assertUploadAllowed({ mimeType, sizeBytes }) {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw ApiError.badRequest('UNSUPPORTED_FILE_TYPE', `Type not allowed: ${mimeType}`, {
      allowed: [...ALLOWED_MIME.keys()],
    });
  }
  if (sizeBytes > MAX_SIZE_BYTES) {
    throw ApiError.badRequest('FILE_TOO_LARGE', 'File exceeds the 5 MB limit', {
      maxBytes: MAX_SIZE_BYTES,
    });
  }
}

/**
 * Stores a buffer under a server-generated key. The client filename is never
 * used as (or in) the key — only recorded separately for display.
 * Key shape: requests/<requestId>/<uuid>.<ext>
 */
export async function putObject({ buffer, mimeType, prefix, sizeBytes }) {
  assertUploadAllowed({ mimeType, sizeBytes: sizeBytes ?? buffer.length });

  const ext = ALLOWED_MIME.get(mimeType);
  const storageKey = path.posix.join(prefix, `${randomUUID()}.${ext}`);

  await client.putObject(BUCKET, storageKey, buffer, buffer.length, {
    'Content-Type': mimeType,
  });

  return { storageKey, mimeType, sizeBytes: buffer.length };
}

/** Time-limited download URL. Documents are never publicly readable — see §2. */
export async function getSignedUrl(storageKey, ttlSeconds = env.MINIO_URL_TTL_SECONDS) {
  return client.presignedGetObject(BUCKET, storageKey, ttlSeconds);
}

export async function removeObject(storageKey) {
  try {
    await client.removeObject(BUCKET, storageKey);
  } catch (err) {
    // Best-effort cleanup — a missing object is not worth failing the request.
    logger.warn({ err, storageKey }, 'Failed to remove object');
  }
}

/** Verifies the bucket is reachable; surfaced by the health check. */
export async function isStorageHealthy() {
  try {
    return await client.bucketExists(BUCKET);
  } catch {
    return false;
  }
}

export const storageLimits = { maxSizeBytes: MAX_SIZE_BYTES, allowedMime: [...ALLOWED_MIME.keys()] };
