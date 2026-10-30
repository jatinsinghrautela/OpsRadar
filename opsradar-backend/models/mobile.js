const { sequelize, DataTypes } = require('./country');
const MobileSession = sequelize.define('MobileSession', {
  session_id: { type: DataTypes.UUID, primaryKey: true }, user_id: { type: DataTypes.INTEGER, allowNull: false },
  refresh_hash: { type: DataTypes.STRING(64), allowNull: false }, expires_at: { type: DataTypes.DATE, allowNull: false }, revoked_at: DataTypes.DATE
});
const MobileDevice = sequelize.define('MobileDevice', {
  device_id: { type: DataTypes.UUID, primaryKey: true }, user_id: { type: DataTypes.INTEGER, allowNull: false },
  session_id: { type: DataTypes.UUID, allowNull: false }, push_token: { type: DataTypes.STRING(255), allowNull: false },
  platform: { type: DataTypes.STRING(10), allowNull: false }, active: { type: DataTypes.BOOLEAN, defaultValue: true }
});
const PushJob = sequelize.define('PushJob', {
  job_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, notification_id: DataTypes.INTEGER,
  device_id: DataTypes.UUID, state: { type: DataTypes.STRING(20), defaultValue: 'pending' },
  attempts: { type: DataTypes.INTEGER, defaultValue: 0 }, next_at: DataTypes.DATE, ticket: DataTypes.STRING(255), error: DataTypes.STRING(100)
});
module.exports = { MobileSession, MobileDevice, PushJob };
