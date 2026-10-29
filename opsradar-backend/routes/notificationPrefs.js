const express = require('express');
const { User } = require('../models/user');
const { authenticateToken } = require('../middleware/auth');
const { normalizePrefs } = require('../services/notify');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/notification-prefs', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: ['user_id', 'notify_prefs']
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(normalizePrefs(user.notify_prefs));
  } catch (error) {
    logger.error('notification_prefs_get_error', { error: error.message });
    res.status(500).json({ error: 'Failed to load notification preferences' });
  }
});

router.put('/notification-prefs', authenticateToken, async (req, res) => {
  try {
    const body = req.body || {};
    const next = normalizePrefs({
      critical: body.critical,
      major: body.major,
      minor: body.minor,
      trivial: body.trivial
    });
    for (const key of ['critical', 'major', 'minor', 'trivial']) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        next[key] = Boolean(body[key]);
      }
    }

    const user = await User.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ notify_prefs: next });
    res.json(next);
  } catch (error) {
    logger.error('notification_prefs_put_error', { error: error.message });
    res.status(500).json({ error: 'Failed to save notification preferences' });
  }
});

module.exports = router;
