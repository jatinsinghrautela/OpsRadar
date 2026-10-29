const { sequelize, Country, DataTypes } = require('./country');
const { Application } = require('./application');
const { Server } = require('./server');
const { UserGroup } = require('./user_group');
const Alert = sequelize.define('Alert', {
  alert_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  message: { type: DataTypes.TEXT, allowNull: false },
  severity: { type: DataTypes.ENUM('trivial', 'minor', 'major', 'critical'), allowNull: false },
  server_id: { type: DataTypes.INTEGER, references: { model: Server, key: 'server_id' } },
  group_id: { type: DataTypes.INTEGER, references: { model: UserGroup, key: 'group_id' } },
  app_id: { type: DataTypes.INTEGER, references: { model: Application, key: 'app_id' } },
  country_id: { type: DataTypes.INTEGER, references: { model: Country, key: 'country_id' } },
  fingerprint: { type: DataTypes.STRING(64), allowNull: true },
  status: {
    type: DataTypes.ENUM('active', 'resolved'),
    allowNull: false,
    defaultValue: 'active'
  },
  last_seen_at: { type: DataTypes.DATE, allowNull: true },
  resolved_at: { type: DataTypes.DATE, allowNull: true },
  notification_sent: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  timestamps: true
});
Alert.belongsTo(Country, { foreignKey: 'country_id' });
Alert.belongsTo(Application, { foreignKey: 'app_id' });
Alert.belongsTo(Server, { foreignKey: 'server_id' });
Alert.belongsTo(UserGroup, { foreignKey: 'group_id' });
module.exports = { Alert };