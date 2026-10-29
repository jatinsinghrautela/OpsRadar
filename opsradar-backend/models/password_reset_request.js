const { sequelize, DataTypes } = require('./country');
const { User } = require('./user');

const PasswordResetRequest = sequelize.define('PasswordResetRequest', {
  request_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'user_id' }
  },
  status: {
    type: DataTypes.ENUM('pending', 'fulfilled', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  reset_totp: { type: DataTypes.BOOLEAN, defaultValue: false },
  handled_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: User, key: 'user_id' }
  },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['user_id'] }
  ]
});

PasswordResetRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
PasswordResetRequest.belongsTo(User, { foreignKey: 'handled_by', as: 'handler' });

module.exports = { PasswordResetRequest };
