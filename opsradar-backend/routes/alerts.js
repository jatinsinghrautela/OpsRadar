const express = require('express');
const { Op } = require('sequelize');
const { Country } = require('../models/country');
const { Application } = require('../models/application');
const { Server } = require('../models/server');
const { Alert } = require('../models/alert');
const { UserGroup } = require('../models/user_group');
const { authenticateToken, authenticateAlertIngest, requireAdmin } = require('../middleware/auth');
const {
  getServerIdByName,
  getAppIdByName,
  getGroupIdByName,
  getCountryIdByName
} = require('../services/resolveNames');
const { buildAlertScopeWhere } = require('../services/alertScope');
const { buildFingerprint } = require('../services/fingerprint');
const { createNotificationsForAlert, createResolveNotifications } = require('../services/notify');
const { pruneResolvedAlerts } = require('../services/retention');
const { Notification } = require('../models/notification');
const { AuditLog } = require('../models/audit_log');
const logger = require('../utils/logger');

const router = express.Router();

function formatAlert(alert) {
  return {
    id: alert.alert_id,
    message: alert.message,
    severity: alert.severity,
    status: alert.status || 'active',
    fingerprint: alert.fingerprint,
    country: alert.Country?.country_name || 'Unknown',
    server: alert.Server?.server_name || 'Unknown',
    serverIp: alert.Server?.ip_address || 'Unknown',
    app: alert.Application?.app_name || 'Unknown',
    group: alert.UserGroup?.group_name || 'Unknown',
    timestamp: alert.last_seen_at || alert.updatedAt,
    resolved_at: alert.resolved_at,
    last_seen_at: alert.last_seen_at
  };
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const scopeWhere = await buildAlertScopeWhere(req.user);
    const statusFilter = req.query.status; // active | resolved | all
    const where = { ...(scopeWhere || {}) };
    if (statusFilter === 'active' || statusFilter === 'resolved') {
      where.status = statusFilter;
    }

    const severities = parseCsv(req.query.severity).map((s) => s.toLowerCase());
    if (severities.length) {
      where.severity = { [Op.in]: severities };
    }

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      where.message = { [Op.iLike]: `%${q}%` };
    }

    const countries = parseCsv(req.query.country);
    const servers = parseCsv(req.query.server);
    const apps = parseCsv(req.query.app);
    const groups = parseCsv(req.query.group);

    const include = [
      {
        model: Server,
        attributes: ['server_name', 'ip_address'],
        where: servers.length ? { server_name: { [Op.in]: servers } } : undefined,
        required: servers.length > 0
      },
      {
        model: UserGroup,
        attributes: ['group_name'],
        where: groups.length ? { group_name: { [Op.in]: groups } } : undefined,
        required: groups.length > 0
      },
      {
        model: Application,
        attributes: ['app_name'],
        where: apps.length ? { app_name: { [Op.in]: apps } } : undefined,
        required: apps.length > 0
      },
      {
        model: Country,
        attributes: ['country_name'],
        where: countries.length ? { country_name: { [Op.in]: countries } } : undefined,
        required: countries.length > 0
      }
    ];

    const wantsPagination =
      req.query.page !== undefined ||
      req.query.pageSize !== undefined ||
      req.query.limit !== undefined;

    if (!wantsPagination) {
      const alerts = await Alert.findAll({
        where: Object.keys(where).length ? where : undefined,
        include,
        order: [['updatedAt', 'DESC']]
      });
      return res.json(alerts.map(formatAlert));
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize || req.query.limit || '25', 10) || 25)
    );
    const offset = (page - 1) * pageSize;

    const { count, rows } = await Alert.findAndCountAll({
      where: Object.keys(where).length ? where : undefined,
      include,
      order: [['updatedAt', 'DESC']],
      limit: pageSize,
      offset,
      distinct: true
    });

    res.json({
      items: rows.map(formatAlert),
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize))
    });
  } catch (error) {
    logger.error('fetch_alerts_error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * Admin clear stored alerts.
 * Query/body scope: resolved | active | all (default resolved).
 */
router.delete('/alerts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const scope = String(req.query.scope || req.body?.scope || 'resolved').toLowerCase();
    if (!['resolved', 'active', 'all'].includes(scope)) {
      return res.status(400).json({ error: 'scope must be resolved, active, or all' });
    }

    const where = scope === 'all' ? {} : { status: scope };
    const alerts = await Alert.findAll({
      where: Object.keys(where).length ? where : undefined,
      attributes: ['alert_id']
    });
    const ids = alerts.map((a) => a.alert_id);

    if (ids.length) {
      await Notification.destroy({ where: { alert_id: ids } });
      await Alert.destroy({ where: { alert_id: ids } });
    }

    try {
      await AuditLog.create({
        user_id: req.user.user_id,
        action: 'DELETE /alerts',
        details: { scope, deleted: ids.length }
      });
    } catch (_) {
      /* non-fatal */
    }

    logger.info('alerts_cleared', { scope, deleted: ids.length, user_id: req.user.user_id });
    res.json({ status: 'ok', scope, deleted: ids.length });
  } catch (error) {
    logger.error('clear_alerts_error', { error: error.message });
    res.status(500).json({ error: 'Failed to clear alerts' });
  }
});

router.post('/alert', authenticateAlertIngest, async (req, res) => {
  try {
    let { message, severity, server_name, group_name, app_name, country_name } = req.body;
    message = message || 'Default alert message';
    severity = severity || 'minor';
    group_name = group_name || 'techops';
    app_name = app_name || 'monitor';
    country_name = country_name || 'United States';

    // Per-server API key binds the agent to that server (cannot spoof another name)
    if (req.ingestServer) {
      server_name = req.ingestServer.server_name;
    } else {
      server_name = server_name || null;
      if (!server_name) {
        return res.status(400).json({ error: 'server_name is required' });
      }
    }

    if (!['trivial', 'minor', 'major', 'critical'].includes(severity)) {
      throw new Error('Invalid severity level. Use trivial, minor, major, or critical.');
    }

    const server_id = req.ingestServer
      ? req.ingestServer.server_id
      : await getServerIdByName(server_name);
    const app_id = await getAppIdByName(app_name);
    const country_id = await getCountryIdByName(country_name);
    const group_id = await getGroupIdByName(group_name);
    const fingerprint = buildFingerprint({
      severity,
      server_name,
      app_name,
      group_name,
      message
    });
    const now = new Date();

    // Alert traffic also proves the agent is live for that server
    try {
      await Server.update(
        { agent_last_heartbeat_at: now },
        { where: { server_id } }
      );
    } catch (_) {
      /* non-fatal */
    }
    const existing = await Alert.findOne({
      where: { fingerprint, status: 'active' }
    });

    if (existing) {
      await existing.update({ last_seen_at: now, message, severity });
      pruneResolvedAlerts().catch(() => {});
      logger.info('alert_reasserted', { alert_id: existing.alert_id, fingerprint });
      return res.status(200).json({
        status: 'Alert updated',
        alert_id: existing.alert_id,
        fingerprint,
        action: 'reassert'
      });
    }

    const alert = await Alert.create({
      message,
      severity,
      server_id,
      group_id,
      app_id,
      country_id,
      fingerprint,
      status: 'active',
      last_seen_at: now
    });

    try {
      await createNotificationsForAlert(alert);
    } catch (notifyErr) {
      logger.error('alert_notify_failed', { error: notifyErr.message, alert_id: alert.alert_id });
    }

    pruneResolvedAlerts().catch(() => {});
    logger.info('alert_ingested', { severity, server_name, alert_id: alert.alert_id, fingerprint });
    res.status(200).json({
      status: 'Alert received',
      alert_id: alert.alert_id,
      fingerprint,
      action: 'open'
    });
  } catch (error) {
    logger.error('alert_ingest_error', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

router.post('/alert/resolve', authenticateAlertIngest, async (req, res) => {
  try {
    let { fingerprint, message, severity, server_name, group_name, app_name } = req.body;
    if (req.ingestServer) {
      server_name = req.ingestServer.server_name;
    }
    if (!fingerprint) {
      fingerprint = buildFingerprint({
        severity: severity || 'minor',
        server_name: server_name || 'unknown',
        app_name: app_name || 'monitor',
        group_name: group_name || 'techops',
        message: message || ''
      });
    }

    const alert = await Alert.findOne({
      where: { fingerprint, status: 'active' }
    });
    if (!alert) {
      return res.status(200).json({
        status: 'No active alert',
        fingerprint,
        action: 'noop'
      });
    }

    const now = new Date();
    await alert.update({ status: 'resolved', resolved_at: now });

    try {
      await createResolveNotifications(alert);
    } catch (notifyErr) {
      logger.error('resolve_notify_failed', { error: notifyErr.message, alert_id: alert.alert_id });
    }

    pruneResolvedAlerts().catch(() => {});
    logger.info('alert_resolved', { alert_id: alert.alert_id, fingerprint });
    res.status(200).json({
      status: 'Alert resolved',
      alert_id: alert.alert_id,
      fingerprint,
      action: 'resolve'
    });
  } catch (error) {
    logger.error('alert_resolve_error', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
