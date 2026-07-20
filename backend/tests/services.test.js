import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Service } from '../src/models/index.js';
import { MODULE_KEYS } from '../src/constants/index.js';

const app = createApp();

beforeAll(async () => {
  await Service.deleteMany({});
  await Service.create([
    { code: 'A1', moduleKey: MODULE_KEYS.IDENTITY, label: 'A1', fee: 5000, processingDays: 5 },
    { code: 'B1', moduleKey: MODULE_KEYS.LIFE_EVENTS, label: 'B1', fee: 1000, processingDays: 3 },
    { code: 'B2', moduleKey: MODULE_KEYS.LIFE_EVENTS, label: 'B2', fee: 0, processingDays: 3 },
    {
      code: 'OLD',
      moduleKey: MODULE_KEYS.LAND,
      label: 'Retiré',
      fee: 100,
      processingDays: 1,
      isActive: false,
    },
  ]);
});

describe('GET /services', () => {
  it('is public and returns only active services', async () => {
    const res = await request(app).get('/api/v1/services');
    expect(res.status).toBe(200);
    expect(res.body.services).toHaveLength(3);
    expect(res.body.services.map((s) => s.code)).not.toContain('OLD');
  });

  it('filters by module', async () => {
    const res = await request(app).get('/api/v1/services?moduleKey=lifeEvents');
    expect(res.body.services).toHaveLength(2);
  });

  it('rejects an unknown module key', async () => {
    const res = await request(app).get('/api/v1/services?moduleKey=nope');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /services/modules', () => {
  it('returns all four modules with counts', async () => {
    const res = await request(app).get('/api/v1/services/modules');
    expect(res.body.modules).toHaveLength(4);

    const lifeEvents = res.body.modules.find((m) => m.moduleKey === MODULE_KEYS.LIFE_EVENTS);
    expect(lifeEvents.serviceCount).toBe(2);
  });
});

describe('GET /services/:code', () => {
  it('returns a service by code', async () => {
    const res = await request(app).get('/api/v1/services/A1');
    expect(res.body.service.label).toBe('A1');
  });

  it('404s an inactive service', async () => {
    const res = await request(app).get('/api/v1/services/OLD');
    expect(res.status).toBe(404);
  });
});
