const express = require('express');
const { Server } = require('../models/server');
const { authenticateAlertIngest } = require('../middleware/auth');
const { HEARTBEAT_STALE_SECONDS } = require('../services/agentStatus');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * CLI agent heartbeat — per-server X-API-Key (or admin JWT).
 * Body: { server_name } (ignored/overridden when using server API key)
 */
router.post('/agent/heartbeat', authenticateAlertIngest, async (req, res) => {
  try {
    let server;
    if (req.ingestServer) {
      server = req.ingestServer;
    } else {
      const server_name = req.body.server_name || req.body.serverName;
      if (!server_name) {
        return res.status(400).json({ error: 'server_name is required' });
      }
      server = await Server.findOne({ where: { server_name } });
      if (!server) {
        return res.status(404).json({ error: `Unknown server: ${server_name}` });
      }
    }

    const now = new Date();
    await server.update({ agent_last_heartbeat_at: now, is_active: true });

    logger.info('agent_heartbeat', {
      server_name: server.server_name,
      server_id: server.server_id
    });
    res.json({
      status: 'ok',
      server_name: server.server_name,
      agent_status: 'live',
      agent_last_heartbeat_at: now.toISOString(),
      stale_after_seconds: HEARTBEAT_STALE_SECONDS
    });
  } catch (error) {
    logger.error('agent_heartbeat_error', { error: error.message });
    res.status(500).json({ error: 'Failed to record heartbeat' });
  }
});

module.exports = router;
