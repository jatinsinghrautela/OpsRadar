const { sequelize, DataTypes } = require('./country');

const User = sequelize.define('User', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  email: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  totp_secret: { type: DataTypes.STRING(128), allowNull: true },
  totp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  notify_prefs: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      critical: true,
      major: true,
      minor: false,
      trivial: false
    }
  },
  // Legacy email-OTP columns (unused; kept for alter-sync compatibility)
  otp_code: { type: DataTypes.STRING(6), allowNull: true },
  otp_expires_at: { type: DataTypes.DATE, allowNull: true }
}, {
  timestamps: true,
  indexes: [{ fields: ['email'] }]
});

module.exports = { User };
