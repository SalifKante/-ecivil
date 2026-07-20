import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Citizen, Service, Request, User, Notification, Counter } from '../src/models/index.js';
import { notifyStatusChange } from '../src/modules/notifications/notification.service.js';
import { templateFor } from '../src/modules/notifications/notification.templates.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { ROLES, REQUEST_STATUS, MODULE_KEYS, PAYMENT_OUTCOMES } from '../src/constants/index.js';

const app = createApp();

let service;
let freeService;
let citizen;
let noEmailCitizen;
let agent;
let tokenCitizen;
let tokenAgent;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await Service.deleteMany({ code: { $in: ['NOTIF-SVC', 'NOTIF-FREE-SVC'] } });
  [service, freeService] = await Service.create([
    {
      code: 'NOTIF-SVC',
      moduleKey: MODULE_KEYS.LIFE_EVENTS,
      label: 'Service notifié',
      fee: 1000,
      processingDays: 3,
    },
    {
      code: 'NOTIF-FREE-SVC',
      moduleKey: MODULE_KEYS.LIFE_EVENTS,
      label: 'Service gratuit notifié',
      fee: 0,
      processingDays: 3,
    },
  ]);
});

beforeEach(async () => {
  await Promise.all([
    Citizen.deleteMany({}),
    Request.deleteMany({}),
    User.deleteMany({}),
    Notification.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  [citizen, noEmailCitizen] = await Citizen.create([
    {
      nina: '99990000000601',
      firstName: 'Aminata',
      lastName: 'Traoré',
      birthDate: '1992-04-17',
      birthPlace: 'Bamako',
      gender: 'F',
      phone: '+22370000601',
      email: 'aminata.demo@example.test',
    },
    {
      nina: '99990000000602',
      firstName: 'Sans',
      lastName: 'Courriel',
      birthDate: '1990-01-01',
      birthPlace: 'Kayes',
      gender: 'M',
      phone: '+22370000602',
      // No email on purpose.
    },
  ]);

  agent = await User.create({
    email: 'agent.notif@ecivil.demo',
    fullName: 'Agent Notif',
    passwordHash: 'scrypt$00$00',
    role: ROLES.AGENT,
    moduleScope: [MODULE_KEYS.LIFE_EVENTS],
  });

  tokenCitizen = signAccessToken({ sub: citizen._id, role: ROLES.CITIZEN, nina: citizen.nina });
  tokenAgent = signAccessToken({ sub: agent._id, role: agent.role, moduleScope: agent.moduleScope });
});

async function submitRequest(svc = service, token = tokenCitizen) {
  const { body } = await request(app)
    .post('/api/v1/requests')
    .set(auth(token))
    .send({ serviceId: svc._id.toString(), formData: { motif: 'test' } });

  await request(app).post(`/api/v1/requests/${body.request._id}/submit`).set(auth(token));
  return body.request._id;
}

describe('notification on transition', () => {
  it('notifies the citizen by SMS and email when a request awaits payment', async () => {
    await submitRequest();

    const sent = await Notification.find({ template: REQUEST_STATUS.PENDING_PAYMENT }).lean();
    expect(sent.map((n) => n.channel).sort()).toEqual(['EMAIL', 'SMS']);
    expect(sent.every((n) => n.status === 'SENT')).toBe(true);
  });

  it('falls back to SMS alone when the citizen has no email', async () => {
    const token = signAccessToken({
      sub: noEmailCitizen._id,
      role: ROLES.CITIZEN,
      nina: noEmailCitizen.nina,
    });
    await submitRequest(service, token);

    const sent = await Notification.find({ citizenId: noEmailCitizen._id }).lean();
    expect(sent).toHaveLength(1);
    expect(sent[0].channel).toBe('SMS');
  });

  it('does not notify on DRAFT or SUBMITTED', async () => {
    await submitRequest();

    const templates = (await Notification.find({}).lean()).map((n) => n.template);
    expect(templates).not.toContain(REQUEST_STATUS.DRAFT);
    expect(templates).not.toContain(REQUEST_STATUS.SUBMITTED);
  });

  it('notifies for each transition of a multi-step submit', async () => {
    // A free service goes PENDING_PAYMENT then straight to PAID in one save.
    await submitRequest(freeService);

    const templates = [...new Set((await Notification.find({}).lean()).map((n) => n.template))];
    expect(templates.sort()).toEqual([REQUEST_STATUS.PAID, REQUEST_STATUS.PENDING_PAYMENT].sort());
  });

  it('notifies when a payment succeeds', async () => {
    const requestId = await submitRequest();
    await Notification.deleteMany({});

    const { body } = await request(app)
      .post(`/api/v1/requests/${requestId}/payment`)
      .set(auth(tokenCitizen))
      .send({ provider: 'ORANGE_MONEY', payerPhone: '+22370000601' });

    await request(app)
      .post(`/api/v1/requests/${requestId}/payment/callback`)
      .set(auth(tokenCitizen))
      .send({ providerRef: body.payment.providerRef, outcome: PAYMENT_OUTCOMES.SUCCESS });

    expect(await Notification.countDocuments({ template: REQUEST_STATUS.PAID })).toBe(2);
  });

  it('does not notify when a payment fails', async () => {
    const requestId = await submitRequest();
    await Notification.deleteMany({});

    const { body } = await request(app)
      .post(`/api/v1/requests/${requestId}/payment`)
      .set(auth(tokenCitizen))
      .send({ provider: 'WAVE', payerPhone: '+22370000601' });

    await request(app)
      .post(`/api/v1/requests/${requestId}/payment/callback`)
      .set(auth(tokenCitizen))
      .send({ providerRef: body.payment.providerRef, outcome: PAYMENT_OUTCOMES.FAILURE });

    expect(await Notification.countDocuments({})).toBe(0);
  });

  it('carries the agent message into a rejection notification', async () => {
    const requestId = await submitRequest();
    const req = await Request.findById(requestId);
    req.status = REQUEST_STATUS.PAID;
    await req.save();

    await request(app).post(`/api/v1/staff/requests/${requestId}/assign`).set(auth(tokenAgent));
    await Notification.deleteMany({});

    const reason = "L'acte de naissance fourni est illisible.";
    await request(app)
      .post(`/api/v1/staff/requests/${requestId}/reject`)
      .set(auth(tokenAgent))
      .send({ reason });

    const sms = await Notification.findOne({
      template: REQUEST_STATUS.REJECTED,
      channel: 'SMS',
    }).lean();

    // The citizen must receive the actual reason, not just a status word.
    expect(sms.payload.note).toBe(reason);
  });

  it('notifies when the review opens', async () => {
    const requestId = await submitRequest();
    const req = await Request.findById(requestId);
    req.status = REQUEST_STATUS.PAID;
    await req.save();
    await Notification.deleteMany({});

    await request(app).post(`/api/v1/staff/requests/${requestId}/assign`).set(auth(tokenAgent));

    expect(await Notification.countDocuments({ template: REQUEST_STATUS.UNDER_REVIEW })).toBe(2);
  });
});

describe('resilience', () => {
  it('records a notification even when the channel fails', async () => {
    const req = await Request.create({
      reference: 'ECV-2026-000999',
      citizenId: citizen._id,
      serviceId: service._id,
      moduleKey: service.moduleKey,
      status: REQUEST_STATUS.PAID,
      amountDue: 1000,
      timeline: [{ to: REQUEST_STATUS.PAID }],
    });

    // A citizen whose phone is missing still gets the email leg.
    await Citizen.updateOne({ _id: citizen._id }, { $unset: { phone: 1 } });

    const sent = await notifyStatusChange({ request: req, status: REQUEST_STATUS.PAID });
    expect(sent.map((n) => n.channel)).toEqual(['EMAIL']);
  });

  it('never throws when the citizen no longer exists', async () => {
    const req = await Request.create({
      reference: 'ECV-2026-000998',
      citizenId: citizen._id,
      serviceId: service._id,
      moduleKey: service.moduleKey,
      status: REQUEST_STATUS.PAID,
      amountDue: 1000,
      timeline: [{ to: REQUEST_STATUS.PAID }],
    });
    await Citizen.deleteOne({ _id: citizen._id });

    // A vanished citizen must not turn a legitimate status change into a 500.
    await expect(
      notifyStatusChange({ request: req, status: REQUEST_STATUS.PAID }),
    ).resolves.toEqual([]);
  });

  it('produces no notification for a status without a template', () => {
    expect(templateFor(REQUEST_STATUS.DRAFT)).toBeNull();
    expect(templateFor(REQUEST_STATUS.SUBMITTED)).toBeNull();
    expect(templateFor(REQUEST_STATUS.PAID)).not.toBeNull();
  });
});
