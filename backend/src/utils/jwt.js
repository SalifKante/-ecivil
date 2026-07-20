import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'ecivil-api';

/**
 * `moduleScope` is carried for staff so authorization does not need a database
 * round-trip on every request. It is re-read from the User record on login, so a
 * scope change takes effect at the next login — acceptable for a 30-minute token.
 */
export function signAccessToken({ sub, role, nina, moduleScope }) {
  return jwt.sign({ role, nina, moduleScope }, env.JWT_SECRET, {
    subject: String(sub),
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: ISSUER,
  });
}

/** Throws on an invalid/expired token — callers translate that into a 401. */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER });
}
