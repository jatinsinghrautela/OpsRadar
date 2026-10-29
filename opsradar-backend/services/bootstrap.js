const bcrypt = require('bcrypt');
const { Op } = require('../models/country');
const { User } = require('../models/user');
const logger = require('../utils/logger');

/**
 * Idempotent first-boot: ensure at least one admin exists.
 * Does NOT seed countries/apps/groups/servers — admins create inventory.
 */
async function bootstrapAdmin() {
  const existingAdmin = await User.findOne({ where: { is_admin: true } });
  if (existingAdmin) {
    logger.info('bootstrap_admin_exists', { username: existingAdmin.username });
    return { created: false, username: existingAdmin.username };
  }

  const username = process.env.BOOTSTRAP_ADMIN_USER || 'admin';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'ChangeMeNow!';
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || `${username}@localhost.local`;

  const conflict = await User.findOne({
    where: { [Op.or]: [{ username }, { email }] }
  });
  if (conflict) {
    // Promote existing matching account to admin if somehow present without is_admin
    if (!conflict.is_admin) {
      await conflict.update({
        is_admin: true,
        must_change_password: true,
        is_active: true
      });
      logger.warn('bootstrap_admin_promoted', { username: conflict.username });
      return { created: false, promoted: true, username: conflict.username };
    }
    logger.info('bootstrap_admin_exists', { username: conflict.username });
    return { created: false, username: conflict.username };
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    password_hash,
    is_admin: true,
    is_active: true,
    must_change_password: true,
    totp_enabled: false,
    totp_secret: null
  });

  logger.info('bootstrap_admin_created', {
    username: user.username,
    must_change_password: true,
    hint: 'Sign in then set a new password (TOTP optional — Skip for now).'
  });
  return { created: true, username: user.username };
}

module.exports = { bootstrapAdmin };
