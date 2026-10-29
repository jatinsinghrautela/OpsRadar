const { sequelize, DataTypes } = require('./country');
const Application = sequelize.define('Application', {
  app_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  app_name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  description: { type: DataTypes.TEXT },
  retention_days: { type: DataTypes.INTEGER, allowNull: true }
});
module.exports = { Application };