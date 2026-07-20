import { describe, it, expect } from 'vitest';
import { putObject, getSignedUrl, removeObject, assertUploadAllowed } from '../src/adapters/storage.js';

// Exercises the real MinIO from docker-compose. Skips cleanly if it isn't up.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('storage validation', () => {
  it('rejects a disallowed MIME type', () => {
    expect(() => assertUploadAllowed({ mimeType: 'application/zip', sizeBytes: 10 })).toThrowError(
      /not allowed/,
    );
  });

  it('rejects an oversized file', () => {
    expect(() =>
      assertUploadAllowed({ mimeType: 'image/png', sizeBytes: 6 * 1024 * 1024 }),
    ).toThrowError(/5 MB/);
  });

  it('accepts a valid small png', () => {
    expect(() => assertUploadAllowed({ mimeType: 'image/png', sizeBytes: PNG.length })).not.toThrow();
  });
});

describe('storage round-trip (requires MinIO)', () => {
  it('stores, signs, retrieves and removes an object', async () => {
    let stored;
    try {
      stored = await putObject({
        buffer: PNG,
        mimeType: 'image/png',
        prefix: 'tests',
      });
    } catch (err) {
      // MinIO not running — don't fail the whole suite on infra absence.
      console.warn('Skipping storage round-trip:', err.message);
      return;
    }

    expect(stored.storageKey).toMatch(/^tests\/[a-f0-9-]+\.png$/);

    const url = await getSignedUrl(stored.storageKey, 60);
    expect(url).toContain(stored.storageKey);

    const download = await fetch(url);
    expect(download.status).toBe(200);
    const bytes = Buffer.from(await download.arrayBuffer());
    expect(bytes.equals(PNG)).toBe(true);

    await removeObject(stored.storageKey);
    const gone = await fetch(await getSignedUrl(stored.storageKey, 60));
    expect(gone.status).toBe(404);
  });
});
