import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../constants/index.js';

/**
 * Authorization for the back-office. Every non-public staff route passes through
 * here; nothing relies on the UI hiding a button.
 *
 * The four-tier hierarchy (CLAUDE.md §4):
 *   AGENT       — works requests inside its module(s)
 *   ADMIN       — runs one module (its agents, services, tariffs)
 *   SUPER_ADMIN — global, the platform operators
 * `moduleScope` is the mechanism for the two scoped roles.
 */

/** Any back-office role. Rejects citizens outright. */
export function requireStaff(req, res, next) {
  if (!req.auth) return next(ApiError.unauthorized());

  if (!STAFF_ROLES.includes(req.auth.role)) {
    return next(ApiError.forbidden('STAFF_ONLY', 'Back-office access required'));
  }
  next();
}

/** Narrows to specific staff roles, e.g. requireStaffRole(ADMIN, SUPER_ADMIN). */
export function requireStaffRole(...allowed) {
  return (req, res, next) => {
    if (!req.auth) return next(ApiError.unauthorized());

    if (!allowed.includes(req.auth.role)) {
      return next(
        ApiError.forbidden('ROLE_FORBIDDEN', `Requires one of: ${allowed.join(', ')}`),
      );
    }
    next();
  };
}

/**
 * Whether a principal may act on a given module.
 *
 * Only SUPER_ADMIN is global. An empty `moduleScope` on an AGENT or ADMIN grants
 * nothing — treating "no scope" as "all scopes" is exactly the bug that turns a
 * misconfigured account into a platform-wide one.
 */
export function canAccessModule(auth, moduleKey) {
  if (!auth || !STAFF_ROLES.includes(auth.role)) return false;
  if (auth.role === ROLES.SUPER_ADMIN) return true;
  return (auth.moduleScope ?? []).includes(moduleKey);
}

/** Throws 403 unless the principal may act on `moduleKey`. */
export function assertModuleAccess(auth, moduleKey) {
  if (!canAccessModule(auth, moduleKey)) {
    throw ApiError.forbidden('MODULE_FORBIDDEN', `Outside your module scope: ${moduleKey}`);
  }
}

/**
 * The module filter to apply to a staff listing query.
 * `null` means unrestricted (SUPER_ADMIN); otherwise a `$in` over the scope.
 */
export function moduleScopeFilter(auth) {
  if (auth.role === ROLES.SUPER_ADMIN) return null;
  return { $in: auth.moduleScope ?? [] };
}
