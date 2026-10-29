const express = require('express');
const { Alert } = require('../models/alert');
const { Server } = require('../models/server');
const { User } = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const { buildAlertScopeWhere } = require('../services/alertScope');
const { summarizeAgentStatus } = require('../services/agentStatus');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const scopeWhere = await buildAlertScopeWhere(req.user);
    const [alertCount, servers, userCount] = await Promise.all([
      Alert.count({
        where: {
          ...(scopeWhere || {}),
          status: 'active'
        }
      }),
      Server.findAll({
        where: { is_active: true },
        attributes: ['server_id', 'agent_last_heartbeat_at']
      }),
      User.count({ where: { is_active: true } })
    ]);

    const agents = summarizeAgentStatus(servers);
    res.json({
      alerts: alertCount,
      servers: servers.length,
      users: userCount,
      agents_live: agents.agents_live,
      agents_down: agents.agents_down,
      agents_unknown: agents.agents_unknown,
      agents_total: agents.agents_total,
      agents_label: `${agents.agents_live}/${agents.agents_total}`,
      heartbeat_stale_seconds: agents.heartbeat_stale_seconds
    });
  } catch (error) {
    logger.error('dashboard_summary_error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
