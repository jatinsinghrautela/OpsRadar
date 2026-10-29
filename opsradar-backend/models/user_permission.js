const { sequelize, DataTypes } = require('./country');
const UserPermission = sequelize.define('UserPermission', {
  permission_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'user_id' } },
  country_id: { type: DataTypes.INTEGER },
  app_id: { type: DataTypes.INTEGER },
  group_id: { type: DataTypes.INTEGER },
  server_id: { type: DataTypes.INTEGER },
  can_view: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  uniqueKeys: { unique_permission: { fields: ['user_id', 'country_id', 'app_id', 'group_id', 'server_id'] } }
});
module.exports = { UserPermission };