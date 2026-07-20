import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Citizen, Service, Request, Counter } from '../src/models/index.js';
import { signAccessToken } from '../src/utils/jwt.js';
import { storageLimits } from '../src/adapters/storage.js';
import { ROLES, MODULE_KEYS, REQUEST_STATUS } from '../src/constants/index.js';

/**
 * Upload validation THROUGH THE ENDPOINT.
 *
 * storage.test.js already covers `assertUploadAllowed` directly, but that is the
 * adapter's own gate. A request also passes through multer, which enforces its own
 * MIME filter and size limit — and a mismatch between the two would let a file the
 * adapter would reject reach it anyway, or bounce one it would accept. These tests
 * exercise the path a real client takes.
 */

const app = createApp();

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

let service;
let citizen;
let otherCitizen;
let token;
let otherToken;

function auth(t) {
  return { Authorization: `Bearer ${t}` };
}

beforeAll(async () => {
  await Service.deleteMany({ code: 'UPLOAD-TEST-SVC' });
  service = await Service.create({
    code: 'UPLOAD-TEST-SVC',
    moduleKey: MODULE_KEYS.LIFE_EVENTS,
    label: 'Service upload',
    fee: 1000,
    processingDays: 3,
  });
});

beforeEach(async () => {
  await Promise.all([Citizen.deleteMany({}), Request.deleteMany({}), Counter.deleteMany({})]);

  [citizen, otherCitizen] = await Citizen.create([
    {
      nina: '99990000000901',
      firstName: 'Upload',
      lastName: 'Testeur',
      birthDate: '1990-01-01',
      birthPlace: 'Bamako',
      gender: 'F',
      phone: '+22370000901',
    },
    {
      nina: '99990000000902',
      firstName: 'Autre',
      lastName: 'Testeur',
      birthDate: '1990-01-01',
      birthPlace: 'Ségou',
      gender: 'M',
      phone: '+22370000902',
    },
  ]);

  token = signAccessToken({ sub: citizen._id, role: ROLES.CITIZEN, nina: citizen.nina });
  otherToken = signAccessToken({
    sub: otherCitizen._id,
    role: ROLES.CITIZEN,
    nina: otherCitizen.nina,
  });
});

async function makeDraft(t = token) {
  const { body } = await request(app)
    .post('/api/v1/requests')
    .set(auth(t))
    .send({ serviceId: service._id.toString() });
  return body.request._id;
}

function attach(requestId, buffer, filename, contentType, t = token) {
  return request(app)
    .post(`/api/v1/requests/${requestId}/attachments`)
    .set(auth(t))
    .attach('file', buffer, { filename, contentType });
}

describe('accepted uploads', () => {
  it('accepts a PNG and stores it under a server-generated key', async () => {
    const id = await makeDraft();
    const res = await attach(id, PNG, 'photo.png', 'image/png');

    expect(res.status).toBe(201);
    expect(res.body.attachment.mimeType).toBe('image/png');
    // The client filename is recorded for display but never used as the key.
    expect(res.body.attachment.originalName).toBe('photo.png');
    expect(res.body.attachment.storageKey).toMatch(/^requests\/[a-f0-9]{24}\/[a-f0-9-]+\.png$/);
    expect(res.body.attachment.storageKey).not.toContain('photo.png');
  });

  it('accepts every allowlisted type', async () => {
    expect(storageLimits.allowedMime).toEqual(['image/jpeg', 'image/png', 'application/pdf']);

    const id = await makeDraft();
    const pdf = await attach(id, Buffer.from('%PDF-1.4 fake'), 'acte.pdf', 'application/pdf');
    expect(pdf.status).toBe(201);
  });
});

describe('rejected uploads', () => {
  it('rejects a disallowed MIME type at the endpoint', async () => {
    const id = await makeDraft();
    const res = await attach(id, Buffer.from('PK fake zip'), 'archive.zip', 'application/zip');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects an executable disguised with a permitted extension', async () => {
    const id = await makeDraft();
    // The declared content type is what is checked; the extension is not trusted.
    const res = await attach(id, Buffer.from('MZ fake exe'), 'photo.png', 'application/x-msdownload');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects a file over the 5 MB limit', async () => {
    const id = await makeDraft();
    const oversized = Buffer.alloc(storageLimits.maxSizeBytes + 1024, 0);

    const res = await attach(id, oversized, 'gros.png', 'image/png');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects a request with no file at all', async () => {
    const id = await makeDraft();
    const res = await request(app)
      .post(`/api/v1/requests/${id}/attachments`)
      .set(auth(token))
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NO_FILE');
  });

  it('refuses an upload from a citizen who does not own the request', async () => {
    const id = await makeDraft(token);
    const res = await attach(id, PNG, 'photo.png', 'image/png', otherToken);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('refuses an upload without a session', async () => {
    const id = await makeDraft();
    const res = await request(app)
      .post(`/api/v1/requests/${id}/attachments`)
      .attach('file', PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });

  it('refuses to attach to a request that has left draft', async () => {
    const id = await makeDraft();
    await Request.updateOne({ _id: id }, { status: REQUEST_STATUS.PAID });

    const res = await attach(id, PNG, 'photo.png', 'image/png');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NOT_EDITABLE');
  });
});
