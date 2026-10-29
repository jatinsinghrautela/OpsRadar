'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const crypto = require('crypto');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');
const { User } = require('../models/user');
const { Server } = require('../models/server');
const { adminLogin, ensureIngestFixture } = require('./helpers');
const { hashIngestApiKey } = require('../services/ingestKeys');

describe('point-3 hardening', () => {
  let app;
  let adminToken;
  let fixture;

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();
    adminToken = await adminLogin(app);
    fixture = await ensureIngestFixture(app, adminToken);
  });

  it('hashes ingest keys at rest and authenticates by hash', async () => {
    const server = await Server.findByPk(fixture.serverId);
    assert.ok(server.ingest_api_key_hash);
    assert.equal(server.ingest_api_key_hash, hashIngestApiKey(fixture.apiKey));
    assert.equal(server.ingest_api_key_prefix, fixture.apiKey.slice(0, 8));

    const meta = await request(app)
      .get(`/servers/${fixture.serverId}/ingest-key`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(meta.status, 200);
    assert.equal(meta.body.revealable, false);
    assert.ok(!meta.body.ingest_api_key);

    const ingest = await request(app)
      .post('/alert')
      .set('X-API-Key', fixture.apiKey)
      .send({
        message: `hash-check-${Date.now()}`,
        severity: 'minor',
        group_name: 'techops',
        app_name: 'monitor',
        country_name: 'United States'
      });
    assert.ok([200, 201].includes(ingest.status), `unexpected status ${ingest.status}`);
  });

  it('paginates GET /alerts when page is provided', async () => {
    const res = await request(app)
      .get('/alerts')
      .query({ status: 'active', page: 1, pageSize: 5 })
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items));
    assert.equal(typeof res.body.total, 'number');
    assert.equal(res.body.page, 1);
    assert.equal(res.body.pageSize, 5);
    assert.ok(res.body.totalPages >= 1);
    assert.ok(res.body.items.length <= 5);
  });

  it('locks and unlocks accounts', async () => {
    const suffix = crypto.randomBytes(3).toString('hex');
    const created = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: `lockme_${suffix}`,
        email: `lockme_${suffix}@example.com`,
        password: 'TempPass123!',
        is_admin: false
      });
    assert.equal(created.status, 201);
    const userId = created.body.user_id;

    const lock = await request(app)
      .post(`/users/${userId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(lock.status, 200);

    const denied = await request(app)
      .post('/login')
      .send({ username: `lockme_${suffix}`, password: 'TempPass123!' });
    assert.equal(denied.status, 401);

    const unlock = await request(app)
      .post(`/users/${userId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(unlock.status, 200);

    const ok = await request(app)
      .post('/login')
      .send({ username: `lockme_${suffix}`, password: 'TempPass123!' });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token || ok.body.change_token || ok.body.requires_password_change);

    await User.destroy({ where: { user_id: userId } });
  });

  it('rejects locking the current admin', async () => {
    const me = await request(app)
      .get('/current-user')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(me.status, 200);
    assert.ok(me.body.user_id);

    const lockSelf = await request(app)
      .post(`/users/${me.body.user_id}/lock`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(lockSelf.status, 400);
  });
});
