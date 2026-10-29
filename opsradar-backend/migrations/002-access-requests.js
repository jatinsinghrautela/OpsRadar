'use strict';

const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => String(t).toLowerCase());
  if (normalized.includes('accessrequests')) {
    return;
  }

  await queryInterface.createTable('AccessRequests', {
    request_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'user_id' }
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
      references: { model: 'Users', key: 'user_id' }
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.addIndex('AccessRequests', ['status']);
  await queryInterface.addIndex('AccessRequests', ['user_id']);
  await queryInterface.addIndex('AccessRequests', ['resource_type', 'resource_id']);
}

async function down(queryInterface) {
  await queryInterface.dropTable('AccessRequests');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AccessRequests_resource_type";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_AccessRequests_status";');
}

module.exports = { up, down };
