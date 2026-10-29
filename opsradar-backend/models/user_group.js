const { sequelize, DataTypes } = require('./country');
const UserGroup = sequelize.define('UserGroup', {
  group_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  group_name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  description: { type: DataTypes.TEXT }
});
module.exports = { UserGroup };