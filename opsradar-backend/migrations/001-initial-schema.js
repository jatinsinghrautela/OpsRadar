'use strict';

const { DataTypes } = require('sequelize');

/**
 * Idempotent baseline matching current Sequelize models.
 * If core tables already exist (legacy alter-sync DB), skip creates and mark applied.
 */
async function up(queryInterface) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => String(t).toLowerCase());
  const hasUsers = normalized.includes('users');

  if (hasUsers) {
    // Existing Docker/lab DB — preserve data; SequelizeMeta records this migration as done.
    return;
  }

  await queryInterface.createTable('Countries', {
    country_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    country_code: { type: DataTypes.STRING(2), unique: true, allowNull: false },
    country_name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.createTable('Applications', {
    app_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    app_name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    description: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.createTable('UserGroups', {
    group_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    group_name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    description: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.createTable('Users', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
    must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
    totp_secret: { type: DataTypes.STRING(128), allowNull: true },
    totp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    otp_code: { type: DataTypes.STRING(6), allowNull: true },
    otp_expires_at: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.addIndex('Users', ['email']);

  await queryInterface.createTable('Servers', {
    server_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    server_name: { type: DataTypes.STRING(100), unique: true, allowNull: false },
    ip_address: { type: DataTypes.STRING(15) },
    country_id: {
      type: DataTypes.INTEGER,
      references: { model: 'Countries', key: 'country_id' }
    },
    app_id: {
      type: DataTypes.INTEGER,
      references: { model: 'Applications', key: 'app_id' }
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.addIndex('Servers', ['app_id'], { name: 'idx_servers_app' });

  await queryInterface.createTable('Alerts', {
    alert_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    severity: {
      type: DataTypes.ENUM('trivial', 'minor', 'major', 'critical'),
      allowNull: false
    },
    server_id: {
      type: DataTypes.INTEGER,
      references: { model: 'Servers', key: 'server_id' }
    },
    group_id: {
      type: DataTypes.INTEGER,
      references: { model: 'UserGroups', key: 'group_id' }
    },
    app_id: {
      type: DataTypes.INTEGER,
      references: { model: 'Applications', key: 'app_id' }
    },
    country_id: {
      type: DataTypes.INTEGER,
      references: { model: 'Countries', key: 'country_id' }
    },
    notification_sent: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.createTable('UserGroupMemberships', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'Users', key: 'user_id' }
    },
    group_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: { model: 'UserGroups', key: 'group_id' }
    },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.createTable('UserPermissions', {
    permission_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'user_id' }
    },
    country_id: { type: DataTypes.INTEGER },
    app_id: { type: DataTypes.INTEGER },
    group_id: { type: DataTypes.INTEGER },
    server_id: { type: DataTypes.INTEGER },
    can_view: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.addIndex(
    'UserPermissions',
    ['user_id', 'country_id', 'app_id', 'group_id', 'server_id'],
    { unique: true, name: 'unique_permission' }
  );

  await queryInterface.createTable('AuditLogs', {
    log_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      references: { model: 'Users', key: 'user_id' }
    },
    action: { type: DataTypes.STRING(50), allowNull: false },
    details: { type: DataTypes.JSONB },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.createTable('PasswordResetRequests', {
    request_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'user_id' }
    },
    status: {
      type: DataTypes.ENUM('pending', 'fulfilled', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    },
    reset_totp: { type: DataTypes.BOOLEAN, defaultValue: false },
    handled_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'user_id' }
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false }
  });

  await queryInterface.addIndex('PasswordResetRequests', ['status']);
  await queryInterface.addIndex('PasswordResetRequests', ['user_id']);
}

async function down(queryInterface) {
  await queryInterface.dropTable('PasswordResetRequests');
  await queryInterface.dropTable('AuditLogs');
  await queryInterface.dropTable('UserPermissions');
  await queryInterface.dropTable('UserGroupMemberships');
  await queryInterface.dropTable('Alerts');
  await queryInterface.dropTable('Servers');
  await queryInterface.dropTable('Users');
  await queryInterface.dropTable('UserGroups');
  await queryInterface.dropTable('Applications');
  await queryInterface.dropTable('Countries');
  // Drop ENUM types left behind on Postgres
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Alerts_severity";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PasswordResetRequests_status";');
}

module.exports = { up, down };
