const { sequelize, DataTypes } = require('./country');
const AuditLog = sequelize.define('AuditLog', {
  log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'user_id' } },
  action: { type: DataTypes.STRING(50), allowNull: false },
  details: { type: DataTypes.JSONB },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});
module.exports = { AuditLog };