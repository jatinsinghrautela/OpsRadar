const { sequelize, Country, DataTypes } = require('./country');
const { Application } = require('./application');
const Server = sequelize.define('Server', {
  server_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  server_name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
  ip_address: { type: DataTypes.STRING(15) },
  country_id: { type: DataTypes.INTEGER, references: { model: Country, key: 'country_id' } },
  app_id: { type: DataTypes.INTEGER, references: { model: Application, key: 'app_id' } },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  retention_days: { type: DataTypes.INTEGER, allowNull: true },
  agent_last_heartbeat_at: { type: DataTypes.DATE, allowNull: true },
  ingest_api_key_hash: { type: DataTypes.STRING(64), allowNull: true, unique: true },
  ingest_api_key_prefix: { type: DataTypes.STRING(16), allowNull: true }
}, {
  indexes: [{ name: 'idx_servers_app', fields: ['app_id'] }]
});
Server.belongsTo(Country, { foreignKey: 'country_id' });
Server.belongsTo(Application, { foreignKey: 'app_id' });
module.exports = { Server };
