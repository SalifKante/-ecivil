import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * scrypt from the standard library — memory-hard, and no third-party dependency.
 * Format: scrypt$<saltHex>$<keyHex>, so the algorithm stays identifiable if we migrate.
 */
export async function hashPassword(plain) {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(plain, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(plain, stored) {
  const [scheme, saltHex, keyHex] = (stored ?? '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;

  const derived = await scrypt(plain, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
  const expected = Buffer.from(keyHex, 'hex');

  // Length check first: timingSafeEqual throws on a length mismatch.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
