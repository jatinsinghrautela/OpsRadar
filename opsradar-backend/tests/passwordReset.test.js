const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');
const { User } = require('../models/user');
const { PasswordResetRequest } = require('../models/password_reset_request');

describe('password reset fulfill + change-password', () => {
  let app;
  let adminToken;
  const testUser = `harden_${Date.now()}`;
  const testEmail = `${testUser}@example.com`;
  const finalPassword = 'NewPass123!';

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();

    await User.create({
      username: testUser,
      email: testEmail,
      password_hash: await bcrypt.hash('OldPass123!', 10),
      is_active: true,
      is_admin: false
    });

    const login = await request(app)
      .post('/login')
      .send({ username: 'admin', password: 'admin123' });
    assert.equal(login.status, 200);
    assert.ok(login.body.token, 'admin must return a session token (disable TOTP for admin in lab)');
    adminToken = login.body.token;
  });

  it('fulfills reset and allows change-password', async () => {
    const reqRes = await request(app)
      .post('/password-reset-requests')
      .send({ username: testUser });
    assert.equal(reqRes.status, 200);

    const user = await User.findOne({ where: { username: testUser } });
    const pending = await PasswordResetRequest.findOne({
      where: { user_id: user.user_id, status: 'pending' }
    });
    assert.ok(pending);

    const fulfill = await request(app)
      .post(`/password-reset-requests/${pending.request_id}/fulfill`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reset_totp: false });
    assert.equal(fulfill.status, 200);
    assert.ok(fulfill.body.temp_password);

    const tempLogin = await request(app)
      .post('/login')
      .send({ username: testUser, password: fulfill.body.temp_password });
    assert.equal(tempLogin.status, 200);
    assert.equal(tempLogin.body.requires_password_change, true);
    assert.ok(tempLogin.body.change_token);

    const change = await request(app)
      .post('/change-password')
      .set('Authorization', `Bearer ${tempLogin.body.change_token}`)
      .send({ new_password: finalPassword });
    assert.equal(change.status, 200);
    assert.ok(change.body.token);

    const finalLogin = await request(app)
      .post('/login')
      .send({ username: testUser, password: finalPassword });
    assert.equal(finalLogin.status, 200);
    assert.ok(finalLogin.body.token || finalLogin.body.requires_totp);
  });
});
