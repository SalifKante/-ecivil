import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /health', () => {
  // The setup file connects a real MongoDB, so a healthy report is expected here.
  it('reports ok with mongodb up when connected', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.dependencies.mongodb).toBe('up');
    expect(res.body.service).toBe('ecivil-api');
  });
});

describe('GET /api/v1', () => {
  it('returns the service descriptor with the prototype notice', async () => {
    const res = await request(app).get('/api/v1');

    expect(res.status).toBe(200);
    expect(res.body.version).toBe('v1');
    expect(res.body.notice).toMatch(/PROTOTYPE/);
  });
});

describe('unknown routes', () => {
  it('returns the standard error shape', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(res.body.error.message).toContain('/does-not-exist');
  });
});
