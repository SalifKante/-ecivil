import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

/** Populates req.auth = { id, role, nina, moduleScope } or rejects with 401. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('MISSING_TOKEN', 'Bearer token required'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      id: payload.sub,
      role: payload.role,
      nina: payload.nina,
      moduleScope: payload.moduleScope ?? [],
    };
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    next(ApiError.unauthorized(code, 'Invalid or expired token'));
  }
}

/** Role gate. Must run after requireAuth. */
export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.auth) return next(ApiError.unauthorized());
    if (!allowed.includes(req.auth.role)) {
      return next(ApiError.forbidden('ROLE_FORBIDDEN', `Requires one of: ${allowed.join(', ')}`));
    }
    next();
  };
}
