const express = require('express');
const { Notification } = require('../models/notification');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { notificationScope } = require('../services/notificationScope');

const router = express.Router();

router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const unreadOnly = String(req.query.unread || '') === 'true';
    const scope = await notificationScope(req.user);
    const where = scope.where;
    if (unreadOnly) where.is_read = false;

    const rows = await Notification.findAll({
      where,
      include: scope.include,
      subQuery: false,
      order: [['createdAt', 'DESC']],
      limit
    });
    res.json(
      rows.map((n) => ({
        id: n.notification_id,
        alert_id: n.alert_id,
        severity: n.severity,
        message: n.message,
        is_read: n.is_read,
        read_at: n.read_at,
        created_at: n.createdAt,
        kind: n.kind
      }))
    );
  } catch (error) {
    logger.error('notifications_list_error', { error: error.message });
    res.status(500).json({ error: 'Failed to list notifications' });
  }
});

router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const scope = await notificationScope(req.user);
    const count = await Notification.count({ ...scope, where: { ...scope.where, is_read: false } });
    res.json({ count });
  } catch (error) {
    logger.error('notifications_unread_error', { error: error.message });
    res.status(500).json({ error: 'Failed to count unread notifications' });
  }
});

router.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const scope = await notificationScope(req.user);
    const row = await Notification.findOne({
      include: scope.include,
      where: {
        ...scope.where,
        notification_id: req.params.id,
        user_id: req.user.user_id
      }
    });
    if (!row) return res.status(404).json({ error: 'Notification not found' });
    if (!row.is_read) {
      await row.update({ is_read: true, read_at: new Date() });
    }
    res.json({
      id: row.notification_id,
      is_read: true,
      read_at: row.read_at
    });
  } catch (error) {
    logger.error('notification_read_error', { error: error.message });
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

router.post('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const scope = await notificationScope(req.user);
    const visible = await Notification.findAll({ ...scope, attributes: ['notification_id'] });
    const [updated] = await Notification.update(
      { is_read: true, read_at: new Date() },
      {
        where: {
          user_id: req.user.user_id,
          notification_id: visible.map(n => n.notification_id),
          is_read: false
        }
      }
    );
    res.json({ updated });
  } catch (error) {
    logger.error('notifications_read_all_error', { error: error.message });
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

module.exports = router;
