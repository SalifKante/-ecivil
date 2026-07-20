import { User, Service } from '../../models/index.js';
import { hashPassword } from '../../utils/password.js';
import { ApiError } from '../../utils/ApiError.js';
import { canAccessModule, moduleScopeFilter } from '../../middleware/rbac.js';
import { recordAudit, AUDIT_ACTIONS } from '../../utils/audit.js';
import { toStaffProfile } from '../staffAuth/staffAuth.service.js';
import { ROLES } from '../../constants/index.js';

/**
 * Management endpoints for the two administrative tiers.
 *
 * This is the privilege-escalation surface of the platform, so the rules are
 * stated once here and enforced on every write:
 *
 *   - a module ADMIN manages AGENTs, and only inside its own moduleScope
 *   - a module ADMIN can neither create nor modify another ADMIN or a SUPER_ADMIN
 *   - a module ADMIN cannot grant a scope it does not itself hold
 *   - nobody may edit their own account through here
 *
 * Each of those exists because its absence is a way to become someone else.
 */

const isSuper = (auth) => auth.role === ROLES.SUPER_ADMIN;

/** Every module in the caller's reach: all four for SUPER_ADMIN, its scope otherwise. */
function reachableModules(auth) {
  return isSuper(auth) ? null : (auth.moduleScope ?? []);
}

/**
 * A module ADMIN may only ever act on AGENTs. Without this, an admin could edit a
 * peer admin — or a super-admin — that happens to share one of its modules.
 */
function assertMayManageRole(auth, targetRole) {
  if (isSuper(auth)) return;

  if (targetRole !== ROLES.AGENT) {
    throw ApiError.forbidden(
      'CANNOT_MANAGE_ROLE',
      'A module administrator manages agents only',
    );
  }
}

/** Every requested module must be inside the caller's own scope. */
function assertMayGrantScope(auth, moduleScope) {
  if (isSuper(auth)) return;

  for (const key of moduleScope) {
    if (!canAccessModule(auth, key)) {
      throw ApiError.forbidden('CANNOT_GRANT_SCOPE', `Outside your module scope: ${key}`);
    }
  }
}

function assertNotSelf(auth, targetId) {
  if (String(targetId) === String(auth.id)) {
    // Blocks the two self-inflicted footguns: locking yourself out, and quietly
    // widening your own scope.
    throw ApiError.forbidden('CANNOT_EDIT_SELF', 'Manage your own account elsewhere');
  }
}

export async function listUsers({ auth, role, moduleKey }) {
  const filter = {};

  const reach = reachableModules(auth);
  if (reach) {
    // A module admin sees agents of its own modules, not the whole directory.
    filter.role = ROLES.AGENT;
    filter.moduleScope = { $in: reach };
  }

  if (role) {
    assertMayManageRole(auth, role);
    filter.role = role;
  }

  if (moduleKey) {
    if (!canAccessModule(auth, moduleKey)) {
      throw ApiError.forbidden('MODULE_FORBIDDEN', `Outside your module scope: ${moduleKey}`);
    }
    filter.moduleScope = { $in: [moduleKey] };
  }

  const users = await User.find(filter).sort({ role: 1, fullName: 1 });
  return users.map(toStaffProfile);
}

export async function createUser({ auth, email, fullName, password, role, moduleScope, ip }) {
  assertMayManageRole(auth, role);
  assertMayGrantScope(auth, moduleScope);

  if (await User.exists({ email })) {
    throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists');
  }

  const user = await User.create({
    email,
    fullName,
    passwordHash: await hashPassword(password),
    role,
    moduleScope,
  });

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.USER_CREATED,
    entity: 'User',
    entityId: user._id,
    meta: { email, role, moduleScope },
    ip,
  });

  return toStaffProfile(user);
}

export async function updateUser({ auth, userId, patch, ip }) {
  assertNotSelf(auth, userId);

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found');

  // Checked against the target's CURRENT role, so an admin cannot reach a peer.
  assertMayManageRole(auth, user.role);

  // And the target must already sit inside the caller's reach.
  const reach = reachableModules(auth);
  if (reach && !user.moduleScope.some((k) => reach.includes(k))) {
    throw ApiError.notFound('USER_NOT_FOUND', 'Account not found');
  }

  if (patch.moduleScope) {
    assertMayGrantScope(auth, patch.moduleScope);
    user.moduleScope = patch.moduleScope;
  }
  if (patch.fullName !== undefined) user.fullName = patch.fullName;
  if (patch.isActive !== undefined) user.isActive = patch.isActive;

  await user.save();

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.USER_UPDATED,
    entity: 'User',
    entityId: user._id,
    meta: { patch },
    ip,
  });

  return toStaffProfile(user);
}

export async function listServices({ auth }) {
  const filter = {};
  const scope = moduleScopeFilter(auth);
  if (scope) filter.moduleKey = scope;

  return Service.find(filter).sort({ moduleKey: 1, label: 1 }).lean();
}

export async function createService({ auth, data, ip }) {
  if (!canAccessModule(auth, data.moduleKey)) {
    throw ApiError.forbidden('MODULE_FORBIDDEN', `Outside your module scope: ${data.moduleKey}`);
  }

  if (await Service.exists({ code: data.code })) {
    throw ApiError.conflict('CODE_TAKEN', 'A service with this code already exists');
  }

  const service = await Service.create(data);

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.SERVICE_CREATED,
    entity: 'Service',
    entityId: service._id,
    meta: { code: service.code, fee: service.fee },
    ip,
  });

  return service;
}

export async function updateService({ auth, serviceId, patch, ip }) {
  const service = await Service.findById(serviceId);
  if (!service) throw ApiError.notFound('SERVICE_NOT_FOUND', 'Service not found');

  if (!canAccessModule(auth, service.moduleKey)) {
    // 404, not 403 — the existence of another module's catalogue entry is not
    // this admin's business either.
    throw ApiError.notFound('SERVICE_NOT_FOUND', 'Service not found');
  }

  const previousFee = service.fee;
  Object.assign(service, patch);
  await service.save();

  await recordAudit({
    actorId: auth.id,
    actorRole: auth.role,
    action: AUDIT_ACTIONS.SERVICE_UPDATED,
    entity: 'Service',
    entityId: service._id,
    // Tariffs are public money: record the before and after, not just "changed".
    meta: { code: service.code, patch, previousFee, newFee: service.fee },
    ip,
  });

  return service;
}
