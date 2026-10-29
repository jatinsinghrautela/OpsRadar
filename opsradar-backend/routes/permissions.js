const express = require('express');
const { UserPermission } = require('../models/user_permission');
const { AuditLog } = require('../models/audit_log');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/permissions', authenticateToken, requireAdmin, auditMiddleware, async (req, res) => {
  try {
    const { user_id, country_id, app_id, group_id, server_id, can_view } = req.body;
    const permission = await UserPermission.create({ user_id, country_id, app_id, group_id, server_id, can_view });
    await AuditLog.create({
      user_id: req.user.user_id,
      action: 'set_permission',
      details: { permission_id: permission.permission_id }
    });
    res.status(201).json(permission);
  } catch (error) {
    logger.error('create_permission_error', { error: error.message });
    res.status(500).json({ error: 'Failed to create permission' });
  }
});

router.get('/permissions/:user_id', authenticateToken, async (req, res) => {
  const permissions = await UserPermission.findAll({ where: { user_id: req.params.user_id } });
  res.json(permissions);
});

module.exports = router;
