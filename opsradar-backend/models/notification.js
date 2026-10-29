const { sequelize, DataTypes } = require('./country');
const { User } = require('./user');
const { Alert } = require('./alert');

const Notification = sequelize.define('Notification', {
  notification_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'user_id' }
  },
  alert_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Alert, key: 'alert_id' }
  },
  severity: {
    type: DataTypes.ENUM('trivial', 'minor', 'major', 'critical'),
    allowNull: false
  },
  message: { type: DataTypes.TEXT, allowNull: false },
  is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  read_at: { type: DataTypes.DATE, allowNull: true }
}, {
  timestamps: true,
  indexes: [
    { fields: ['user_id', 'is_read'] },
    { fields: ['alert_id'] },
    { fields: ['user_id', 'createdAt'] }
  ]
});

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(Alert, { foreignKey: 'alert_id', as: 'alert' });

module.exports = { Notification };
