const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
if (process.env.TEST_ISOLATED === 'true') {
const { sequelize } = require('../models/country');
const { runMigrations } = require('../migrate');
const { createApp } = require('../app');
const { User } = require('../models/user');
const { Server } = require('../models/server');
const { UserGroup } = require('../models/user_group');
const { Alert } = require('../models/alert');
const { UserGroupMembership } = require('../models/user_group_membership');
const { UserPermission } = require('../models/user_permission');
const { Notification } = require('../models/notification');
const { MobileDevice, MobileSession, PushJob } = require('../models/mobile');
const { stillEligible } = require('../services/push');
let app, user, admin, token, adminToken, group, server, otherServer, alert, otherAlert;
const auth = token => ({ Authorization: `Bearer ${token}` });
before(async () => {
  await runMigrations(); app = createApp();
  const password_hash = await bcrypt.hash('mobile-password', 4);
  user = await User.create({ username: 'mobile', email: 'mobile@example.test', password_hash, is_active: true });
  admin = await User.create({ username: 'admin-test', email: 'admin@example.test', password_hash, is_active: true, is_admin: true });
  token = jwt.sign({ user_id: user.user_id, is_admin: false }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ user_id: admin.user_id, is_admin: true }, process.env.JWT_SECRET);
  group = await UserGroup.create({ group_name: 'Operations' });
  server = await Server.create({ server_name: 'server-a' }); otherServer = await Server.create({ server_name: 'server-b' });
  alert = await Alert.create({ severity: 'critical', message: 'Private critical alert', server_id: server.server_id, group_id: group.group_id });
  otherAlert = await Alert.create({ severity: 'major', message: 'Other server', server_id: otherServer.server_id });
});
after(async () => { await sequelize.close(); });
test('no grant denies details, group grant permits them, revocation removes stored notifications', async () => {
  assert.equal((await request(app).get(`/mobile/alerts/${alert.alert_id}`).set(auth(token))).status, 404);
  assert.equal((await request(app).get('/alerts?page=1').set(auth(token))).body.total, 0);
  assert.deepEqual((await request(app).get('/alerts').set(auth(token))).body, []);
  await UserGroupMembership.create({ user_id: user.user_id, group_id: group.group_id });
  assert.equal((await request(app).get(`/mobile/alerts/${alert.alert_id}`).set(auth(token))).status, 200);
  assert.equal((await request(app).get(`/mobile/alerts/${otherAlert.alert_id}`).set(auth(token))).status, 404);
  const notification = await Notification.create({ user_id: user.user_id, alert_id: alert.alert_id, severity: 'critical', message: alert.message });
  assert.equal((await request(app).get('/mobile/activity').set(auth(token))).body.total, 1);
  await UserGroupMembership.destroy({ where: { user_id: user.user_id } });
  assert.equal((await request(app).get('/mobile/activity').set(auth(token))).body.total, 0);
  assert.equal((await request(app).get('/notifications/unread-count').set(auth(token))).body.count, 0);
  assert.equal((await request(app).post(`/notifications/${notification.notification_id}/read`).set(auth(token))).status, 404);
});
test('server-only grant cannot reveal another server; resource catalogue excludes infrastructure secrets', async () => {
  await UserPermission.create({ user_id: user.user_id, server_id: server.server_id, can_view: true });
  assert.equal((await request(app).get(`/mobile/alerts/${alert.alert_id}`).set(auth(token))).status, 200);
  assert.equal((await request(app).get(`/mobile/alerts/${otherAlert.alert_id}`).set(auth(token))).status, 404);
  const catalogue = await request(app).get('/mobile/resources?type=server').set(auth(token));
  assert.equal(catalogue.status, 200); assert.ok(catalogue.body.items.length);
  assert.deepEqual(Object.keys(catalogue.body.items[0]).sort(), ['id', 'name', 'type']);
  const list = await request(app).get('/alerts?page=1&pageSize=1').set(auth(token));
  assert.equal(list.body.total, 1); assert.equal(list.body.items.length, 1);
});
test('pre-auth tokens cannot access app data; account changes invalidate current access and stale admin claims', async () => {
  const pre = jwt.sign({ user_id: user.user_id, purpose: 'totp' }, process.env.JWT_SECRET);
  assert.equal((await request(app).get('/mobile/access').set(auth(pre))).status, 403);
  await user.update({ is_active: false });
  assert.equal((await request(app).get('/mobile/access').set(auth(token))).status, 401);
  await user.update({ is_active: true });
  await admin.update({ is_admin: false });
  assert.equal((await request(app).get('/check-admin').set(auth(adminToken))).status, 403);
  await admin.update({ is_admin: true });
});
test('mobile refresh rotates opaque tokens and logout revokes the session', async () => {
  const created = await request(app).post('/mobile/sessions').set(auth(token));
  assert.equal(created.status, 200); assert.ok(created.body.refresh_token);
  const rotated = await request(app).post('/mobile/sessions/refresh').send({ refresh_token: created.body.refresh_token });
  assert.equal(rotated.status, 200); assert.notEqual(rotated.body.refresh_token, created.body.refresh_token);
  assert.equal((await request(app).post('/mobile/sessions/refresh').send({ refresh_token: created.body.refresh_token })).status, 401);
  assert.equal((await request(app).post('/mobile/sessions/logout').set(auth(rotated.body.token))).status, 200);
  assert.equal((await request(app).get('/mobile/access').set(auth(rotated.body.token))).status, 401);
  assert.equal((await request(app).post('/mobile/sessions/refresh').send({ refresh_token: rotated.body.refresh_token })).status, 401);
});
test('preferences preserve omitted fields and reject string booleans', async () => {
  assert.equal((await request(app).put('/notification-prefs').set(auth(token)).send({ minor: 'false' })).status, 400);
  const result = await request(app).put('/notification-prefs').set(auth(token)).send({ minor: true });
  assert.equal(result.body.critical, true); assert.equal(result.body.minor, true); assert.equal(result.body.major, true);
});
test('access request approval creates a scoped grant and a non-alert activity event', async () => {
  const req = await request(app).post('/access-requests').set(auth(token)).send({ resource_type: 'server', resource_id: otherServer.server_id });
  assert.equal(req.status, 201);
  assert.equal((await request(app).get(`/mobile/alerts/${otherAlert.alert_id}`).set(auth(token))).status, 404);
  assert.equal((await request(app).post(`/access-requests/${req.body.request_id}/approve`).set(auth(adminToken))).status, 200);
  assert.equal((await request(app).get(`/mobile/alerts/${otherAlert.alert_id}`).set(auth(token))).status, 200);
  const history = await request(app).get('/mobile/activity').set(auth(token));
  assert.ok(history.body.items.some(n => n.kind === 'access' && n.alert_id === null));
});
test('push stays off without configuration and delivery rechecks grants and device ownership', async () => {
  const session = await MobileSession.create({ session_id: require('crypto').randomUUID(), user_id: user.user_id, refresh_hash: 'a'.repeat(64), expires_at: new Date(Date.now() + 60000) });
  const device = await MobileDevice.create({ device_id: require('crypto').randomUUID(), user_id: user.user_id, session_id: session.session_id, push_token: 'ExpoPushToken[local-test]', platform: 'android', active: true });
  const n = await Notification.findOne({ where: { user_id: user.user_id, alert_id: alert.alert_id } });
  assert.equal(await stillEligible(n, device), true);
  await UserPermission.destroy({ where: { user_id: user.user_id, server_id: server.server_id } });
  assert.equal(await stillEligible(n, device), false);
  assert.equal((await request(app).get('/mobile/push-status').set(auth(token))).body.enabled, false);
  assert.equal(await PushJob.count(), 0);
});
test('outbox sends minimal payloads, checks receipts and cancels revoked grants without contacting a provider', async () => {
  const { enqueueNotifications, processPushJobs } = require('../services/push');
  const device = await MobileDevice.findOne({ where: { user_id: user.user_id } });
  const notification = await Notification.findOne({ where: { user_id: user.user_id, alert_id: alert.alert_id } });
  await UserPermission.create({ user_id: user.user_id, server_id: server.server_id, can_view: true });
  const originalFetch = global.fetch;
  const calls = [];
  process.env.PUSH_ENABLED = 'true'; process.env.PUSH_PROVIDER = 'expo';
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ data: url.endsWith('/send') ? { status: 'ok', id: 'test-ticket' } : { 'test-ticket': { status: 'ok' } } }) };
  };
  try {
    await enqueueNotifications([notification]); await enqueueNotifications([notification]);
    assert.equal(await PushJob.count(), 1);
    await processPushJobs(); assert.equal(calls.length, 1);
    assert.equal(calls[0].body.body.includes(alert.message), false);
    let job = await PushJob.findOne(); assert.equal(job.state, 'waiting');
    await job.update({ next_at: new Date(0) }); await processPushJobs();
    await job.reload(); assert.equal(job.state, 'delivered'); assert.equal(calls.length, 2);
    const another = await Notification.create({ user_id: user.user_id, alert_id: alert.alert_id, severity: 'critical', message: 'Private message' });
    await enqueueNotifications([another]);
    await UserPermission.destroy({ where: { user_id: user.user_id, server_id: server.server_id } });
    await processPushJobs(); assert.equal(calls.length, 2);
    assert.equal((await PushJob.findOne({ where: { notification_id: another.notification_id } })).state, 'cancelled');
    await device.update({ active: false });
  } finally { global.fetch = originalFetch; process.env.PUSH_ENABLED = 'false'; process.env.PUSH_PROVIDER = 'none'; }
});
} else {
  test('mobile integration uses a separate database', { skip: 'Run npm run test:mobile for the isolated database suite' }, () => {});
}
