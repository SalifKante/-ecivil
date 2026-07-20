import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Citizen, OtpChallenge } from '../src/models/index.js';
import { otpRequestStore, otpVerifyStore } from '../src/modules/auth/auth.routes.js';

const app = createApp();

const NINA = '99990000000101';
const UNKNOWN_NINA = '99990000009999';

const fixture = {
  nina: NINA,
  firstName: 'Aminata',
  lastName: 'Traoré',
  birthDate: '1992-04-17',
  birthPlace: 'Bamako',
  gender: 'F',
  phone: '+22370000101',
  email: 'aminata.demo@example.test',
};

beforeEach(async () => {
  await Promise.all([Citizen.deleteMany({}), OtpChallenge.deleteMany({})]);
  await Citizen.create(fixture);
  // Counters are per-process and would otherwise leak across cases.
  await Promise.all([otpRequestStore.resetAll(), otpVerifyStore.resetAll()]);
});

async function login(nina = NINA) {
  const otpRes = await request(app).post('/api/v1/auth/otp/request').send({ nina });
  return request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ nina, code: otpRes.body.devCode });
}

describe('POST /auth/otp/request', () => {
  it('issues a challenge and returns the masked identity', async () => {
    const res = await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });

    expect(res.status).toBe(202);
    expect(res.body.challengeIssued).toBe(true);
    expect(res.body.identity.firstName).toBe('Aminata');
    expect(res.body.identity.phoneMasked).toContain('••');
    // The full phone must never reach an unauthenticated caller.
    expect(JSON.stringify(res.body)).not.toContain('+22370000101');
  });

  it('rejects a malformed NINA', async () => {
    const res = await request(app).post('/api/v1/auth/otp/request').send({ nina: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not reveal whether a NINA exists', async () => {
    const known = await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
    const unknown = await request(app).post('/api/v1/auth/otp/request').send({ nina: UNKNOWN_NINA });

    expect(unknown.status).toBe(known.status);
    expect(unknown.body.challengeIssued).toBe(true);
    expect(unknown.body.identity).toBeNull();
    await expect(OtpChallenge.countDocuments({ nina: UNKNOWN_NINA })).resolves.toBe(0);
  });

  it('never stores the code in clear text', async () => {
    const res = await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
    const stored = await OtpChallenge.findOne({ nina: NINA }).select('+codeHash').lean();

    expect(stored.codeHash).not.toBe(res.body.devCode);
    expect(stored.codeHash).toHaveLength(64);
  });

  it('supersedes a previous pending challenge', async () => {
    await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
    await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });

    await expect(OtpChallenge.countDocuments({ nina: NINA, consumedAt: null })).resolves.toBe(1);
  });
});

describe('POST /auth/otp/verify', () => {
  it('issues a token for a valid code', async () => {
    const res = await login();

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.citizen.nina).toBe(NINA);
  });

  it('rejects an incorrect code and counts the attempt', async () => {
    await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ nina: NINA, code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_INVALID');

    const challenge = await OtpChallenge.findOne({ nina: NINA }).lean();
    expect(challenge.attempts).toBe(1);
  });

  it('refuses to reuse a consumed code', async () => {
    const otpRes = await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
    const code = otpRes.body.devCode;

    const first = await request(app).post('/api/v1/auth/otp/verify').send({ nina: NINA, code });
    const replay = await request(app).post('/api/v1/auth/otp/verify').send({ nina: NINA, code });

    expect(first.status).toBe(200);
    expect(replay.status).toBe(400);
    expect(replay.body.error.code).toBe('OTP_NOT_FOUND');
  });

  it('rejects an expired challenge', async () => {
    await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
    const challenge = await OtpChallenge.findOne({ nina: NINA }).select('+codeHash');
    challenge.expiresAt = new Date(Date.now() - 1000);
    await challenge.save();

    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ nina: NINA, code: '123456' });

    expect(res.body.error.code).toBe('OTP_EXPIRED');
  });

  it('locks the challenge after too many attempts', async () => {
    await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/v1/auth/otp/verify').send({ nina: NINA, code: '000000' });
    }
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ nina: NINA, code: '000000' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_ATTEMPTS_EXCEEDED');
  });

  it('cannot be completed for a NINA with no challenge', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ nina: UNKNOWN_NINA, code: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_NOT_FOUND');
  });
});

describe('OTP rate limiting', () => {
  it('blocks a 6th code request for the same NINA', async () => {
    for (let i = 0; i < 5; i += 1) {
      const ok = await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
      expect(ok.status).toBe(202);
    }

    const blocked = await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('OTP_RATE_LIMITED');
  });

  it('limits per NINA, so one target cannot exhaust another', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/v1/auth/otp/request').send({ nina: NINA });
    }

    const other = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ nina: '99990000000102' });

    expect(other.status).toBe(202);
  });
});

describe('GET /auth/me', () => {
  it('returns the registry record for a valid session', async () => {
    const { body } = await login();
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.citizen.nina).toBe(NINA);
    expect(res.body.citizen.birthPlace).toBe('Bamako');
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_TOKEN');
  });

  it('rejects a tampered token', async () => {
    const { body } = await login();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${body.token.slice(0, -2)}xx`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});
