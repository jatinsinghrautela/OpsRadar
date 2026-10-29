const { sequelize, DataTypes } = require('./country');
const UserGroupMembership = sequelize.define('UserGroupMembership', {
  user_id: { type: DataTypes.INTEGER, references: { model: 'Users', key: 'user_id' }, primaryKey: true },
  group_id: { type: DataTypes.INTEGER, references: { model: 'UserGroups', key: 'group_id' }, primaryKey: true }
});
module.exports = { UserGroupMembership };