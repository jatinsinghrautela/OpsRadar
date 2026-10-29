const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');
const { adminLogin, ensureIngestFixture } = require('./helpers');

describe('alert ingest', () => {
  let app;
  let apiKey;

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();
    const token = await adminLogin(app);
    const fixture = await ensureIngestFixture(app, token);
    apiKey = fixture.apiKey;
  });

  it('rejects ingest without auth', async () => {
    const res = await request(app)
      .post('/alert')
      .send({ message: 'test', severity: 'minor' });
    assert.equal(res.status, 401);
  });

  it('accepts ingest with per-server X-API-Key', async () => {
    assert.ok(apiKey, 'server ingest key required');
    const res = await request(app)
      .post('/alert')
      .set('X-API-Key', apiKey)
      .send({
        message: `hardening-test-${Date.now()}`,
        severity: 'trivial',
        group_name: 'techops',
        app_name: 'monitor',
        country_name: 'United States'
      });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'Alert received');
  });
});
