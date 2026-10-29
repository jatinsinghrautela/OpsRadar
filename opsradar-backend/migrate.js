const path = require('path');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize } = require('./models/country');
const logger = require('./utils/logger');

function createMigrator() {
  return new Umzug({
    migrations: {
      glob: path.join(__dirname, 'migrations', '*.js'),
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context),
          down: async () => migration.down(context)
        };
      }
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: {
      info: (msg) => logger.info(typeof msg === 'string' ? msg : 'umzug', typeof msg === 'object' ? msg : {}),
      warn: (msg) => logger.warn(typeof msg === 'string' ? msg : 'umzug', typeof msg === 'object' ? msg : {}),
      error: (msg) => logger.error(typeof msg === 'string' ? msg : 'umzug', typeof msg === 'object' ? msg : {}),
      debug: () => {}
    }
  });
}

async function runMigrations() {
  const migrator = createMigrator();
  const pending = await migrator.pending();
  if (pending.length === 0) {
    logger.info('migrations_up_to_date');
    return [];
  }
  logger.info('migrations_running', { count: pending.length, names: pending.map((m) => m.name) });
  const executed = await migrator.up();
  logger.info('migrations_applied', { count: executed.length });
  return executed;
}

module.exports = { createMigrator, runMigrations };

if (require.main === module) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  require('dotenv').config();
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('migrate_cli_failed', { error: err.message });
      process.exit(1);
    });
}
