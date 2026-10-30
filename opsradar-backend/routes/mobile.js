const express = require('express');
const crypto = require('crypto');
const { Op } = require('../models/country');
const { User } = require('../models/user');
const { Alert } = require('../models/alert');
const { Server } = require('../models/server');
const { UserGroup } = require('../models/user_group');
const { Application } = require('../models/application');
const { Country } = require('../models/country');
const { UserGroupMembership } = require('../models/user_group_membership');
const { UserPermission } = require('../models/user_permission');
const { Notification } = require('../models/notification');
const { MobileDevice } = require('../models/mobile');
const { authenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { createSession, rotateSession, revokeSession } = require('../services/mobileSessions');
const { buildAlertScopeWhere } = require('../services/alertScope');
const { notificationScope } = require('../services/notificationScope');
const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.post('/sessions/refresh', rateLimit(), wrap(async (req, res) => {
  const result = await rotateSession(req.body.refresh_token);
  if (!result) return res.status(401).json({ error: 'Session expired. Sign in again.' });
  res.json(result);
}));
router.use(authenticateToken);
router.post('/sessions', rateLimit(), wrap(async (req, res) => {
  if (req.user.sid) return res.status(400).json({ error: 'Already using a mobile session' });
  res.json(await createSession(await User.findByPk(req.user.user_id)));
}));
router.post('/sessions/logout', wrap(async (req, res) => {
  if (req.user.sid) await revokeSession(req.user.sid, req.user.user_id);
  res.json({ message: 'Signed out' });
}));
router.get('/alerts/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(404).json({ error: 'Alert unavailable' });
  const scope = await buildAlertScopeWhere(req.user);
  const alert = await Alert.findOne({ where: { [Op.and]: [{ alert_id: id }, scope || {}] }, include: [Server, UserGroup, Application, Country] });
  if (!alert) return res.status(404).json({ error: 'Alert unavailable or access removed' });
  res.json({ id: alert.alert_id, message: alert.message, severity: alert.severity, status: alert.status,
    server: alert.Server?.server_name || 'Unknown', group: alert.UserGroup?.group_name || 'Unknown', app: alert.Application?.app_name || 'Unknown', country: alert.Country?.country_name || 'Unknown',
    timestamp: alert.last_seen_at || alert.updatedAt, created_at: alert.createdAt, resolved_at: alert.resolved_at });
}));
router.get('/resources', wrap(async (req, res) => {
  const type = req.query.type === 'server' ? 'server' : 'group';
  const q = String(req.query.q || '').trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const model = type === 'server' ? Server : UserGroup;
  const id = type === 'server' ? 'server_id' : 'group_id';
  const name = type === 'server' ? 'server_name' : 'group_name';
  const rows = await model.findAndCountAll({ attributes: [id, name], where: q ? { [name]: { [Op.iLike]: `%${q}%` } } : {}, limit: 30, offset: (page - 1) * 30, order: [[name, 'ASC']] });
  res.json({ items: rows.rows.map(r => ({ id: r[id], name: r[name], type })), total: rows.count, page });
}));
router.get('/access', wrap(async (req, res) => {
  const memberships = await UserGroupMembership.findAll({ where: { user_id: req.user.user_id } });
  const permissions = await UserPermission.findAll({ where: { user_id: req.user.user_id, can_view: true } });
  const groupIds = [...new Set(memberships.map(m => m.group_id).concat(permissions.filter(p => p.group_id && !p.server_id && !p.country_id && !p.app_id).map(p => p.group_id)))];
  const serverIds = [...new Set(permissions.filter(p => p.server_id && !p.country_id && !p.app_id && !p.group_id).map(p => p.server_id))];
  const groups = await UserGroup.findAll({ attributes: ['group_id', 'group_name'], where: req.user.is_admin ? {} : { group_id: groupIds } });
  const servers = await Server.findAll({ attributes: ['server_id', 'server_name'], where: req.user.is_admin ? {} : { server_id: serverIds } });
  res.json({ is_admin: req.user.is_admin, groups: groups.map(g => ({ id: g.group_id, name: g.group_name })), servers: servers.map(s => ({ id: s.server_id, name: s.server_name })), scoped_permission_count: permissions.filter(p => p.country_id || p.app_id || (!p.server_id && !p.group_id) || (p.server_id && p.group_id)).length });
}));
router.get('/activity', wrap(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const scope = await notificationScope(req.user);
  const result = await Notification.findAndCountAll({ ...scope, order: [['createdAt', 'DESC'], ['notification_id', 'DESC']], limit: 30, offset: (page - 1) * 30, subQuery: false });
  res.json({ items: result.rows.map(n => ({ id: n.notification_id, alert_id: n.alert_id, message: n.message, severity: n.severity, kind: n.kind, is_read: n.is_read, created_at: n.createdAt })), total: result.count, page });
}));
router.get('/push-status', (req, res) => res.json({ enabled: process.env.PUSH_ENABLED === 'true' && process.env.PUSH_PROVIDER === 'expo', ios_enabled: process.env.MOBILE_IOS_PUSH_ENABLED === 'true' }));
router.post('/devices', rateLimit(), wrap(async (req, res) => {
  if (!req.user.sid) return res.status(403).json({ error: 'A mobile session is required' });
  const { token, platform } = req.body;
  if (!['android', 'ios'].includes(platform) || typeof token !== 'string' || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token) || token.length > 255) return res.status(400).json({ error: 'Invalid device registration' });
  if (process.env.PUSH_ENABLED !== 'true' || process.env.PUSH_PROVIDER !== 'expo' || (platform === 'ios' && process.env.MOBILE_IOS_PUSH_ENABLED !== 'true')) return res.status(409).json({ error: 'Push delivery is disabled on this server' });
  const [device] = await MobileDevice.findOrCreate({ where: { push_token: token }, defaults: { device_id: crypto.randomUUID(), user_id: req.user.user_id, session_id: req.user.sid, platform, active: true } });
  // One physical push token belongs to the account/session currently signed in on that phone.
  await device.update({ user_id: req.user.user_id, session_id: req.user.sid, platform, active: true });
  res.json({ id: device.device_id });
}));
router.delete('/devices/:id', wrap(async (req, res) => {
  await MobileDevice.update({ active: false }, { where: { device_id: req.params.id, user_id: req.user.user_id } });
  res.json({ message: 'Device disabled' });
}));
router.use((error, req, res, next) => { console.error('mobile_route_error', error.message); res.status(500).json({ error: 'Unable to complete the request' }); });
module.exports = router;
