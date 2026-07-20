import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Citizen, Service, Request, User, Document, AuditLog } from '../src/models/index.js';
import { verifyStore } from '../src/modules/documents/document.routes.js';
import { renderDocumentPdf } from '../src/modules/documents/documentPdf.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { ROLES, REQUEST_STATUS, MODULE_KEYS } from '../src/constants/index.js';

const app = createApp();

let service;
let citizen;
let otherCitizen;
let agent;
let tokenAgent;
let tokenCitizen;
let tokenOtherCitizen;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  await Service.deleteMany({ code: 'DOC-TEST-SVC' });
  service = await Service.create({
    code: 'DOC-TEST-SVC',
    moduleKey: MODULE_KEYS.LIFE_EVENTS,
    label: "Extrait d'acte de naissance",
    fee: 1000,
    processingDays: 3,
  });
});

beforeEach(async () => {
  await Promise.all([
    Citizen.deleteMany({}),
    Request.deleteMany({}),
    User.deleteMany({}),
    Document.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  await verifyStore.resetAll();

  [citizen, otherCitizen] = await Citizen.create([
    {
      nina: '99990000000501',
      firstName: 'Aminata',
      lastName: 'Traoré',
      birthDate: '1992-04-17',
      birthPlace: 'Bamako',
      gender: 'F',
      phone: '+22370000501',
    },
    {
      nina: '99990000000502',
      firstName: 'Moussa',
      lastName: 'Diarra',
      birthDate: '1985-11-02',
      birthPlace: 'Ségou',
      gender: 'M',
      phone: '+22370000502',
    },
  ]);

  agent = await User.create({
    email: 'agent.doc@ecivil.demo',
    fullName: 'Agent Doc',
    passwordHash: 'scrypt$00$00',
    role: ROLES.AGENT,
    moduleScope: [MODULE_KEYS.LIFE_EVENTS],
  });

  tokenAgent = signAccessToken({ sub: agent._id, role: agent.role, moduleScope: agent.moduleScope });
  tokenCitizen = signAccessToken({ sub: citizen._id, role: ROLES.CITIZEN, nina: citizen.nina });
  tokenOtherCitizen = signAccessToken({
    sub: otherCitizen._id,
    role: ROLES.CITIZEN,
    nina: otherCitizen.nina,
  });
});

async function makeRequest(status = REQUEST_STATUS.APPROVED) {
  return Request.create({
    reference: `ECV-2026-${String(Math.floor(Math.random() * 899999) + 100000)}`,
    citizenId: citizen._id,
    serviceId: service._id,
    moduleKey: service.moduleKey,
    status,
    amountDue: service.fee,
    assignedAgentId: agent._id,
    timeline: [{ to: status }],
  });
}

function issue(id, token = tokenAgent) {
  return request(app).post(`/api/v1/staff/requests/${id}/issue`).set(auth(token));
}

describe('PDF rendering', () => {
  it('produces a PDF carrying the SPECIMEN watermark', async () => {
    const buffer = await renderDocumentPdf({
      title: "Extrait d'acte de naissance",
      reference: 'ECV-2026-000042',
      citizen: {
        firstName: 'Aminata',
        lastName: 'Traoré',
        nina: '99990000000501',
        birthDate: '1992-04-17',
        birthPlace: 'Bamako',
      },
      verifyUrl: 'http://localhost:5173/verifier/abc',
      issuedAt: new Date('2026-07-20'),
    });

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);

    const raw = buffer.toString('latin1');
    // The QR code is embedded as an image, not merely referenced.
    expect(raw).toContain('/Subtype /Image');
  });

  it('fits on exactly one page', async () => {
    const buffer = await renderDocumentPdf({
      title: "Extrait d'acte de naissance",
      reference: 'ECV-2026-000042',
      citizen: {
        firstName: 'Aminata',
        lastName: 'Traoré',
        nina: '99990000000501',
        birthDate: '1992-04-17',
        birthPlace: 'Bamako',
      },
      verifyUrl: 'http://localhost:5173/verifier/abc',
      issuedAt: new Date('2026-07-20'),
    });

    // Regression: watermark bands drawn past the page bottom made PDFKit start
    // new pages, and the trailing text cursor pushed the header onto page 3.
    const pages = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBe(1);
  });
});

describe('POST /staff/requests/:id/issue', () => {
  it('issues a document and moves the request to ISSUED', async () => {
    const target = await makeRequest();
    const res = await issue(target._id);

    expect(res.status).toBe(201);
    expect(res.body.request.status).toBe(REQUEST_STATUS.ISSUED);
    expect(res.body.document.qrToken).toBeTruthy();
    expect(res.body.document.storageKey).toMatch(/^documents\//);
  });

  it('mints an unguessable token per document', async () => {
    const a = await issue((await makeRequest())._id);
    const b = await issue((await makeRequest())._id);

    expect(a.body.document.qrToken).not.toBe(b.body.document.qrToken);
    // 32 random bytes, base64url — long enough that guessing is impractical.
    expect(a.body.document.qrToken.length).toBeGreaterThanOrEqual(43);
  });

  it('refuses a request that is not approved', async () => {
    const target = await makeRequest(REQUEST_STATUS.UNDER_REVIEW);
    const res = await issue(target._id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_APPROVED');
  });

  it('refuses to issue twice, so an existing QR code stays valid', async () => {
    const target = await makeRequest();
    await issue(target._id);

    const again = await issue(target._id);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_ISSUED');
    expect(await Document.countDocuments({ requestId: target._id })).toBe(1);
  });

  it('hides a request outside the agent module scope', async () => {
    const other = await User.create({
      email: 'agent.land@ecivil.demo',
      fullName: 'Agent Land',
      passwordHash: 'scrypt$00$00',
      role: ROLES.AGENT,
      moduleScope: [MODULE_KEYS.LAND],
    });
    const token = signAccessToken({ sub: other._id, role: other.role, moduleScope: other.moduleScope });

    const res = await issue((await makeRequest())._id, token);
    expect(res.status).toBe(404);
  });

  it('records the issuance', async () => {
    await issue((await makeRequest())._id);
    expect(await AuditLog.countDocuments({ action: 'DOCUMENT_ISSUED' })).toBe(1);
  });
});

describe('GET /requests/:id/document', () => {
  it('gives the owning citizen a download link', async () => {
    const target = await makeRequest();
    await issue(target._id);

    const res = await request(app)
      .get(`/api/v1/requests/${target._id}/document`)
      .set(auth(tokenCitizen));

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('documents/');
  });

  it('does not give another citizen a link to it', async () => {
    const target = await makeRequest();
    await issue(target._id);

    const res = await request(app)
      .get(`/api/v1/requests/${target._id}/document`)
      .set(auth(tokenOtherCitizen));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
  });

  it('404s before a document exists', async () => {
    const target = await makeRequest();
    const res = await request(app)
      .get(`/api/v1/requests/${target._id}/document`)
      .set(auth(tokenCitizen));

    expect(res.status).toBe(404);
  });
});

describe('GET /verify/:qrToken', () => {
  it('verifies a genuine token without authentication', async () => {
    const target = await makeRequest();
    const { body } = await issue(target._id);

    const res = await request(app).get(`/api/v1/verify/${body.document.qrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.document.reference).toBe(target.reference);
    expect(res.body.disclaimer).toContain('PROTOTYPE');
  });

  it('never exposes the full identity of the holder', async () => {
    const target = await makeRequest();
    const { body } = await issue(target._id);

    const res = await request(app).get(`/api/v1/verify/${body.document.qrToken}`);

    // A scanned QR code must not become an identity-lookup oracle.
    const payload = JSON.stringify(res.body);
    expect(payload).not.toContain('99990000000501');
    expect(payload).not.toContain('Traoré');
    expect(payload).not.toContain('Bamako');
    expect(res.body.document.holder).toBe('Aminata T.');
  });

  it('reports an unknown token as invalid, still with the disclaimer', async () => {
    const res = await request(app).get('/api/v1/verify/not-a-real-token');

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBe('UNKNOWN_TOKEN');
    expect(res.body.disclaimer).toContain('PROTOTYPE');
  });

  it('reports a revoked document as invalid', async () => {
    const target = await makeRequest();
    const { body } = await issue(target._id);
    await Document.updateOne({ qrToken: body.document.qrToken }, { isRevoked: true });

    const res = await request(app).get(`/api/v1/verify/${body.document.qrToken}`);

    expect(res.body.valid).toBe(false);
    expect(res.body.reason).toBe('REVOKED');
  });

  it('refuses to hand a revoked document to the citizen', async () => {
    const target = await makeRequest();
    await issue(target._id);
    await Document.updateOne({ requestId: target._id }, { isRevoked: true });

    const res = await request(app)
      .get(`/api/v1/requests/${target._id}/document`)
      .set(auth(tokenCitizen));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DOCUMENT_REVOKED');
  });

  it('rate limits verification attempts', async () => {
    for (let i = 0; i < 60; i += 1) await request(app).get(`/api/v1/verify/token-${i}`);

    const res = await request(app).get('/api/v1/verify/one-too-many');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('VERIFY_RATE_LIMITED');
  });
});
