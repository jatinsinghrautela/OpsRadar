const { sequelize, DataTypes } = require('./country');
const { User } = require('./user');

const AccessRequest = sequelize.define('AccessRequest', {
  request_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'user_id' }
  },
  resource_type: {
    type: DataTypes.ENUM('group', 'server'),
    allowNull: false
  },
  resource_id: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
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
    { fields: ['user_id'] },
    { fields: ['resource_type', 'resource_id'] }
  ]
});

AccessRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
AccessRequest.belongsTo(User, { foreignKey: 'handled_by', as: 'handler' });

module.exports = { AccessRequest };
