'use strict';

const { DataTypes } = require('sequelize');

async function up(queryInterface) {
  const alertDesc = await queryInterface.describeTable('Alerts');

  if (!alertDesc.fingerprint) {
    await queryInterface.addColumn('Alerts', 'fingerprint', {
      type: DataTypes.STRING(64),
      allowNull: true
    });
  }
  if (!alertDesc.status) {
    await queryInterface.addColumn('Alerts', 'status', {
      type: DataTypes.ENUM('active', 'resolved'),
      allowNull: false,
      defaultValue: 'active'
    });
  }
  if (!alertDesc.last_seen_at) {
    await queryInterface.addColumn('Alerts', 'last_seen_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  }
  if (!alertDesc.resolved_at) {
    await queryInterface.addColumn('Alerts', 'resolved_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  }

  // Backfill fingerprint placeholders for legacy rows (unique-ish per id)
  await queryInterface.sequelize.query(`
    UPDATE "Alerts"
    SET fingerprint = COALESCE(fingerprint, 'legacy-' || alert_id::text),
        last_seen_at = COALESCE(last_seen_at, "updatedAt"),
        status = COALESCE(status, 'active')
    WHERE fingerprint IS NULL OR last_seen_at IS NULL
  `);

  try {
    await queryInterface.addIndex('Alerts', ['fingerprint', 'status'], {
      name: 'alerts_fingerprint_status_idx'
    });
  } catch (_) {
    /* index may already exist */
  }

  const serverDesc = await queryInterface.describeTable('Servers');
  if (!serverDesc.retention_days) {
    await queryInterface.addColumn('Servers', 'retention_days', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  }

  const appDesc = await queryInterface.describeTable('Applications');
  if (!appDesc.retention_days) {
    await queryInterface.addColumn('Applications', 'retention_days', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  }
}

async function down(queryInterface) {
  try {
    await queryInterface.removeIndex('Alerts', 'alerts_fingerprint_status_idx');
  } catch (_) {
    /* ignore */
  }
  const alertDesc = await queryInterface.describeTable('Alerts');
  for (const col of ['resolved_at', 'last_seen_at', 'status', 'fingerprint']) {
    if (alertDesc[col]) await queryInterface.removeColumn('Alerts', col);
  }
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Alerts_status";');

  const serverDesc = await queryInterface.describeTable('Servers');
  if (serverDesc.retention_days) await queryInterface.removeColumn('Servers', 'retention_days');
  const appDesc = await queryInterface.describeTable('Applications');
  if (appDesc.retention_days) await queryInterface.removeColumn('Applications', 'retention_days');
}

module.exports = { up, down };
