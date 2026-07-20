import { User } from '../../models/index.js';
import { verifyPassword } from '../../utils/password.js';
import { signAccessToken } from '../../utils/jwt.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit, AUDIT_ACTIONS } from '../../utils/audit.js';
import { logger } from '../../utils/logger.js';

/** One message for every failure mode below, so nothing distinguishes them. */
function invalidCredentials() {
  return ApiError.unauthorized('INVALID_CREDENTIALS', 'Incorrect email or password');
}

/**
 * Email + password login for back-office staff.
 *
 * Citizens never come through here — they authenticate with NINA + OTP. The two
 * are deliberately separate front doors.
 */
export async function login({ email, password, ip }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same error and roughly the same work whether the account is missing, disabled,
  // or the password is wrong: a caller must not be able to enumerate staff emails.
  if (!user || !user.isActive) {
    // Burn a comparison anyway so a missing account is not measurably faster.
    await verifyPassword(password, 'scrypt$00$00');
    await recordAudit({
      action: AUDIT_ACTIONS.STAFF_LOGIN_FAILED,
      entity: 'User',
      meta: { email, reason: user ? 'INACTIVE' : 'UNKNOWN_EMAIL' },
      ip,
    });
    throw invalidCredentials();
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    logger.warn({ email, ip }, 'Failed staff login');
    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: AUDIT_ACTIONS.STAFF_LOGIN_FAILED,
      entity: 'User',
      entityId: user._id,
      meta: { email, reason: 'BAD_PASSWORD' },
      ip,
    });
    throw invalidCredentials();
  }

  user.lastLoginAt = new Date();
  await user.save();

  await recordAudit({
    actorId: user._id,
    actorRole: user.role,
    action: AUDIT_ACTIONS.STAFF_LOGIN,
    entity: 'User',
    entityId: user._id,
    ip,
  });

  const token = signAccessToken({
    sub: user._id,
    role: user.role,
    moduleScope: user.moduleScope,
  });

  return { token, user: toStaffProfile(user) };
}

export async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('STAFF_NOT_FOUND', 'Account no longer active');
  }
  return toStaffProfile(user);
}

/** The shape the back-office UI is allowed to see. Never includes the hash. */
export function toStaffProfile(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    moduleScope: user.moduleScope,
    lastLoginAt: user.lastLoginAt,
  };
}
