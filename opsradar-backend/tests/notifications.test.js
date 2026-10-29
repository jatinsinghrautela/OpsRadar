const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');
const { adminLogin, ensureIngestFixture } = require('./helpers');

describe('in-app notifications', () => {
  let app;
  let adminToken;
  let apiKey;

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();
    adminToken = await adminLogin(app);
    const fixture = await ensureIngestFixture(app, adminToken);
    apiKey = fixture.apiKey;
  });

  it('loads and updates notification prefs', async () => {
    const get = await request(app)
      .get('/notification-prefs')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(get.status, 200);
    assert.equal(typeof get.body.critical, 'boolean');

    const put = await request(app)
      .put('/notification-prefs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ critical: true, major: true, minor: true, trivial: true });
    assert.equal(put.status, 200);
    assert.equal(put.body.trivial, true);
  });

  it('creates notification on critical ingest for admin', async () => {
    assert.ok(apiKey, 'server ingest key required');

    await request(app)
      .put('/notification-prefs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ critical: true, major: true, minor: true, trivial: true });

    const message = `notify-test-${Date.now()}`;
    const ingest = await request(app)
      .post('/alert')
      .set('X-API-Key', apiKey)
      .send({
        message,
        severity: 'critical',
        group_name: 'techops',
        app_name: 'monitor',
        country_name: 'United States'
      });
    assert.equal(ingest.status, 200);

    const list = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(list.status, 200);
    const match = list.body.find((n) => n.message === message);
    assert.ok(match, 'expected notification for ingested alert');

    const mark = await request(app)
      .post(`/notifications/${match.id}/read`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(mark.status, 200);
    assert.equal(mark.body.is_read, true);
  });
});
