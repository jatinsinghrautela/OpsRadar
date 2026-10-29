require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config();

const logger = require('./utils/logger');
const { runMigrations } = require('./migrate');
const { createApp } = require('./app');
const { pruneResolvedAlerts } = require('./services/retention');
const { bootstrapAdmin } = require('./services/bootstrap');

async function boot() {
  const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    logger.error('fatal_missing_jwt_secret');
    process.exit(1);
  }

  await runMigrations();
  await bootstrapAdmin();

  const app = createApp();
  const PORT = Number(process.env.PORT) || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_listening', { port: PORT });
  });

  // Periodic retention cleanup (resolved alerts)
  const pruneHours = Number(process.env.RETENTION_PRUNE_HOURS) || 6;
  setInterval(() => {
    pruneResolvedAlerts().catch((err) =>
      logger.error('retention_prune_failed', { error: err.message })
    );
  }, pruneHours * 60 * 60 * 1000);
  pruneResolvedAlerts().catch(() => {});
}

boot().catch((err) => {
  logger.error('boot_failed', { error: err.message });
  process.exit(1);
});
