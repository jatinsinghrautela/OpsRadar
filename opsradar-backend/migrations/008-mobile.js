'use strict';
const { DataTypes } = require('sequelize');
module.exports = {
  async up(q) {
    await q.createTable('MobileSessions', {
      session_id: { type: DataTypes.UUID, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'user_id' }, onDelete: 'CASCADE' },
      refresh_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE },
      createdAt: { type: DataTypes.DATE, allowNull: false }, updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await q.createTable('MobileDevices', {
      device_id: { type: DataTypes.UUID, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'user_id' }, onDelete: 'CASCADE' },
      session_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'MobileSessions', key: 'session_id' }, onDelete: 'CASCADE' },
      push_token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      platform: { type: DataTypes.STRING(10), allowNull: false },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false }, updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await q.sequelize.query('ALTER TABLE "Notifications" ALTER COLUMN alert_id DROP NOT NULL');
    await q.addColumn('Notifications', 'kind', { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'alert' });
    await q.createTable('PushJobs', {
      job_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      notification_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Notifications', key: 'notification_id' }, onDelete: 'CASCADE' },
      device_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'MobileDevices', key: 'device_id' }, onDelete: 'CASCADE' },
      state: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      next_at: { type: DataTypes.DATE, allowNull: false }, ticket: { type: DataTypes.STRING(255) }, error: { type: DataTypes.STRING(100) },
      createdAt: { type: DataTypes.DATE, allowNull: false }, updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await q.addIndex('PushJobs', ['notification_id', 'device_id'], { unique: true });
    await q.addIndex('PushJobs', ['state', 'next_at']);
  },
  async down(q) {
    await q.dropTable('PushJobs'); await q.dropTable('MobileDevices'); await q.dropTable('MobileSessions');
    await q.sequelize.query('DELETE FROM "Notifications" WHERE alert_id IS NULL');
    await q.removeColumn('Notifications', 'kind');
    await q.sequelize.query('ALTER TABLE "Notifications" ALTER COLUMN alert_id SET NOT NULL');
  }
};
