const { Op, sequelize } = require('../models/country');
const { MobileDevice, MobileSession, PushJob } = require('../models/mobile');
const { Notification } = require('../models/notification');
const { Alert } = require('../models/alert');
const { User } = require('../models/user');
const { buildAlertScopeWhere } = require('./alertScope');
const logger = require('../utils/logger');
const enabled = () => process.env.PUSH_ENABLED === 'true' && process.env.PUSH_PROVIDER === 'expo';
async function enqueueNotifications(notifications, transaction) {
  if (!enabled() || !notifications.length) return;
  const devices = await MobileDevice.findAll({ where: { active: true, user_id: notifications.map(n => n.user_id) }, transaction });
  const jobs = [];
  for (const n of notifications) for (const d of devices) {
    if (d.user_id !== n.user_id || (d.platform === 'ios' && process.env.MOBILE_IOS_PUSH_ENABLED !== 'true')) continue;
    jobs.push({ notification_id: n.notification_id, device_id: d.device_id, next_at: new Date() });
  }
  if (jobs.length) await PushJob.bulkCreate(jobs, { transaction, ignoreDuplicates: true });
}
async function createAccessNotification(userId, approved) {
  return sequelize.transaction(async transaction => {
    const n = await Notification.create({ user_id: userId, alert_id: null, severity: 'trivial', kind: 'access', message: approved ? 'Your access request was approved. Open My access to review it.' : 'Your access request was rejected. Open My access for details.' }, { transaction });
    await enqueueNotifications([n], transaction);
  });
}
async function stillEligible(notification, device) {
  if (!notification || !device?.active || notification.user_id !== device.user_id) return false;
  const [user, session] = await Promise.all([User.findByPk(device.user_id), MobileSession.findByPk(device.session_id)]);
  if (!user?.is_active || user.must_change_password || !session || session.user_id !== device.user_id || session.revoked_at || session.expires_at <= new Date()) return false;
  if (device.platform === 'ios' && process.env.MOBILE_IOS_PUSH_ENABLED !== 'true') return false;
  if (notification.kind === 'access') return true;
  const prefs = { critical: true, major: true, minor: false, trivial: false, ...(user.notify_prefs || {}) };
  if (!prefs[notification.severity]) return false;
  const scope = await buildAlertScopeWhere(user);
  return Boolean(await Alert.findOne({ where: { [Op.and]: [{ alert_id: notification.alert_id }, scope || {}] }, attributes: ['alert_id'] }));
}
async function expo(path, data) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return response.json();
}
let busy = false;
async function processPushJobs() {
  if (!enabled() || busy) return;
  busy = true;
  try {
    for (let i = 0; i < 20; i++) {
      const job = await sequelize.transaction(async transaction => {
        const next = await PushJob.findOne({ where: { state: ['pending', 'waiting', 'sending'], next_at: { [Op.lte]: new Date() } }, order: [['next_at', 'ASC']], transaction, lock: transaction.LOCK.UPDATE, skipLocked: true });
        if (!next) return null;
        await next.update({ state: 'sending', next_at: new Date(Date.now() + 60000), attempts: next.attempts + 1 }, { transaction });
        return next;
      });
      if (!job) break;
      const [notification, device] = await Promise.all([Notification.findByPk(job.notification_id), MobileDevice.findByPk(job.device_id)]);
      if (Date.now() - new Date(job.createdAt).getTime() > 24 * 3600000 || !await stillEligible(notification, device)) { await job.update({ state: 'cancelled', error: 'expired_or_access_removed' }); continue; }
      try {
        const reply = job.ticket ? await expo('getReceipts', { ids: [job.ticket] }) : await expo('send', {
          to: device.push_token, title: 'OpsRadar', body: notification.kind === 'access' ? 'Your access request has an update.' : `You have a ${notification.severity} alert update.`,
          sound: 'default', channelId: 'opsradar-alerts', ttl: 3600,
          data: { notification_id: notification.notification_id, alert_id: notification.alert_id, kind: notification.kind }
        });
        const result = job.ticket ? reply.data?.[job.ticket] : (Array.isArray(reply.data) ? reply.data[0] : reply.data);
        if (!result && job.ticket) { await job.update({ state: 'waiting', next_at: new Date(Date.now() + 60000) }); continue; }
        if (result?.status === 'ok') {
          await job.update(job.ticket ? { state: 'delivered', error: null } : { state: 'waiting', ticket: result.id, next_at: new Date(Date.now() + 30000), attempts: 0 });
        } else if (result?.details?.error === 'DeviceNotRegistered') {
          await device.update({ active: false }); await job.update({ state: 'cancelled', error: 'DeviceNotRegistered' });
        } else throw new Error(result?.details?.error || 'provider_error');
      } catch (error) {
        await job.update({ state: job.attempts >= 8 ? 'failed' : (job.ticket ? 'waiting' : 'pending'), next_at: new Date(Date.now() + Math.min(3600000, 1000 * 2 ** job.attempts)), error: String(error.message).slice(0, 100) });
      }
    }
  } finally { busy = false; }
}
function startPushWorker() {
  if (!enabled()) { logger.info('push_disabled'); return; }
  const tick = () => processPushJobs().catch(error => logger.error('push_worker_failed', { error: error.message }));
  const timer = setInterval(tick, 15000); timer.unref(); tick();
}
module.exports = { enqueueNotifications, createAccessNotification, stillEligible, processPushJobs, startPushWorker };
