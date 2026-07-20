import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Citizen, Service, Request, Payment, Counter } from '../src/models/index.js';
import { paymentStore } from '../src/modules/payments/payment.routes.js';
import { signAccessToken } from '../src/utils/jwt.js';
import {
  ROLES,
  REQUEST_STATUS,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PAYMENT_OUTCOMES,
  MODULE_KEYS,
} from '../src/constants/index.js';

const app = createApp();

const citizenA = {
  nina: '99990000000301',
  firstName: 'Test',
  lastName: 'Payeur',
  birthDate: '1990-01-01',
  birthPlace: 'Bamako',
  gender: 'F',
  phone: '+22370000301',
};
const citizenB = { ...citizenA, nina: '99990000000302', phone: '+22370000302' };

let tokenA;
let tokenB;
let paidService;
let freeService;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await Service.deleteMany({});
  [paidService, freeService] = await Service.create([
    {
      code: 'PAY-TEST-SVC',
      moduleKey: MODULE_KEYS.LIFE_EVENTS,
      label: 'Service payant de test',
      fee: 1000,
      processingDays: 3,
    },
    {
      code: 'FREE-TEST-SVC',
      moduleKey: MODULE_KEYS.LIFE_EVENTS,
      label: 'Service gratuit de test',
      fee: 0,
      processingDays: 5,
    },
  ]);
});

beforeEach(async () => {
  await Promise.all([
    Citizen.deleteMany({}),
    Request.deleteMany({}),
    Payment.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  await paymentStore.resetAll();

  const [a, b] = await Citizen.create([citizenA, citizenB]);
  tokenA = signAccessToken({ sub: a._id, role: ROLES.CITIZEN, nina: a.nina });
  tokenB = signAccessToken({ sub: b._id, role: ROLES.CITIZEN, nina: b.nina });
});

/** Creates a request and submits it, leaving it in PENDING_PAYMENT. */
async function pendingPaymentRequest(token = tokenA, service = paidService) {
  const { body } = await request(app)
    .post('/api/v1/requests')
    .set(auth(token))
    .send({ serviceId: service._id.toString(), formData: { motif: 'test' } });

  await request(app).post(`/api/v1/requests/${body.request._id}/submit`).set(auth(token));
  return body.request._id;
}

function initiate(requestId, token = tokenA, payload = {}) {
  return request(app)
    .post(`/api/v1/requests/${requestId}/payment`)
    .set(auth(token))
    .send({ provider: PAYMENT_PROVIDERS.ORANGE_MONEY, payerPhone: '+22370000301', ...payload });
}

function settle(requestId, providerRef, outcome, token = tokenA) {
  return request(app)
    .post(`/api/v1/requests/${requestId}/payment/callback`)
    .set(auth(token))
    .send({ providerRef, outcome });
}

describe('POST /requests/:id/payment', () => {
  it('opens a pending attempt for the amount carried by the request', async () => {
    const requestId = await pendingPaymentRequest();
    const res = await initiate(requestId);

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe(PAYMENT_STATUS.PENDING);
    expect(res.body.payment.amount).toBe(1000);
    expect(res.body.payment.providerRef).toMatch(/^OM-MOCK-/);
  });

  it('ignores a client-supplied amount and charges the official tariff', async () => {
    const requestId = await pendingPaymentRequest();
    const res = await initiate(requestId, tokenA, { amount: 1 });

    expect(res.body.payment.amount).toBe(1000);
  });

  it('requires a payer phone for mobile money', async () => {
    const requestId = await pendingPaymentRequest();
    const res = await request(app)
      .post(`/api/v1/requests/${requestId}/payment`)
      .set(auth(tokenA))
      .send({ provider: PAYMENT_PROVIDERS.WAVE });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYER_PHONE_REQUIRED');
  });

  it('does not require a payer phone for a card payment', async () => {
    const requestId = await pendingPaymentRequest();
    const res = await request(app)
      .post(`/api/v1/requests/${requestId}/payment`)
      .set(auth(tokenA))
      .send({ provider: PAYMENT_PROVIDERS.CARD });

    expect(res.status).toBe(201);
    expect(res.body.payment.provider).toBe(PAYMENT_PROVIDERS.CARD);
  });

  it('refuses a request that is not awaiting payment', async () => {
    const { body } = await request(app)
      .post('/api/v1/requests')
      .set(auth(tokenA))
      .send({ serviceId: paidService._id.toString() });

    // Still a DRAFT — never submitted.
    const res = await initiate(body.request._id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_PAYABLE');
  });

  it('supersedes a pending attempt when the citizen switches provider', async () => {
    const requestId = await pendingPaymentRequest();
    const first = await initiate(requestId);
    await initiate(requestId, tokenA, { provider: PAYMENT_PROVIDERS.WAVE });

    const superseded = await Payment.findById(first.body.payment._id).lean();
    expect(superseded.status).toBe(PAYMENT_STATUS.FAILED);
    expect(superseded.failureReason).toBe('SUPERSEDED');
  });

  it("does not let citizen B pay citizen A's request", async () => {
    const requestId = await pendingPaymentRequest(tokenA);
    const res = await initiate(requestId, tokenB);

    // 404, not 403 — B must not even learn the request exists.
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });
});

describe('payment settlement', () => {
  it('moves the request to PAID on a successful callback', async () => {
    const requestId = await pendingPaymentRequest();
    const { body } = await initiate(requestId);

    const res = await settle(requestId, body.payment.providerRef, PAYMENT_OUTCOMES.SUCCESS);

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe(PAYMENT_STATUS.SUCCEEDED);
    expect(res.body.payment.paidAt).toBeTruthy();
    expect(res.body.request.status).toBe(REQUEST_STATUS.PAID);
    expect(res.body.request.paymentId).toBe(body.payment._id);

    const lastEntry = res.body.request.timeline.at(-1);
    expect(lastEntry.from).toBe(REQUEST_STATUS.PENDING_PAYMENT);
    expect(lastEntry.to).toBe(REQUEST_STATUS.PAID);
  });

  it('leaves the request awaiting payment when the attempt fails', async () => {
    const requestId = await pendingPaymentRequest();
    const { body } = await initiate(requestId);

    const res = await settle(requestId, body.payment.providerRef, PAYMENT_OUTCOMES.FAILURE);

    expect(res.body.payment.status).toBe(PAYMENT_STATUS.FAILED);
    expect(res.body.request.status).toBe(REQUEST_STATUS.PENDING_PAYMENT);
  });

  it('lets the citizen retry after a failed attempt', async () => {
    const requestId = await pendingPaymentRequest();
    const first = await initiate(requestId);
    await settle(requestId, first.body.payment.providerRef, PAYMENT_OUTCOMES.FAILURE);

    const retry = await initiate(requestId, tokenA, { provider: PAYMENT_PROVIDERS.WAVE });
    const res = await settle(requestId, retry.body.payment.providerRef, PAYMENT_OUTCOMES.SUCCESS);

    expect(res.body.request.status).toBe(REQUEST_STATUS.PAID);
  });

  it('rejects a replayed callback instead of paying twice', async () => {
    const requestId = await pendingPaymentRequest();
    const { body } = await initiate(requestId);
    await settle(requestId, body.payment.providerRef, PAYMENT_OUTCOMES.SUCCESS);

    const replay = await settle(requestId, body.payment.providerRef, PAYMENT_OUTCOMES.SUCCESS);

    expect(replay.status).toBe(409);
    expect(replay.body.error.code).toBe('PAYMENT_ALREADY_SETTLED');
  });

  it('rejects an unknown provider reference', async () => {
    const requestId = await pendingPaymentRequest();
    await initiate(requestId);

    const res = await settle(requestId, 'OM-MOCK-DOES-NOT-EXIST', PAYMENT_OUTCOMES.SUCCESS);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PAYMENT_NOT_FOUND');
  });

  it('rejects an outcome outside the allowed enum', async () => {
    const requestId = await pendingPaymentRequest();
    const { body } = await initiate(requestId);

    const res = await settle(requestId, body.payment.providerRef, 'DEFINITELY_PAID');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('free services', () => {
  it('settles straight to PAID on submit, with no payment attempt', async () => {
    const requestId = await pendingPaymentRequest(tokenA, freeService);

    const res = await request(app).get(`/api/v1/requests/${requestId}`).set(auth(tokenA));
    expect(res.body.request.status).toBe(REQUEST_STATUS.PAID);
    expect(res.body.request.amountDue).toBe(0);
  });

  it('refuses to open a payment attempt for a free service', async () => {
    const { body } = await request(app)
      .post('/api/v1/requests')
      .set(auth(tokenA))
      .send({ serviceId: freeService._id.toString() });

    const res = await initiate(body.request._id);

    // NO_PAYMENT_DUE is unreachable through the API now that free requests settle at
    // submit — the state guard fires first. It stays as defence in depth.
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_PAYABLE');
  });
});

describe('GET /requests/:id/payment', () => {
  it('returns null before any attempt', async () => {
    const requestId = await pendingPaymentRequest();
    const res = await request(app).get(`/api/v1/requests/${requestId}/payment`).set(auth(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.payment).toBeNull();
  });

  it('returns the latest attempt', async () => {
    const requestId = await pendingPaymentRequest();
    await initiate(requestId);
    const second = await initiate(requestId, tokenA, { provider: PAYMENT_PROVIDERS.WAVE });

    const res = await request(app).get(`/api/v1/requests/${requestId}/payment`).set(auth(tokenA));
    expect(res.body.payment._id).toBe(second.body.payment._id);
  });
});

describe('GET /payments/providers', () => {
  it('lists the three providers with their traits', async () => {
    const res = await request(app).get('/api/v1/payments/providers').set(auth(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.providers.map((p) => p.code).sort()).toEqual(
      Object.values(PAYMENT_PROVIDERS).sort(),
    );

    const card = res.body.providers.find((p) => p.code === PAYMENT_PROVIDERS.CARD);
    expect(card.requiresPayerPhone).toBe(false);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/payments/providers');
    expect(res.status).toBe(401);
  });
});
