const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');

describe('auth', () => {
  let app;

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();
  });

  it('rejects bad credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'admin', password: 'wrong-password' });
    assert.equal(res.status, 401);
  });

  it('logs in admin with password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'admin', password: 'admin123' });
    assert.equal(res.status, 200);
    if (res.body.requires_password_change) {
      assert.ok(res.body.change_token);
      return;
    }
    if (res.body.requires_totp) {
      assert.ok(res.body.pre_auth_token);
      return;
    }
    assert.ok(res.body.token);
  });
});
