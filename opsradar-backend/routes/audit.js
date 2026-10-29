const express = require('express');
const { User } = require('../models/user');
const { AuditLog } = require('../models/audit_log');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/audit', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.findAll({ order: [['timestamp', 'DESC']] });
    const users = await User.findAll({ attributes: ['user_id', 'username'] });
    const userMap = new Map(users.map(user => [user.user_id, user.username]));

    const formattedLogs = logs.map(log => ({
      id: log.log_id,
      user: userMap.get(log.user_id) || 'Unknown',
      action: log.action,
      timestamp: log.timestamp,
      details: log.details || {}
    }));

    res.json(formattedLogs);
  } catch (error) {
    logger.error('fetch_audit_error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
