const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../models/country');
const { User } = require('../models/user');
const { MobileSession, MobileDevice } = require('../models/mobile');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function tokens(user, session, refresh) {
  return {
    token: jwt.sign({ user_id: user.user_id, is_admin: user.is_admin, sid: session.session_id }, process.env.JWT_SECRET || process.env.SECRET_KEY, { expiresIn: '15m' }),
    refresh_token: refresh, expires_in: 900,
    user: { user_id: user.user_id, username: user.username, email: user.email, is_admin: user.is_admin }
  };
}
async function createSession(user) {
  const refresh = crypto.randomBytes(48).toString('hex');
  const session = await MobileSession.create({ session_id: crypto.randomUUID(), user_id: user.user_id, refresh_hash: hash(refresh), expires_at: new Date(Date.now() + 30 * 86400000) });
  return tokens(user, session, refresh);
}
async function rotateSession(refresh) {
  if (typeof refresh !== 'string' || !/^[a-f0-9]{96}$/.test(refresh)) return null;
  return sequelize.transaction(async transaction => {
    const session = await MobileSession.findOne({ where: { refresh_hash: hash(refresh) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!session || session.revoked_at || session.expires_at <= new Date()) return null;
    const user = await User.findByPk(session.user_id, { transaction });
    if (!user?.is_active || user.must_change_password) return null;
    const next = crypto.randomBytes(48).toString('hex');
    await session.update({ refresh_hash: hash(next) }, { transaction });
    return tokens(user, session, next);
  });
}
async function revokeSession(sessionId, userId) {
  await MobileSession.update({ revoked_at: new Date() }, { where: { session_id: sessionId, user_id: userId } });
  await MobileDevice.update({ active: false }, { where: { session_id: sessionId, user_id: userId } });
}
module.exports = { createSession, rotateSession, revokeSession };
