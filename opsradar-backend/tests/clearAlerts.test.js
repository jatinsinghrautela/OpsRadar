const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');
const { adminLogin, ensureIngestFixture } = require('./helpers');

describe('admin clear alerts', () => {
  let app;
  let apiKey;
  let token;

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();
    token = await adminLogin(app);
    const fixture = await ensureIngestFixture(app, token);
    apiKey = fixture.apiKey;
  });

  it('rejects clear for unauthenticated callers', async () => {
    const res = await request(app).delete('/alerts').query({ scope: 'resolved' });
    assert.equal(res.status, 401);
  });

  it('admin can clear resolved alerts', async () => {
    const message = `clear-resolved-${Date.now()}`;
    const open = await request(app)
      .post('/alert')
      .set('X-API-Key', apiKey)
      .send({
        message,
        severity: 'trivial',
        group_name: 'techops',
        app_name: 'monitor',
        country_name: 'United States'
      });
    assert.equal(open.status, 200);

    const resolve = await request(app)
      .post('/alert/resolve')
      .set('X-API-Key', apiKey)
      .send({ fingerprint: open.body.fingerprint });
    assert.equal(resolve.status, 200);

    const cleared = await request(app)
      .delete('/alerts')
      .query({ scope: 'resolved' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(cleared.status, 200);
    assert.ok(cleared.body.deleted >= 1);

    const list = await request(app)
      .get('/alerts')
      .query({ status: 'resolved' })
      .set('Authorization', `Bearer ${token}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.some((a) => a.message === message), false);
  });
});
