const jwt = require('jsonwebtoken');
const { Server } = require('../models/server');
const { User } = require('../models/user');
const { hashIngestApiKey } = require('../services/ingestKeys');
const logger = require('../utils/logger');

const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY;

function getSecretKey() {
  return process.env.JWT_SECRET || process.env.SECRET_KEY || SECRET_KEY;
}

const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(token, getSecretKey());
    if (payload.purpose) return res.status(403).json({ error: 'This token cannot access application data' });
    const user = await User.findByPk(payload.user_id);
    if (!user?.is_active || user.must_change_password) return res.status(401).json({ error: 'Account inactive or password change required' });
    if (payload.sid) {
      const { MobileSession } = require('../models/mobile');
      const session = await MobileSession.findByPk(payload.sid);
      if (!session || session.user_id !== user.user_id || session.revoked_at || session.expires_at <= new Date()) return res.status(401).json({ error: 'Session expired' });
    }
    req.user = { user_id: user.user_id, is_admin: user.is_admin, sid: payload.sid };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      logger.warn('auth_token_invalid');
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication unavailable' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Admin access required' });
  next();
};

/**
 * CLI agents authenticate with a per-server X-API-Key.
 * Admin UI may use Bearer JWT (no ingestServer bound).
 */
const authenticateAlertIngest = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      const server = await Server.findOne({
        where: { ingest_api_key_hash: hashIngestApiKey(apiKey) }
      });
      if (server) {
        if (server.is_active === false) {
          return res.status(403).json({ error: 'Server agent is inactive' });
        }
        req.ingestServer = server;
        return next();
      }
      logger.warn('ingest_api_key_unknown');
      return res.status(401).json({ error: 'Invalid X-API-Key' });
    }

    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      logger.warn('ingest_auth_missing');
      return res.status(401).json({ error: 'Missing X-API-Key or Bearer token' });
    }
    return authenticateToken(req, res, next);
  } catch (error) {
    logger.error('ingest_auth_error', { error: error.message });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const authenticateChangePassword = async (req, res, next) => {
  const bearer = req.headers['authorization']?.split(' ')[1];
  const headerToken = req.headers['x-change-token'];
  const token = headerToken || bearer;
  if (!token) return res.status(401).json({ error: 'No change token provided' });
  let payload;
  try { payload = jwt.verify(token, getSecretKey()); }
  catch { return res.status(403).json({ error: 'Invalid or expired change token' }); }
  // Ordinary sessions must pass the same revocation checks as every other API.
  if (!payload.purpose) return authenticateToken(req, res, next);
  if (payload.purpose !== 'change_password') return res.status(403).json({ error: 'Invalid token purpose' });
  try {
    const user = await User.findByPk(payload.user_id);
    if (!user?.is_active || !user.must_change_password) return res.status(403).json({ error: 'Password change session expired' });
    req.user = payload;
    next();
  } catch { res.status(500).json({ error: 'Authentication failed' }); }
};

module.exports = {
  getSecretKey,
  authenticateToken,
  requireAdmin,
  authenticateAlertIngest,
  authenticateChangePassword
};
