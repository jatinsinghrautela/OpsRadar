const { AuditLog } = require('../models/audit_log');
const logger = require('../utils/logger');

const auditMiddleware = async (req, res, next) => {
  const userId = req.user?.user_id;
  const action = `${req.method} ${req.path}`;

  const manualLogEndpoints = ['/users/:id', '/groups/:id', '/servers/:id', '/applications/:id'];
  if (manualLogEndpoints.some(path => req.path.match(path))) {
    return next();
  }

  try {
    await AuditLog.create({
      user_id: userId,
      action,
      details: { body: req.body, params: req.params }
    });
  } catch (error) {
    logger.error('audit_log_failed', { error: error.message });
  }
  next();
};

module.exports = { auditMiddleware };
