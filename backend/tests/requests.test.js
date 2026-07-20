import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Citizen, Service, Request, Counter } from '../src/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { ROLES, REQUEST_STATUS, MODULE_KEYS } from '../src/constants/index.js';

const app = createApp();

const citizenA = {
  nina: '99990000000201',
  firstName: 'Test',
  lastName: 'Un',
  birthDate: '1990-01-01',
  birthPlace: 'Bamako',
  gender: 'M',
  phone: '+22370000201',
};
const citizenB = { ...citizenA, nina: '99990000000202', phone: '+22370000202' };

let tokenA;
let tokenB;
let service;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await Service.deleteMany({});
  service = await Service.create({
    code: 'TEST-SVC',
    moduleKey: MODULE_KEYS.LIFE_EVENTS,
    label: 'Service de test',
    fee: 1000,
    processingDays: 3,
  });
});

beforeEach(async () => {
  await Promise.all([Citizen.deleteMany({}), Request.deleteMany({}), Counter.deleteMany({})]);
  const [a, b] = await Citizen.create([citizenA, citizenB]);
  tokenA = signAccessToken({ sub: a._id, role: ROLES.CITIZEN, nina: a.nina });
  tokenB = signAccessToken({ sub: b._id, role: ROLES.CITIZEN, nina: b.nina });
});

async function createDraft(token = tokenA) {
  return request(app)
    .post('/api/v1/requests')
    .set(auth(token))
    .send({ serviceId: service._id.toString(), formData: { motif: 'test' } });
}

describe('POST /requests', () => {
  it('creates a draft with a formatted reference and the service fee', async () => {
    const res = await createDraft();

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe(REQUEST_STATUS.DRAFT);
    expect(res.body.request.reference).toMatch(/^ECV-\d{4}-\d{6}$/);
    expect(res.body.request.amountDue).toBe(1000);
    expect(res.body.request.moduleKey).toBe(MODULE_KEYS.LIFE_EVENTS);
  });

  it('generates sequential references', async () => {
    const first = await createDraft();
    const second = await createDraft();
    expect(first.body.request.reference).not.toBe(second.body.request.reference);
  });

  it('rejects an unknown service', async () => {
    const res = await request(app)
      .post('/api/v1/requests')
      .set(auth(tokenA))
      .send({ serviceId: '0'.repeat(24) });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SERVICE_NOT_FOUND');
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/requests').send({ serviceId: service._id.toString() });
    expect(res.status).toBe(401);
  });
});

describe('submit lifecycle', () => {
  it('moves DRAFT through SUBMITTED to PENDING_PAYMENT with a full timeline', async () => {
    const { body } = await createDraft();
    const res = await request(app)
      .post(`/api/v1/requests/${body.request._id}/submit`)
      .set(auth(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe(REQUEST_STATUS.PENDING_PAYMENT);

    const transitions = res.body.request.timeline.map((t) => t.to);
    expect(transitions).toEqual([
      REQUEST_STATUS.DRAFT,
      REQUEST_STATUS.SUBMITTED,
      REQUEST_STATUS.PENDING_PAYMENT,
    ]);
  });

  it('cannot submit an already-submitted request', async () => {
    const { body } = await createDraft();
    await request(app).post(`/api/v1/requests/${body.request._id}/submit`).set(auth(tokenA));

    const again = await request(app)
      .post(`/api/v1/requests/${body.request._id}/submit`)
      .set(auth(tokenA));

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('cannot edit a request once it leaves draft', async () => {
    const { body } = await createDraft();
    await request(app).post(`/api/v1/requests/${body.request._id}/submit`).set(auth(tokenA));

    const res = await request(app)
      .patch(`/api/v1/requests/${body.request._id}`)
      .set(auth(tokenA))
      .send({ formData: { motif: 'changed' } });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_EDITABLE');
  });
});

describe('ownership isolation', () => {
  it('does not let citizen B see citizen A\'s request', async () => {
    const { body } = await createDraft(tokenA);
    const res = await request(app).get(`/api/v1/requests/${body.request._id}`).set(auth(tokenB));

    // 404, not 403 — B must not even learn the request exists.
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('only lists the caller\'s own requests', async () => {
    await createDraft(tokenA);
    await createDraft(tokenB);

    const res = await request(app).get('/api/v1/requests').set(auth(tokenA));
    expect(res.body.requests).toHaveLength(1);
  });
});
