import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'ecivil-api';

export function signAccessToken({ sub, role, nina }) {
  return jwt.sign({ role, nina }, env.JWT_SECRET, {
    subject: String(sub),
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: ISSUER,
  });
}

/** Throws on an invalid/expired token — callers translate that into a 401. */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER });
}
