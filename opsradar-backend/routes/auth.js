const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { AuditLog } = require('../models/audit_log');
const { generateTotpSecret, buildOtpauthUrl, buildQrDataUrl, verifyTotp } = require('../utils/totp');
const {
  getSecretKey,
  authenticateToken,
  requireAdmin,
  authenticateChangePassword
} = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/check-admin', authenticateToken, requireAdmin, (req, res) => {
  res.json({ isAdmin: true });
});

router.get('/current-user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      is_active: user.is_active
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user || !user.is_active || !await bcrypt.compare(password, user.password_hash)) {
      logger.warn('login_failed', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.must_change_password) {
      const changeToken = jwt.sign(
        { user_id: user.user_id, purpose: 'change_password' },
        getSecretKey(),
        { expiresIn: '15m' }
      );
      return res.json({
        requires_password_change: true,
        change_token: changeToken,
        username: user.username
      });
    }

    if (user.totp_enabled && user.totp_secret) {
      const preAuthToken = jwt.sign(
        { user_id: user.user_id, purpose: 'totp' },
        getSecretKey(),
        { expiresIn: '5m' }
      );
      return res.json({ requires_totp: true, pre_auth_token: preAuthToken });
    }

    const token = jwt.sign(
      { user_id: user.user_id, is_admin: user.is_admin },
      getSecretKey(),
      { expiresIn: '1h' }
    );
    logger.info('login_ok', { user_id: user.user_id });
    res.json({
      token,
      totp_enabled: !!user.totp_enabled,
      must_enroll_totp: !user.totp_enabled
    });
  } catch (error) {
    logger.error('login_error', { error: error.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/login/totp', async (req, res) => {
  const { pre_auth_token, totp_code } = req.body;
  try {
    if (!pre_auth_token || !totp_code) {
      return res.status(400).json({ error: 'pre_auth_token and totp_code are required' });
    }
    let payload;
    try {
      payload = jwt.verify(pre_auth_token, getSecretKey());
    } catch {
      return res.status(403).json({ error: 'Invalid or expired pre-auth token' });
    }
    if (payload.purpose !== 'totp') {
      return res.status(403).json({ error: 'Invalid token purpose' });
    }
    const user = await User.findByPk(payload.user_id);
    if (!user || !user.totp_enabled || !user.totp_secret) {
      return res.status(400).json({ error: 'TOTP is not enabled for this user' });
    }
    if (!verifyTotp(totp_code, user.totp_secret)) {
      return res.status(401).json({ error: 'Invalid authenticator code' });
    }
    const token = jwt.sign(
      { user_id: user.user_id, is_admin: user.is_admin },
      getSecretKey(),
      { expiresIn: '1h' }
    );
    res.json({ token, totp_enabled: true });
  } catch (error) {
    logger.error('totp_login_error', { error: error.message });
    res.status(500).json({ error: 'TOTP login failed' });
  }
});

router.post('/change-password', authenticateChangePassword, async (req, res) => {
  const { new_password } = req.body;
  try {
    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const user = await User.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const password_hash = await bcrypt.hash(new_password, 10);
    await user.update({ password_hash, must_change_password: false });

    await AuditLog.create({
      user_id: user.user_id,
      action: 'password_changed',
      details: { message: 'User set a new password after temp/reset' }
    });

    const token = jwt.sign(
      { user_id: user.user_id, is_admin: user.is_admin },
      getSecretKey(),
      { expiresIn: '1h' }
    );
    const must_enroll_totp = !(user.totp_enabled && user.totp_secret);
    logger.info('password_changed', { user_id: user.user_id });
    res.json({
      message: 'Password updated',
      token,
      must_enroll_totp
    });
  } catch (error) {
    logger.error('change_password_error', { error: error.message });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.get('/totp/setup', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.must_change_password) {
      return res.status(403).json({ error: 'Change your temporary password first' });
    }

    const secret = generateTotpSecret();
    await user.update({ totp_secret: secret, totp_enabled: false });
    const otpauthUrl = buildOtpauthUrl(user.username, secret);
    const qr_data_url = await buildQrDataUrl(otpauthUrl);
    res.json({ secret, otpauth_url: otpauthUrl, qr_data_url });
  } catch (error) {
    logger.error('totp_setup_error', { error: error.message });
    res.status(500).json({ error: 'Failed to start TOTP setup' });
  }
});

router.post('/totp/enable', authenticateToken, async (req, res) => {
  try {
    const { totp_code } = req.body;
    const user = await User.findByPk(req.user.user_id);
    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: 'Call /totp/setup first' });
    }
    if (!verifyTotp(totp_code, user.totp_secret)) {
      return res.status(401).json({ error: 'Invalid authenticator code' });
    }
    await user.update({ totp_enabled: true });
    await AuditLog.create({
      user_id: user.user_id,
      action: 'totp_enabled',
      details: {}
    });
    res.json({ message: 'Authenticator enabled', totp_enabled: true });
  } catch (error) {
    logger.error('totp_enable_error', { error: error.message });
    res.status(500).json({ error: 'Failed to enable TOTP' });
  }
});

router.post('/forgot-password', (req, res) => {
  res.status(410).json({
    error: 'Email OTP is disabled. Submit a password reset request and contact an administrator.'
  });
});
router.post('/verify-otp', (req, res) => {
  res.status(410).json({ error: 'Email OTP is disabled.' });
});
router.post('/reset-password', (req, res) => {
  res.status(410).json({
    error: 'Self-serve email reset is disabled. Use an admin-issued temporary password.'
  });
});

module.exports = router;
