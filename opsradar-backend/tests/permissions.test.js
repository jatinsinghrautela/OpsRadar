const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');

require('./setupEnv');

const { createApp } = require('../app');
const { runMigrations } = require('../migrate');
const { User } = require('../models/user');
const { UserGroupMembership } = require('../models/user_group_membership');
const { UserGroup } = require('../models/user_group');

describe('permission-scoped alerts', () => {
  let app;
  let adminToken;
  let userToken;
  const stamp = Date.now();
  const username = `scope_${stamp}`;

  before(async () => {
    assert.ok(process.env.JWT_SECRET || process.env.SECRET_KEY, 'JWT_SECRET required');
    await runMigrations();
    app = createApp();

    const login = await request(app).post('/login').send({ username: 'admin', password: 'admin123' });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
    adminToken = login.body.token;

    const user = await User.create({
      username,
      email: `${username}@example.com`,
      password_hash: await bcrypt.hash('ScopePass1!', 10),
      is_active: true,
      is_admin: false
    });

    const group = await UserGroup.findOne({ where: { group_name: 'techops' } });
    assert.ok(group, 'techops group required in lab DB');
    await UserGroupMembership.create({ user_id: user.user_id, group_id: group.group_id });

    const userLogin = await request(app)
      .post('/login')
      .send({ username, password: 'ScopePass1!' });
    assert.equal(userLogin.status, 200);
    assert.ok(userLogin.body.token);
    userToken = userLogin.body.token;
  });

  it('admin sees alerts; scoped user sees only membership groups', async () => {
    const adminAlerts = await request(app)
      .get('/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminAlerts.status, 200);
    assert.ok(Array.isArray(adminAlerts.body));
    assert.ok(adminAlerts.body.length > 0);

    const userAlerts = await request(app)
      .get('/alerts')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(userAlerts.status, 200);
    assert.ok(Array.isArray(userAlerts.body));
    assert.ok(userAlerts.body.every((a) => a.group === 'techops' || a.group === 'Unknown'));
  });

  it('access request group approve grants membership', async () => {
    const groups = await request(app)
      .get('/groups')
      .set('Authorization', `Bearer ${userToken}`);
    assert.equal(groups.status, 200);
    const other = groups.body.find((g) => g.group_name !== 'techops');
    if (!other) return;

    const create = await request(app)
      .post('/access-requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ resource_type: 'group', resource_id: other.group_id });
    assert.equal(create.status, 201);

    const approve = await request(app)
      .post(`/access-requests/${create.body.request_id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    assert.equal(approve.status, 200);

    const memberships = await request(app)
      .get(`/users/${create.body.user_id}/groups`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(memberships.status, 200);
    assert.ok(memberships.body.some((g) => g.group_id === other.group_id));
  });
});
