'use strict';

const { DataTypes } = require('sequelize');

const DEFAULT_PREFS = JSON.stringify({
  critical: true,
  major: true,
  minor: false,
  trivial: false
});

async function up(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => String(t).toLowerCase());

  const userDesc = await queryInterface.describeTable('Users');
  if (!userDesc.notify_prefs) {
    await queryInterface.addColumn('Users', 'notify_prefs', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        critical: true,
        major: true,
        minor: false,
        trivial: false
      }
    });
    // Backfill any nulls (defensive)
    await queryInterface.sequelize.query(
      `UPDATE "Users" SET notify_prefs = '${DEFAULT_PREFS}'::jsonb WHERE notify_prefs IS NULL`
    );
  }

  if (!normalized.includes('notifications')) {
    await queryInterface.createTable('Notifications', {
      notification_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'user_id' }
      },
      alert_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Alerts', key: 'alert_id' }
      },
      severity: {
        type: DataTypes.ENUM('trivial', 'minor', 'major', 'critical'),
        allowNull: false
      },
      message: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex('Notifications', ['user_id', 'is_read']);
    await queryInterface.addIndex('Notifications', ['alert_id']);
    await queryInterface.addIndex('Notifications', ['user_id', 'createdAt']);
  }
}

async function down(queryInterface) {
  await queryInterface.dropTable('Notifications');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Notifications_severity";');
  const userDesc = await queryInterface.describeTable('Users');
  if (userDesc.notify_prefs) {
    await queryInterface.removeColumn('Users', 'notify_prefs');
  }
}

module.exports = { up, down };
