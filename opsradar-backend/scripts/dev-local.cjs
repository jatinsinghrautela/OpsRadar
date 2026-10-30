// Optional development-only database/API on D: when Docker is unavailable.
// This never opens or migrates the Docker deployment's database.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
async function main() {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const root = path.resolve(__dirname, '../..'); const directory = path.join(root, '.cache', 'dev-local');
  fs.mkdirSync(directory, { recursive: true }); process.env.TEMP = process.env.TMP = path.join(root, '.cache', 'tmp'); fs.mkdirSync(process.env.TEMP, { recursive: true });
  const credentialFile = path.join(directory, 'credentials.json');
  const credentials = fs.existsSync(credentialFile) ? JSON.parse(fs.readFileSync(credentialFile, 'utf8')) : { databasePassword: crypto.randomBytes(24).toString('hex'), jwtSecret: crypto.randomBytes(48).toString('hex'), username: 'local-admin', password: crypto.randomBytes(12).toString('hex'), previewUsername: 'mobile-preview', previewPassword: crypto.randomBytes(12).toString('hex') };
  fs.writeFileSync(credentialFile, JSON.stringify(credentials, null, 2));
  const pg = new EmbeddedPostgres({ databaseDir: path.join(directory, 'postgres'), user: 'postgres', password: credentials.databasePassword, port: 55439, persistent: true, postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: () => {} });
  if (!fs.existsSync(path.join(directory, 'postgres', 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient(); await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname='opsradar_dev'"); await client.end(); if (!exists.rowCount) await pg.createDatabase('opsradar_dev');
  Object.assign(process.env, { DATABASE_URL: `postgres://postgres:${credentials.databasePassword}@127.0.0.1:55439/opsradar_dev`, JWT_SECRET: credentials.jwtSecret, CORS_ORIGIN: 'http://localhost:3000,http://localhost:8081,http://localhost:8082,http://127.0.0.1:8082', BOOTSTRAP_ADMIN_USER: credentials.username, BOOTSTRAP_ADMIN_PASSWORD: credentials.password, BOOTSTRAP_ADMIN_EMAIL: 'admin@local.example', PUSH_ENABLED: 'false' });
  const { runMigrations } = require('../migrate'); await runMigrations(); await require('../services/bootstrap').bootstrapAdmin();
  if (process.env.DEV_SEED === 'true') {
    const { User } = require('../models/user'); const { UserGroup } = require('../models/user_group'); const { Server } = require('../models/server'); const { UserGroupMembership } = require('../models/user_group_membership'); const { Alert } = require('../models/alert');
    const [user] = await User.findOrCreate({ where: { username: credentials.previewUsername }, defaults: { email: 'preview@local.example', password_hash: await require('bcrypt').hash(credentials.previewPassword, 10), must_change_password: false, totp_enabled: false } });
    const [group] = await UserGroup.findOrCreate({ where: { group_name: 'Payments' } });
    await UserGroup.findOrCreate({ where: { group_name: 'Infrastructure' } });
    const [server] = await Server.findOrCreate({ where: { server_name: 'payments-prod-01' } });
    await Server.findOrCreate({ where: { server_name: 'db-prod-02' } });
    await UserGroupMembership.findOrCreate({ where: { user_id: user.user_id, group_id: group.group_id } });
    if (!await Alert.count()) for (const [severity, message] of [['critical', 'Payment service unavailable'], ['major', 'Disk usage above 90%'], ['minor', 'Response time increased']]) {
      const alert = await Alert.create({ severity, message, server_id: server.server_id, group_id: group.group_id, last_seen_at: new Date() }); await require('../services/notify').createNotificationsForAlert(alert);
    }
  }
  // Opt in to a trusted LAN only when testing Expo Go on a physical phone.
  const host = process.env.DEV_API_HOST || '127.0.0.1';
  const server = require('../app').createApp().listen(5050, host, () => console.log(`Development API listening on ${host}:5050; credentials: .cache/dev-local/credentials.json. Docker data is untouched.`));
  async function stop() { server.close(); await require('../models/country').sequelize.close(); await pg.stop(); process.exit(0); }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
main().catch(error => { console.error(error.message); process.exit(1); });
