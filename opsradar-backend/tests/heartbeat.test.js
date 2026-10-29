const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');
const { adminLogin, ensureIngestFixture } = require('./helpers');

describe('agent heartbeat', () => {
  let app;
  let apiKey;
  let token;
  let serverName;

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();
    token = await adminLogin(app);
    const fixture = await ensureIngestFixture(app, token);
    apiKey = fixture.apiKey;
    serverName = fixture.serverName;
  });

  it('records heartbeat with per-server X-API-Key', async () => {
    const hb = await request(app)
      .post('/agent/heartbeat')
      .set('X-API-Key', apiKey)
      .send({ server_name: serverName });
    assert.equal(hb.status, 200);
    assert.equal(hb.body.agent_status, 'live');
    assert.equal(hb.body.server_name, serverName);

    const servers = await request(app)
      .get('/servers')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(servers.status, 200);
    const target = servers.body.find((s) => s.name === serverName);
    assert.ok(target);
    assert.equal(target.agent_status, 'live');

    const summary = await request(app)
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(summary.status, 200);
    assert.ok(summary.body.agents_live >= 1);
  });

  it('rejects heartbeat without auth', async () => {
    const res = await request(app)
      .post('/agent/heartbeat')
      .send({ server_name: serverName });
    assert.equal(res.status, 401);
  });
});
