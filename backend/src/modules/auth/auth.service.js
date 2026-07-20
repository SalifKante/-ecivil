import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { OtpChallenge } from '../../models/index.js';
import { findByNina, toPublicIdentity, maskPhone } from '../../adapters/ninaRegistry.js';
import { sendSms, otpMessage } from '../../adapters/sms.js';
import { signAccessToken } from '../../utils/jwt.js';
import { ApiError } from '../../utils/ApiError.js';
import { env, isProduction } from '../../config/env.js';
import { ROLES } from '../../constants/index.js';
import { logger } from '../../utils/logger.js';

/** HMAC rather than plain storage: a database dump must not yield usable codes. */
function hashCode(code, nina) {
  return createHmac('sha256', env.JWT_SECRET).update(`${nina}:${code}`).digest('hex');
}

/** Cryptographically uniform 6-digit code — Math.random() is not acceptable here. */
function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Step 1 — issue an OTP challenge for a NINA.
 *
 * Always resolves the same shape whether or not the NINA exists: a differing
 * response would let anyone enumerate which NINAs are registered.
 */
export async function requestOtp({ nina, ip }) {
  const record = await findByNina(nina);

  if (!record) {
    logger.warn({ nina, ip }, 'OTP requested for unknown NINA');
    // Deliberate: no error, no hint. Same shape as the success path.
    return { challengeIssued: true, identity: null, devCode: undefined };
  }

  // One live challenge per NINA — a new request supersedes the previous.
  await OtpChallenge.deleteMany({ nina, consumedAt: null });

  const code = generateCode();
  const challenge = await OtpChallenge.create({
    nina,
    citizenId: record.id,
    codeHash: hashCode(code, nina),
    expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000),
    phoneMasked: maskPhone(record.phone),
  });

  await sendSms({ to: record.phone, body: otpMessage(code) });

  return {
    challengeIssued: true,
    identity: toPublicIdentity(record),
    expiresAt: challenge.expiresAt,
    // Dev convenience so there is no need for a real SMS gateway (CLAUDE.md §2).
    // Gated on NODE_ENV — this must never leak in production.
    devCode: isProduction ? undefined : code,
  };
}

/** Step 2 — verify a code and issue a session. */
export async function verifyOtp({ nina, code, ip }) {
  const challenge = await OtpChallenge.findOne({ nina, consumedAt: null })
    .select('+codeHash')
    .sort({ createdAt: -1 });

  if (!challenge) {
    throw ApiError.badRequest('OTP_NOT_FOUND', 'No pending challenge for this NINA');
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    throw ApiError.badRequest('OTP_EXPIRED', 'Challenge has expired');
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw ApiError.tooManyRequests('OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts');
  }

  const provided = Buffer.from(hashCode(code, nina), 'hex');
  const expected = Buffer.from(challenge.codeHash, 'hex');
  const isValid = provided.length === expected.length && timingSafeEqual(provided, expected);

  if (!isValid) {
    challenge.attempts += 1;
    await challenge.save();
    logger.warn({ nina, ip, attempts: challenge.attempts }, 'Invalid OTP attempt');

    throw ApiError.badRequest('OTP_INVALID', 'Incorrect code', {
      remainingAttempts: Math.max(0, challenge.maxAttempts - challenge.attempts),
    });
  }

  // Single-use: consume before issuing the token.
  challenge.consumedAt = new Date();
  await challenge.save();

  const record = await findByNina(nina);
  if (!record) {
    throw ApiError.unauthorized('CITIZEN_NOT_FOUND', 'Citizen no longer exists');
  }

  const token = signAccessToken({ sub: record.id, role: ROLES.CITIZEN, nina: record.nina });

  return {
    token,
    citizen: {
      id: record.id,
      nina: record.nina,
      firstName: record.firstName,
      lastName: record.lastName,
      isDiaspora: record.isDiaspora,
    },
  };
}
