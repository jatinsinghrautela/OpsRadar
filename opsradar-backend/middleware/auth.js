const jwt = require('jsonwebtoken');
const { Server } = require('../models/server');
const { hashIngestApiKey } = require('../services/ingestKeys');
const logger = require('../utils/logger');

const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY;

function getSecretKey() {
  return process.env.JWT_SECRET || process.env.SECRET_KEY || SECRET_KEY;
}

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, getSecretKey(), (err, user) => {
    if (err) {
      logger.warn('auth_token_invalid');
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
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
    jwt.verify(token, getSecretKey(), (err, user) => {
      if (err) {
        logger.warn('ingest_jwt_invalid');
        return res.status(403).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    logger.error('ingest_auth_error', { error: error.message });
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const authenticateChangePassword = (req, res, next) => {
  const bearer = req.headers['authorization']?.split(' ')[1];
  const headerToken = req.headers['x-change-token'];
  const token = headerToken || bearer;
  if (!token) return res.status(401).json({ error: 'No change token provided' });
  jwt.verify(token, getSecretKey(), (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired change token' });
    if (payload.purpose && payload.purpose !== 'change_password') {
      return res.status(403).json({ error: 'Invalid token purpose' });
    }
    req.user = payload;
    next();
  });
};

module.exports = {
  getSecretKey,
  authenticateToken,
  requireAdmin,
  authenticateAlertIngest,
  authenticateChangePassword
};
