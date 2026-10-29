const { Op } = require('../models/country');
const { User } = require('../models/user');
const { UserGroupMembership } = require('../models/user_group_membership');
const { UserPermission } = require('../models/user_permission');
const { Notification } = require('../models/notification');
const logger = require('../utils/logger');

const DEFAULT_PREFS = {
  critical: true,
  major: true,
  minor: false,
  trivial: false
};

function normalizePrefs(raw) {
  return { ...DEFAULT_PREFS, ...(raw || {}) };
}

function permissionMatchesAlert(permission, alert) {
  if (permission.country_id != null && permission.country_id !== alert.country_id) return false;
  if (permission.app_id != null && permission.app_id !== alert.app_id) return false;
  if (permission.group_id != null && permission.group_id !== alert.group_id) return false;
  if (permission.server_id != null && permission.server_id !== alert.server_id) return false;
  return true;
}

/**
 * Users who should receive an in-app notification for this alert:
 * active admins, or users with group membership / matching view permission,
 * filtered by notify_prefs for the alert severity.
 */
async function findNotifyRecipients(alert) {
  const users = await User.findAll({
    where: { is_active: true },
    attributes: ['user_id', 'is_admin', 'notify_prefs']
  });

  const [memberships, permissions] = await Promise.all([
    UserGroupMembership.findAll({
      where: { group_id: alert.group_id },
      attributes: ['user_id']
    }),
    UserPermission.findAll({
      where: { can_view: true },
      attributes: ['user_id', 'country_id', 'app_id', 'group_id', 'server_id']
    })
  ]);

  const memberSet = new Set(memberships.map((m) => m.user_id));
  const permByUser = new Map();
  for (const p of permissions) {
    const list = permByUser.get(p.user_id) || [];
    list.push(p);
    permByUser.set(p.user_id, list);
  }

  const recipients = [];
  for (const user of users) {
    const prefs = normalizePrefs(user.notify_prefs);
    if (!prefs[alert.severity]) continue;

    if (user.is_admin) {
      recipients.push(user);
      continue;
    }
    if (memberSet.has(user.user_id)) {
      recipients.push(user);
      continue;
    }
    const perms = permByUser.get(user.user_id) || [];
    if (perms.some((p) => permissionMatchesAlert(p, alert))) {
      recipients.push(user);
    }
  }
  return recipients;
}

async function createNotificationsForAlert(alert) {
  try {
    const recipients = await findNotifyRecipients(alert);
    if (!recipients.length) {
      await alert.update({ notification_sent: true });
      return { created: 0 };
    }

    const existing = await Notification.findAll({
      where: {
        alert_id: alert.alert_id,
        user_id: { [Op.in]: recipients.map((u) => u.user_id) }
      },
      attributes: ['user_id']
    });
    const already = new Set(existing.map((n) => n.user_id));

    const rows = recipients
      .filter((u) => !already.has(u.user_id))
      .map((u) => ({
        user_id: u.user_id,
        alert_id: alert.alert_id,
        severity: alert.severity,
        message: alert.message,
        is_read: false
      }));

    if (rows.length) {
      await Notification.bulkCreate(rows);
    }
    await alert.update({ notification_sent: true });
    logger.info('notifications_created', {
      alert_id: alert.alert_id,
      severity: alert.severity,
      count: rows.length
    });
    return { created: rows.length };
  } catch (error) {
    logger.error('notifications_create_error', { error: error.message, alert_id: alert.alert_id });
    throw error;
  }
}

async function createResolveNotifications(alert) {
  try {
    const recipients = await findNotifyRecipients(alert);
    if (!recipients.length) return { created: 0 };

    const rows = recipients.map((u) => ({
      user_id: u.user_id,
      alert_id: alert.alert_id,
      severity: alert.severity,
      message: `Resolved: ${alert.message}`,
      is_read: false
    }));
    await Notification.bulkCreate(rows);
    logger.info('resolve_notifications_created', {
      alert_id: alert.alert_id,
      count: rows.length
    });
    return { created: rows.length };
  } catch (error) {
    logger.error('resolve_notifications_error', { error: error.message, alert_id: alert.alert_id });
    throw error;
  }
}

module.exports = {
  DEFAULT_PREFS,
  normalizePrefs,
  findNotifyRecipients,
  createNotificationsForAlert,
  createResolveNotifications
};
