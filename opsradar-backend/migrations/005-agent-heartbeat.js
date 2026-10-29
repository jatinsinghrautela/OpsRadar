'use strict';

const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  const desc = await queryInterface.describeTable('Servers');
  if (!desc.agent_last_heartbeat_at) {
    await queryInterface.addColumn('Servers', 'agent_last_heartbeat_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  }
}

async function down(queryInterface) {
  const desc = await queryInterface.describeTable('Servers');
  if (desc.agent_last_heartbeat_at) {
    await queryInterface.removeColumn('Servers', 'agent_last_heartbeat_at');
  }
}

module.exports = { up, down };
