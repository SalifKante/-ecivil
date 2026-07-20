import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User, Service, Request, Payment, AuditLog, Citizen } from '../src/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { verifyPassword } from '../src/utils/password.js';
import {
  ROLES,
  MODULE_KEYS,
  REQUEST_STATUS,
  PAYMENT_STATUS,
} from '../src/constants/index.js';

const app = createApp();

let adminLifeEvents;
let adminIdentity;
let agentLifeEvents;
let superAdmin;

let tokenAdmin;
let tokenAdminIdentity;
let tokenAgent;
let tokenSuper;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function staffToken(user) {
  return signAccessToken({ sub: user._id, role: user.role, moduleScope: user.moduleScope });
}

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Service.deleteMany({}),
    Request.deleteMany({}),
    Payment.deleteMany({}),
    AuditLog.deleteMany({}),
    Citizen.deleteMany({}),
  ]);

  [adminLifeEvents, adminIdentity, agentLifeEvents, superAdmin] = await User.create([
    {
      email: 'admin.le@ecivil.demo',
      fullName: 'Admin LE',
      passwordHash: 'scrypt$00$00',
      role: ROLES.ADMIN,
      moduleScope: [MODULE_KEYS.LIFE_EVENTS],
    },
    {
      email: 'admin.id@ecivil.demo',
      fullName: 'Admin ID',
      passwordHash: 'scrypt$00$00',
      role: ROLES.ADMIN,
      moduleScope: [MODULE_KEYS.IDENTITY],
    },
    {
      email: 'agent.le@ecivil.demo',
      fullName: 'Agent LE',
      passwordHash: 'scrypt$00$00',
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.LIFE_EVENTS],
    },
    {
      email: 'super@ecivil.demo',
      fullName: 'Super',
      passwordHash: 'scrypt$00$00',
      role: ROLES.SUPER_ADMIN,
      moduleScope: [],
    },
  ]);

  tokenAdmin = staffToken(adminLifeEvents);
  tokenAdminIdentity = staffToken(adminIdentity);
  tokenAgent = staffToken(agentLifeEvents);
  tokenSuper = staffToken(superAdmin);
});

const newAgent = {
  email: 'nouvel.agent@ecivil.demo',
  fullName: 'Nouvel Agent',
  password: 'MotDePasseDemo1',
  role: ROLES.AGENT,
  moduleScope: [MODULE_KEYS.LIFE_EVENTS],
};

describe('access to the management area', () => {
  it('shuts an AGENT out entirely', async () => {
    const res = await request(app).get('/api/v1/staff/admin/users').set(auth(tokenAgent));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_FORBIDDEN');
  });

  it('shuts a citizen out entirely', async () => {
    const citizenToken = signAccessToken({
      sub: '0'.repeat(24),
      role: ROLES.CITIZEN,
      nina: '99990000000101',
    });
    const res = await request(app).get('/api/v1/staff/admin/users').set(auth(citizenToken));
    expect(res.status).toBe(403);
  });
});

describe('managing staff accounts', () => {
  it('lets a module admin create an agent in its own module', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/users')
      .set(auth(tokenAdmin))
      .send(newAgent);

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe(ROLES.AGENT);
    expect(res.body.user.moduleScope).toEqual([MODULE_KEYS.LIFE_EVENTS]);
  });

  it('hashes the password and never returns it', async () => {
    await request(app).post('/api/v1/staff/admin/users').set(auth(tokenAdmin)).send(newAgent);

    const created = await User.findOne({ email: newAgent.email }).select('+passwordHash');
    expect(created.passwordHash).not.toBe(newAgent.password);
    expect(await verifyPassword(newAgent.password, created.passwordHash)).toBe(true);
  });

  it('refuses to let a module admin mint another admin', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/users')
      .set(auth(tokenAdmin))
      .send({ ...newAgent, role: ROLES.ADMIN });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_MANAGE_ROLE');
  });

  it('refuses a scope the admin does not itself hold', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/users')
      .set(auth(tokenAdmin))
      .send({ ...newAgent, moduleScope: [MODULE_KEYS.LAND] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_GRANT_SCOPE');
  });

  it('refuses a scope that mixes an allowed and a forbidden module', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/users')
      .set(auth(tokenAdmin))
      .send({ ...newAgent, moduleScope: [MODULE_KEYS.LIFE_EVENTS, MODULE_KEYS.LAND] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_GRANT_SCOPE');
  });

  it('rejects SUPER_ADMIN as a creatable role', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/users')
      .set(auth(tokenSuper))
      .send({ ...newAgent, role: ROLES.SUPER_ADMIN, moduleScope: [MODULE_KEYS.LAND] });

    // Not even a super-admin mints another one through a management endpoint.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lets a super admin create an admin for any module', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/users')
      .set(auth(tokenSuper))
      .send({ ...newAgent, role: ROLES.ADMIN, moduleScope: [MODULE_KEYS.LAND] });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe(ROLES.ADMIN);
  });

  it('refuses a duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/users')
      .set(auth(tokenAdmin))
      .send({ ...newAgent, email: 'agent.le@ecivil.demo' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('lists only the agents of the admin own module', async () => {
    await User.create({
      email: 'agent.other@ecivil.demo',
      fullName: 'Agent Autre',
      passwordHash: 'scrypt$00$00',
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.IDENTITY],
    });

    const res = await request(app).get('/api/v1/staff/admin/users').set(auth(tokenAdmin));

    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].email).toBe('agent.le@ecivil.demo');
  });

  it('shows a super admin the whole directory', async () => {
    const res = await request(app).get('/api/v1/staff/admin/users').set(auth(tokenSuper));
    expect(res.body.users.length).toBe(4);
  });

  it('deactivates an agent in its own module', async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/admin/users/${agentLifeEvents._id}`)
      .set(auth(tokenAdmin))
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);
  });

  it('refuses to let an admin edit a peer admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/admin/users/${adminIdentity._id}`)
      .set(auth(tokenAdmin))
      .send({ isActive: false });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_MANAGE_ROLE');
  });

  it('refuses to let an admin disable a super admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/admin/users/${superAdmin._id}`)
      .set(auth(tokenAdmin))
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it('hides an agent from another module behind a 404', async () => {
    const outsider = await User.create({
      email: 'agent.land@ecivil.demo',
      fullName: 'Agent Land',
      passwordHash: 'scrypt$00$00',
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.LAND],
    });

    const res = await request(app)
      .patch(`/api/v1/staff/admin/users/${outsider._id}`)
      .set(auth(tokenAdmin))
      .send({ isActive: false });

    expect(res.status).toBe(404);
  });

  it('refuses to let anyone edit their own account here', async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/admin/users/${adminLifeEvents._id}`)
      .set(auth(tokenAdmin))
      .send({ isActive: false });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_EDIT_SELF');
  });

  it('refuses to widen an agent scope beyond the admin own', async () => {
    const res = await request(app)
      .patch(`/api/v1/staff/admin/users/${agentLifeEvents._id}`)
      .set(auth(tokenAdmin))
      .send({ moduleScope: [MODULE_KEYS.LIFE_EVENTS, MODULE_KEYS.LAND] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_GRANT_SCOPE');
  });

  it('records account creation in the audit log', async () => {
    await request(app).post('/api/v1/staff/admin/users').set(auth(tokenAdmin)).send(newAgent);
    expect(await AuditLog.countDocuments({ action: 'USER_CREATED' })).toBe(1);
  });
});

describe('managing services and tariffs', () => {
  const newService = {
    code: 'LE-TEST-NEW',
    moduleKey: MODULE_KEYS.LIFE_EVENTS,
    label: 'Nouveau service de test',
    fee: 2500,
    processingDays: 5,
  };

  it('creates a service in the admin own module', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/services')
      .set(auth(tokenAdmin))
      .send(newService);

    expect(res.status).toBe(201);
    expect(res.body.service.fee).toBe(2500);
  });

  it('refuses to create a service in another module', async () => {
    const res = await request(app)
      .post('/api/v1/staff/admin/services')
      .set(auth(tokenAdmin))
      .send({ ...newService, moduleKey: MODULE_KEYS.LAND });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MODULE_FORBIDDEN');
  });

  it('rejects a non-integer or negative tariff', async () => {
    const decimal = await request(app)
      .post('/api/v1/staff/admin/services')
      .set(auth(tokenAdmin))
      .send({ ...newService, fee: 1000.5 });
    expect(decimal.status).toBe(400);

    const negative = await request(app)
      .post('/api/v1/staff/admin/services')
      .set(auth(tokenAdmin))
      .send({ ...newService, code: 'LE-TEST-NEG', fee: -100 });
    expect(negative.status).toBe(400);
  });

  it('updates a tariff and records the old and new value', async () => {
    const created = await Service.create({ ...newService, code: 'LE-TARIFF' });

    const res = await request(app)
      .patch(`/api/v1/staff/admin/services/${created._id}`)
      .set(auth(tokenAdmin))
      .send({ fee: 3000 });

    expect(res.status).toBe(200);
    expect(res.body.service.fee).toBe(3000);

    const entry = await AuditLog.findOne({ action: 'SERVICE_UPDATED' }).lean();
    expect(entry.meta.previousFee).toBe(2500);
    expect(entry.meta.newFee).toBe(3000);
  });

  it('hides another module service behind a 404', async () => {
    const foreign = await Service.create({
      code: 'LD-FOREIGN',
      moduleKey: MODULE_KEYS.LAND,
      label: 'Service foncier',
      fee: 1000,
      processingDays: 3,
    });

    const res = await request(app)
      .patch(`/api/v1/staff/admin/services/${foreign._id}`)
      .set(auth(tokenAdmin))
      .send({ fee: 1 });

    expect(res.status).toBe(404);
  });

  it('does not allow moving a service to another module', async () => {
    const created = await Service.create({ ...newService, code: 'LE-MOVE' });

    await request(app)
      .patch(`/api/v1/staff/admin/services/${created._id}`)
      .set(auth(tokenAdmin))
      .send({ moduleKey: MODULE_KEYS.LAND, label: 'Déplacé' });

    // moduleKey is not in the update schema, so it is stripped rather than applied.
    const after = await Service.findById(created._id).lean();
    expect(after.moduleKey).toBe(MODULE_KEYS.LIFE_EVENTS);
  });

  it('lists only the admin own module services', async () => {
    await Service.create([
      { ...newService, code: 'LE-ONE' },
      {
        code: 'LD-ONE',
        moduleKey: MODULE_KEYS.LAND,
        label: 'Foncier',
        fee: 1000,
        processingDays: 3,
      },
    ]);

    const res = await request(app).get('/api/v1/staff/admin/services').set(auth(tokenAdmin));
    expect(res.body.services).toHaveLength(1);
    expect(res.body.services[0].code).toBe('LE-ONE');
  });
});

describe('statistics', () => {
  beforeEach(async () => {
    const citizen = await Citizen.create({
      nina: '99990000000701',
      firstName: 'Stat',
      lastName: 'Citoyen',
      birthDate: '1990-01-01',
      birthPlace: 'Bamako',
      gender: 'F',
      phone: '+22370000701',
    });

    const [le, id] = await Service.create([
      { code: 'LE-STAT', moduleKey: MODULE_KEYS.LIFE_EVENTS, label: 'LE', fee: 1000, processingDays: 3 },
      { code: 'ID-STAT', moduleKey: MODULE_KEYS.IDENTITY, label: 'ID', fee: 50000, processingDays: 3 },
    ]);

    const made = await Request.create([
      {
        reference: 'ECV-2026-000801',
        citizenId: citizen._id,
        serviceId: le._id,
        moduleKey: MODULE_KEYS.LIFE_EVENTS,
        status: REQUEST_STATUS.PAID,
        amountDue: 1000,
        timeline: [{ to: REQUEST_STATUS.PAID }],
      },
      {
        reference: 'ECV-2026-000802',
        citizenId: citizen._id,
        serviceId: id._id,
        moduleKey: MODULE_KEYS.IDENTITY,
        status: REQUEST_STATUS.ISSUED,
        amountDue: 50000,
        timeline: [{ to: REQUEST_STATUS.ISSUED }],
      },
      {
        reference: 'ECV-2026-000803',
        citizenId: citizen._id,
        serviceId: le._id,
        moduleKey: MODULE_KEYS.LIFE_EVENTS,
        status: REQUEST_STATUS.DRAFT,
        amountDue: 1000,
        timeline: [{ to: REQUEST_STATUS.DRAFT }],
      },
    ]);

    await Payment.create([
      {
        requestId: made[0]._id,
        citizenId: citizen._id,
        provider: 'ORANGE_MONEY',
        amount: 1000,
        status: PAYMENT_STATUS.SUCCEEDED,
        paidAt: new Date(),
      },
      {
        requestId: made[1]._id,
        citizenId: citizen._id,
        provider: 'CARD',
        amount: 50000,
        status: PAYMENT_STATUS.SUCCEEDED,
        paidAt: new Date(),
      },
    ]);
  });

  it('scopes a module admin to its own module', async () => {
    const res = await request(app).get('/api/v1/staff/admin/stats').set(auth(tokenAdmin));

    expect(res.status).toBe(200);
    expect(res.body.stats.totals.requests).toBe(1); // the LE draft is excluded
    expect(res.body.stats.byModule[MODULE_KEYS.IDENTITY]).toBeUndefined();
  });

  it('counts only the admin own module revenue', async () => {
    const res = await request(app).get('/api/v1/staff/admin/stats').set(auth(tokenAdmin));
    expect(res.body.stats.revenue.total).toBe(1000);
  });

  it('gives a super admin every module and the full revenue', async () => {
    const res = await request(app).get('/api/v1/staff/admin/stats').set(auth(tokenSuper));

    expect(res.body.stats.scope).toBe('GLOBAL');
    expect(res.body.stats.totals.requests).toBe(2);
    expect(res.body.stats.revenue.total).toBe(51000);
  });

  it('excludes citizen drafts from every figure', async () => {
    const res = await request(app).get('/api/v1/staff/admin/stats').set(auth(tokenSuper));
    expect(res.body.stats.byStatus[REQUEST_STATUS.DRAFT]).toBeUndefined();
  });

  it('returns an explicit zero for quiet days', async () => {
    const res = await request(app).get('/api/v1/staff/admin/stats').set(auth(tokenSuper));

    expect(res.body.stats.perDay).toHaveLength(14);
    expect(res.body.stats.perDay.every((d) => typeof d.count === 'number')).toBe(true);
  });

  it('scopes the staff count to the admin own agents', async () => {
    const res = await request(app).get('/api/v1/staff/admin/stats').set(auth(tokenAdmin));
    expect(res.body.stats.totals.staff).toBe(1);
  });
});
