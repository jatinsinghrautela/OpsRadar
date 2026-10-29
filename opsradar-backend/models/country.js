const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgres://opsradar:alert123@localhost:5432/opsradar';

const sequelize = new Sequelize(databaseUrl, {
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
});
const Country = sequelize.define('Country', {
  country_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  country_code: { type: DataTypes.STRING(2), unique: true, allowNull: false },
  country_name: { type: DataTypes.STRING(100), unique: true, allowNull: false }
});
module.exports = { sequelize, Country, DataTypes, Op };