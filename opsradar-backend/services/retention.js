const { Op } = require('../models/country');
const { Alert } = require('../models/alert');
const { Server } = require('../models/server');
const { Application } = require('../models/application');
const { Notification } = require('../models/notification');
const logger = require('../utils/logger');

const GLOBAL_DEFAULT_RETENTION_DAYS = Number(process.env.ALERT_RETENTION_DAYS) || 30;

function effectiveRetentionDays(server, app) {
  if (app?.retention_days != null && app.retention_days > 0) return app.retention_days;
  if (server?.retention_days != null && server.retention_days > 0) return server.retention_days;
  return GLOBAL_DEFAULT_RETENTION_DAYS;
}

/**
 * Delete resolved alerts past effective retention (app override → server → global default).
 */
async function pruneResolvedAlerts() {
  const resolved = await Alert.findAll({
    where: { status: 'resolved', resolved_at: { [Op.ne]: null } },
    include: [
      { model: Server, attributes: ['server_id', 'retention_days'], required: false },
      { model: Application, attributes: ['app_id', 'retention_days'], required: false }
    ],
    limit: 500
  });

  const now = Date.now();
  let deleted = 0;
  for (const alert of resolved) {
    const days = effectiveRetentionDays(alert.Server, alert.Application);
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    if (new Date(alert.resolved_at).getTime() < cutoff) {
      await Notification.destroy({ where: { alert_id: alert.alert_id } });
      await alert.destroy();
      deleted += 1;
    }
  }
  if (deleted) {
    logger.info('alerts_pruned', { deleted });
  }
  return { deleted };
}

module.exports = {
  GLOBAL_DEFAULT_RETENTION_DAYS,
  effectiveRetentionDays,
  pruneResolvedAlerts
};
