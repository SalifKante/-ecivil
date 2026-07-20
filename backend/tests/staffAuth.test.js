import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User, AuditLog } from '../src/models/index.js';
import { staffLoginStore } from '../src/modules/staffAuth/staffAuth.routes.js';
import { hashPassword } from '../src/utils/password.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { canAccessModule, moduleScopeFilter } from '../src/middleware/rbac.js';
import { ROLES, MODULE_KEYS } from '../src/constants/index.js';

const app = createApp();

const PASSWORD = 'Demo!Agent1';

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({})]);
  await staffLoginStore.resetAll();

  const passwordHash = await hashPassword(PASSWORD);
  await User.create([
    {
      email: 'agent@ecivil.demo',
      fullName: 'Agent Test',
      passwordHash,
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.LIFE_EVENTS],
    },
    {
      email: 'disabled@ecivil.demo',
      fullName: 'Ancien Agent',
      passwordHash,
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.LIFE_EVENTS],
      isActive: false,
    },
  ]);
});

function login(email, password = PASSWORD) {
  return request(app).post('/api/v1/staff/auth/login').send({ email, password });
}

describe('POST /staff/auth/login', () => {
  it('issues a token carrying the role and module scope', async () => {
    const res = await login('agent@ecivil.demo');

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe(ROLES.AGENT);
    expect(res.body.user.moduleScope).toEqual([MODULE_KEYS.LIFE_EVENTS]);
  });

  it('never returns the password hash', async () => {
    const res = await login('agent@ecivil.demo');
    expect(JSON.stringify(res.body)).not.toContain('scrypt$');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password', async () => {
    const res = await login('agent@ecivil.demo', 'wrong-password');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('gives an unknown email the same error as a wrong password', async () => {
    const unknown = await login('nobody@ecivil.demo');
    const wrong = await login('agent@ecivil.demo', 'wrong-password');

    // Identical shape — staff emails must not be enumerable.
    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('refuses a deactivated account', async () => {
    const res = await login('disabled@ecivil.demo');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('records both successful and failed logins in the audit log', async () => {
    await login('agent@ecivil.demo');
    await login('agent@ecivil.demo', 'wrong-password');

    const actions = (await AuditLog.find({}).lean()).map((a) => a.action);
    expect(actions).toContain('STAFF_LOGIN');
    expect(actions).toContain('STAFF_LOGIN_FAILED');
  });

  it('rate limits repeated attempts on the same account', async () => {
    for (let i = 0; i < 10; i += 1) await login('agent@ecivil.demo', 'wrong-password');

    const res = await login('agent@ecivil.demo', 'wrong-password');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('LOGIN_RATE_LIMITED');
  });
});

describe('GET /staff/auth/me', () => {
  it('returns the staff profile', async () => {
    const { body } = await login('agent@ecivil.demo');
    const res = await request(app)
      .get('/api/v1/staff/auth/me')
      .set({ Authorization: `Bearer ${body.token}` });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('agent@ecivil.demo');
  });

  it('rejects a citizen token', async () => {
    const citizenToken = signAccessToken({
      sub: '0'.repeat(24),
      role: ROLES.CITIZEN,
      nina: '99990000000101',
    });

    const res = await request(app)
      .get('/api/v1/staff/auth/me')
      .set({ Authorization: `Bearer ${citizenToken}` });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('STAFF_ONLY');
  });

  it('rejects an account deactivated after the token was issued', async () => {
    const { body } = await login('agent@ecivil.demo');
    await User.updateOne({ email: 'agent@ecivil.demo' }, { isActive: false });

    const res = await request(app)
      .get('/api/v1/staff/auth/me')
      .set({ Authorization: `Bearer ${body.token}` });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('STAFF_NOT_FOUND');
  });
});

describe('module scoping rules', () => {
  const agent = { role: ROLES.AGENT, moduleScope: [MODULE_KEYS.LIFE_EVENTS] };
  const admin = { role: ROLES.ADMIN, moduleScope: [MODULE_KEYS.IDENTITY] };
  const superAdmin = { role: ROLES.SUPER_ADMIN, moduleScope: [] };

  it('allows a scoped role only inside its own module', () => {
    expect(canAccessModule(agent, MODULE_KEYS.LIFE_EVENTS)).toBe(true);
    expect(canAccessModule(agent, MODULE_KEYS.IDENTITY)).toBe(false);
    expect(canAccessModule(admin, MODULE_KEYS.IDENTITY)).toBe(true);
    expect(canAccessModule(admin, MODULE_KEYS.LAND)).toBe(false);
  });

  it('treats an empty scope as no access, not global access', () => {
    const misconfigured = { role: ROLES.AGENT, moduleScope: [] };
    for (const key of Object.values(MODULE_KEYS)) {
      expect(canAccessModule(misconfigured, key)).toBe(false);
    }
  });

  it('gives SUPER_ADMIN every module despite an empty scope', () => {
    for (const key of Object.values(MODULE_KEYS)) {
      expect(canAccessModule(superAdmin, key)).toBe(true);
    }
  });

  it('never grants a citizen module access', () => {
    const citizen = { role: ROLES.CITIZEN, moduleScope: [MODULE_KEYS.LAND] };
    expect(canAccessModule(citizen, MODULE_KEYS.LAND)).toBe(false);
  });

  it('builds an unrestricted filter only for SUPER_ADMIN', () => {
    expect(moduleScopeFilter(superAdmin)).toBeNull();
    expect(moduleScopeFilter(agent)).toEqual({ $in: [MODULE_KEYS.LIFE_EVENTS] });
  });
});
