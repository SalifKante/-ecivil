import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Citizen, Service, Request, User, AuditLog, Counter } from '../src/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { ROLES, REQUEST_STATUS, MODULE_KEYS } from '../src/constants/index.js';

const app = createApp();

let lifeEventsService;
let identityService;
let citizen;
let agentLifeEvents;
let agentIdentity;
let otherAgentLifeEvents;
let superAdmin;

let tokenAgent;
let tokenOtherAgent;
let tokenAgentIdentity;
let tokenSuper;
let tokenCitizen;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function staffToken(user) {
  return signAccessToken({ sub: user._id, role: user.role, moduleScope: user.moduleScope });
}

beforeAll(async () => {
  await Service.deleteMany({});
  [lifeEventsService, identityService] = await Service.create([
    {
      code: 'SR-LE-SVC',
      moduleKey: MODULE_KEYS.LIFE_EVENTS,
      label: 'Extrait de test',
      fee: 1000,
      processingDays: 3,
    },
    {
      code: 'SR-ID-SVC',
      moduleKey: MODULE_KEYS.IDENTITY,
      label: 'Passeport de test',
      fee: 50000,
      processingDays: 15,
    },
  ]);
});

beforeEach(async () => {
  await Promise.all([
    Citizen.deleteMany({}),
    Request.deleteMany({}),
    User.deleteMany({}),
    AuditLog.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  citizen = await Citizen.create({
    nina: '99990000000401',
    firstName: 'Test',
    lastName: 'Citoyen',
    birthDate: '1990-01-01',
    birthPlace: 'Bamako',
    gender: 'F',
    phone: '+22370000401',
  });

  [agentLifeEvents, otherAgentLifeEvents, agentIdentity, superAdmin] = await User.create([
    {
      email: 'agent.le@ecivil.demo',
      fullName: 'Agent LE',
      passwordHash: 'scrypt$00$00',
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.LIFE_EVENTS],
    },
    {
      email: 'agent.le2@ecivil.demo',
      fullName: 'Agent LE 2',
      passwordHash: 'scrypt$00$00',
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.LIFE_EVENTS],
    },
    {
      email: 'agent.id@ecivil.demo',
      fullName: 'Agent ID',
      passwordHash: 'scrypt$00$00',
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.IDENTITY],
    },
    {
      email: 'super@ecivil.demo',
      fullName: 'Super',
      passwordHash: 'scrypt$00$00',
      role: ROLES.SUPER_ADMIN,
      moduleScope: [],
    },
  ]);

  tokenAgent = staffToken(agentLifeEvents);
  tokenOtherAgent = staffToken(otherAgentLifeEvents);
  tokenAgentIdentity = staffToken(agentIdentity);
  tokenSuper = staffToken(superAdmin);
  tokenCitizen = signAccessToken({
    sub: citizen._id,
    role: ROLES.CITIZEN,
    nina: citizen.nina,
  });
});

/** Builds a request directly at a chosen status, bypassing the citizen flow. */
async function makeRequest({ service = lifeEventsService, status = REQUEST_STATUS.PAID } = {}) {
  return Request.create({
    reference: `ECV-2026-${String(Math.floor(Math.random() * 899999) + 100000)}`,
    citizenId: citizen._id,
    serviceId: service._id,
    moduleKey: service.moduleKey,
    status,
    amountDue: service.fee,
    timeline: [{ to: status }],
  });
}

describe('GET /staff/requests', () => {
  it('lists only requests inside the agent module scope', async () => {
    await makeRequest({ service: lifeEventsService });
    await makeRequest({ service: identityService });

    const res = await request(app).get('/api/v1/staff/requests').set(auth(tokenAgent));

    expect(res.status).toBe(200);
    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].moduleKey).toBe(MODULE_KEYS.LIFE_EVENTS);
  });

  it('gives SUPER_ADMIN every module', async () => {
    await makeRequest({ service: lifeEventsService });
    await makeRequest({ service: identityService });

    const res = await request(app).get('/api/v1/staff/requests').set(auth(tokenSuper));
    expect(res.body.requests).toHaveLength(2);
  });

  it('never exposes citizen drafts to the back-office', async () => {
    await makeRequest({ status: REQUEST_STATUS.DRAFT });

    const res = await request(app).get('/api/v1/staff/requests').set(auth(tokenSuper));
    expect(res.body.requests).toHaveLength(0);
  });

  it('cannot be widened past the caller scope via moduleKey', async () => {
    await makeRequest({ service: identityService });

    const res = await request(app)
      .get('/api/v1/staff/requests')
      .query({ moduleKey: MODULE_KEYS.IDENTITY })
      .set(auth(tokenAgent));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MODULE_FORBIDDEN');
  });

  it('filters by status and by assignment', async () => {
    const mine = await makeRequest();
    await makeRequest();
    await Request.updateOne({ _id: mine._id }, { assignedAgentId: agentLifeEvents._id });

    const assigned = await request(app)
      .get('/api/v1/staff/requests')
      .query({ assigned: 'me' })
      .set(auth(tokenAgent));
    expect(assigned.body.requests).toHaveLength(1);

    const unassigned = await request(app)
      .get('/api/v1/staff/requests')
      .query({ assigned: 'unassigned' })
      .set(auth(tokenAgent));
    expect(unassigned.body.requests).toHaveLength(1);
  });

  it('finds a request by reference', async () => {
    const target = await makeRequest();
    await makeRequest();

    const res = await request(app)
      .get('/api/v1/staff/requests')
      .query({ q: target.reference })
      .set(auth(tokenAgent));

    expect(res.body.requests).toHaveLength(1);
    expect(res.body.requests[0].reference).toBe(target.reference);
  });

  it('paginates', async () => {
    await Promise.all([makeRequest(), makeRequest(), makeRequest()]);

    const res = await request(app)
      .get('/api/v1/staff/requests')
      .query({ limit: 2, page: 1 })
      .set(auth(tokenAgent));

    expect(res.body.requests).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.pages).toBe(2);
  });

  it('rejects a citizen token', async () => {
    const res = await request(app).get('/api/v1/staff/requests').set(auth(tokenCitizen));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('STAFF_ONLY');
  });
});

describe('GET /staff/requests/:id', () => {
  it('hides an out-of-scope request behind a 404, not a 403', async () => {
    const identityRequest = await makeRequest({ service: identityService });

    const res = await request(app)
      .get(`/api/v1/staff/requests/${identityRequest._id}`)
      .set(auth(tokenAgent));

    // 404: an agent must not learn that a request exists in another module.
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('records that the file was viewed', async () => {
    const target = await makeRequest();
    await request(app).get(`/api/v1/staff/requests/${target._id}`).set(auth(tokenAgent));

    const entry = await AuditLog.findOne({ action: 'REQUEST_VIEWED' }).lean();
    expect(String(entry.entityId)).toBe(String(target._id));
    expect(String(entry.actorId)).toBe(String(agentLifeEvents._id));
  });
});

describe('taking a request', () => {
  it('assigns the caller and opens the review', async () => {
    const target = await makeRequest();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/assign`)
      .set(auth(tokenAgent));

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe(REQUEST_STATUS.UNDER_REVIEW);
    expect(String(res.body.request.assignedAgentId)).toBe(String(agentLifeEvents._id));
  });

  it('refuses to take a request another agent holds', async () => {
    const target = await makeRequest();
    await request(app).post(`/api/v1/staff/requests/${target._id}/assign`).set(auth(tokenAgent));

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/assign`)
      .set(auth(tokenOtherAgent));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_ASSIGNED');
  });

  it('lets a supervisor reassign', async () => {
    const target = await makeRequest();
    await request(app).post(`/api/v1/staff/requests/${target._id}/assign`).set(auth(tokenAgent));

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/assign`)
      .set(auth(tokenSuper));

    expect(res.status).toBe(200);
    expect(String(res.body.request.assignedAgentId)).toBe(String(superAdmin._id));
  });
});

describe('decisions', () => {
  async function taken() {
    const target = await makeRequest();
    await request(app).post(`/api/v1/staff/requests/${target._id}/assign`).set(auth(tokenAgent));
    return target;
  }

  it('approves an open request and records it', async () => {
    const target = await taken();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/approve`)
      .set(auth(tokenAgent))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe(REQUEST_STATUS.APPROVED);
    expect(await AuditLog.countDocuments({ action: 'REQUEST_APPROVED' })).toBe(1);
  });

  it('rejects with a reason the citizen can read', async () => {
    const target = await taken();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/reject`)
      .set(auth(tokenAgent))
      .send({ reason: "L'acte de naissance fourni est illisible." });

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe(REQUEST_STATUS.REJECTED);
    expect(res.body.request.rejectionReason).toContain('illisible');
  });

  it('demands a usable rejection reason', async () => {
    const target = await taken();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/reject`)
      .set(auth(tokenAgent))
      .send({ reason: 'non' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sends a request back to the citizen for more information', async () => {
    const target = await taken();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/request-info`)
      .set(auth(tokenAgent))
      .send({ note: 'Merci de joindre un justificatif de domicile récent.' });

    expect(res.body.request.status).toBe(REQUEST_STATUS.NEEDS_INFO);
  });

  it('refuses a decision before the request is taken', async () => {
    const target = await makeRequest();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/approve`)
      .set(auth(tokenAgent))
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_UNDER_REVIEW');
  });

  it('refuses a decision from an agent who does not hold the request', async () => {
    const target = await taken();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/approve`)
      .set(auth(tokenOtherAgent))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ASSIGNED');
  });

  it('lets a supervisor decide without holding the request', async () => {
    const target = await taken();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/approve`)
      .set(auth(tokenSuper))
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe(REQUEST_STATUS.APPROVED);
  });

  it('cannot decide twice on the same request', async () => {
    const target = await taken();
    await request(app)
      .post(`/api/v1/staff/requests/${target._id}/approve`)
      .set(auth(tokenAgent))
      .send({});

    const again = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/reject`)
      .set(auth(tokenAgent))
      .send({ reason: 'Changement de décision après coup.' });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('NOT_UNDER_REVIEW');
  });

  it('does not let an out-of-module agent decide', async () => {
    const target = await taken();

    const res = await request(app)
      .post(`/api/v1/staff/requests/${target._id}/approve`)
      .set(auth(tokenAgentIdentity))
      .send({});

    expect(res.status).toBe(404);
  });
});
