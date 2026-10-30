// Isolated PostgreSQL integration suite; never connects to the user's deployment database.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const net = require('net');
async function main() {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const root = path.resolve(__dirname, '../..');
  const temp = path.join(root, '.cache', 'tmp'); fs.mkdirSync(temp, { recursive: true }); process.env.TEMP = process.env.TMP = temp;
  const port = await new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  const directory = path.join(root, '.cache', 'mobile-tests', crypto.randomUUID());
  const pg = new EmbeddedPostgres({ databaseDir: directory, user: 'postgres', password: 'local-test-only', port, persistent: true, postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: value => { if (String(value).includes('FATAL')) console.error(String(value)); } });
  let exitCode = 1;
  try {
    await pg.initialise(); await pg.start(); await pg.createDatabase('opsradar_test');
    const env = { ...process.env, DATABASE_URL: `postgres://postgres:local-test-only@127.0.0.1:${port}/opsradar_test`, JWT_SECRET: crypto.randomBytes(48).toString('hex'), BOOTSTRAP_ADMIN_PASSWORD: 'admin123', PUSH_ENABLED: 'false', TEST_ISOLATED: 'true' };
    exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--test', '--test-concurrency=1', 'tests/mobile.test.js'], { cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit' });
      child.on('error', reject); child.on('exit', code => resolve(code ?? 1));
    });
  } finally { await pg.stop(); }
  process.exit(exitCode);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
