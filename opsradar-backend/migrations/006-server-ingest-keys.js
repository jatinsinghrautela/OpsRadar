'use strict';

const crypto = require('crypto');
const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  const desc = await queryInterface.describeTable('Servers');
  if (!desc.ingest_api_key) {
    await queryInterface.addColumn('Servers', 'ingest_api_key', {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true
    });
  }

  // Backfill unique keys for existing servers
  const [rows] = await queryInterface.sequelize.query(
    `SELECT server_id FROM "Servers" WHERE ingest_api_key IS NULL`
  );
  for (const row of rows) {
    const key = crypto.randomBytes(32).toString('hex');
    await queryInterface.sequelize.query(
      `UPDATE "Servers" SET ingest_api_key = :key WHERE server_id = :id`,
      { replacements: { key, id: row.server_id } }
    );
  }

  try {
    await queryInterface.addIndex('Servers', ['ingest_api_key'], {
      unique: true,
      name: 'servers_ingest_api_key_uidx'
    });
  } catch (_) {
    /* may already exist */
  }
}

async function down(queryInterface) {
  try {
    await queryInterface.removeIndex('Servers', 'servers_ingest_api_key_uidx');
  } catch (_) {
    /* ignore */
  }
  const desc = await queryInterface.describeTable('Servers');
  if (desc.ingest_api_key) {
    await queryInterface.removeColumn('Servers', 'ingest_api_key');
  }
}

module.exports = { up, down };
