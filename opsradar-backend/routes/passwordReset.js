const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { User } = require('../models/user');
const { AuditLog } = require('../models/audit_log');
const { PasswordResetRequest } = require('../models/password_reset_request');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

router.post('/password-reset-requests', async (req, res) => {
  const { username } = req.body;
  try {
    if (!username) return res.status(400).json({ error: 'Username is required' });
    const user = await User.findOne({ where: { username } });
    const publicMessage =
      'If this account exists, a reset request was submitted. Contact an administrator for your temporary password.';

    if (!user || !user.is_active) {
      return res.json({ message: publicMessage });
    }

    const existing = await PasswordResetRequest.findOne({
      where: { user_id: user.user_id, status: 'pending' }
    });
    if (!existing) {
      await PasswordResetRequest.create({ user_id: user.user_id, status: 'pending' });
      await AuditLog.create({
        user_id: user.user_id,
        action: 'password_reset_requested',
        details: { username: user.username }
      });
    }

    res.json({ message: publicMessage });
  } catch (error) {
    logger.error('password_reset_request_error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit reset request' });
  }
});

router.get('/password-reset-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await PasswordResetRequest.findAll({
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'username', 'email', 'totp_enabled'] },
        { model: User, as: 'handler', attributes: ['user_id', 'username'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(rows);
  } catch (error) {
    logger.error('list_password_reset_error', { error: error.message });
    res.status(500).json({ error: 'Failed to list reset requests' });
  }
});

router.post('/password-reset-requests/:id/fulfill', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const request = await PasswordResetRequest.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    const resetTotp = Boolean(req.body?.reset_totp);
    const tempPassword = generateTempPassword();
    const password_hash = await bcrypt.hash(tempPassword, 10);
    const updates = {
      password_hash,
      must_change_password: true
    };
    if (resetTotp) {
      updates.totp_secret = null;
      updates.totp_enabled = false;
    }

    await request.user.update(updates);
    await request.update({
      status: 'fulfilled',
      reset_totp: resetTotp,
      handled_by: req.user.user_id,
      notes: req.body?.notes || null
    });

    await AuditLog.create({
      user_id: req.user.user_id,
      action: 'password_reset_fulfilled',
      details: {
        target_user_id: request.user_id,
        reset_totp: resetTotp,
        request_id: request.request_id
      }
    });

    logger.info('password_reset_fulfilled', {
      request_id: request.request_id,
      target_user_id: request.user_id
    });

    res.json({
      message: 'Temporary password generated. Share it with the user out-of-band.',
      temp_password: tempPassword,
      username: request.user.username,
      reset_totp: resetTotp
    });
  } catch (error) {
    logger.error('fulfill_password_reset_error', { error: error.message });
    res.status(500).json({ error: 'Failed to fulfill reset request' });
  }
});

router.post('/password-reset-requests/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const request = await PasswordResetRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }
    await request.update({
      status: 'rejected',
      handled_by: req.user.user_id,
      notes: req.body?.notes || null
    });
    await AuditLog.create({
      user_id: req.user.user_id,
      action: 'password_reset_rejected',
      details: { request_id: request.request_id }
    });
    res.json({ message: 'Request rejected' });
  } catch (error) {
    logger.error('reject_password_reset_error', { error: error.message });
    res.status(500).json({ error: 'Failed to reject reset request' });
  }
});

module.exports = router;
