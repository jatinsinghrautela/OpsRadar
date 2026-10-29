const { Command } = require('commander');
const axios = require('axios');
const yaml = require('js-yaml');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CLI_DIR = __dirname;
const STATE_PATH = path.join(CLI_DIR, 'alert-state.json');
const DEFAULT_HEARTBEAT_INTERVAL = 900; // 15 minutes

function normalizeMessage(message) {
  return String(message || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildFingerprint({ severity, server_name, app_name, group_name, message }) {
  const parts = [
    String(severity || '').toLowerCase().trim(),
    String(server_name || '').toLowerCase().trim(),
    String(app_name || '').toLowerCase().trim(),
    String(group_name || '').toLowerCase().trim(),
    normalizeMessage(message)
  ];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function loadConfig() {
  const candidates = [
    path.join(CLI_DIR, 'config.local.yaml'),
    path.join(CLI_DIR, 'config.yaml'),
    path.resolve(process.cwd(), 'config.local.yaml'),
    path.resolve(process.cwd(), 'config.yaml')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { path: p, data: yaml.load(fs.readFileSync(p, 'utf8')) || {} };
    }
  }
  return { path: null, data: {} };
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return { alerts: {} };
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return { alerts: raw.alerts || {} };
  } catch {
    return { alerts: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function resolveBaseUrl(config) {
  const raw = config.url || 'http://127.0.0.1:5000/alert';
  return String(raw).replace(/\/alert\/?$/, '');
}

async function postJson(url, body, apiKey, dryRun) {
  if (dryRun) {
    console.log('Dry run →', url, body);
    return { data: { dry_run: true } };
  }
  const res = await axios.post(url, body, {
    timeout: 5000,
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
  });
  return res;
}

async function withRetries(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.error(
        `${label} attempt ${attempt}/3 failed: ${err.response?.data?.error || err.message}`
      );
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

async function flushQuietResolves({ state, baseUrl, apiKey, resolveAfterSeconds, dryRun, exceptFp }) {
  const now = Date.now();
  const quietMs = Math.max(0, Number(resolveAfterSeconds) || 0) * 1000;
  let resolved = 0;

  for (const [fp, entry] of Object.entries(state.alerts)) {
    if (exceptFp && fp === exceptFp) continue;
    if (entry.status !== 'active') continue;
    const lastSeen = new Date(entry.last_seen_at).getTime();
    if (!Number.isFinite(lastSeen)) continue;
    if (now - lastSeen < quietMs) continue;

    const payload = {
      fingerprint: fp,
      message: entry.message,
      severity: entry.severity,
      server_name: entry.server_name,
      group_name: entry.group_name,
      app_name: entry.app_name
    };

    try {
      const res = await withRetries(
        () => postJson(`${baseUrl}/alert/resolve`, payload, apiKey, dryRun),
        'resolve'
      );
      console.log('Resolved quiet alert:', fp.slice(0, 12), res.data);
      entry.status = 'resolved';
      entry.resolved_at = new Date().toISOString();
      resolved += 1;
    } catch (err) {
      console.error('Failed to resolve', fp.slice(0, 12), err.response?.data?.error || err.message);
    }
  }
  return resolved;
}

async function sendHeartbeat({ baseUrl, apiKey, serverName, dryRun }) {
  const res = await withRetries(
    () =>
      postJson(
        `${baseUrl}/agent/heartbeat`,
        { server_name: serverName },
        apiKey,
        dryRun
      ),
    'heartbeat'
  );
  console.log('Heartbeat:', res.data);
  return res.data;
}

const program = new Command();
program
  .option('--message <msg>', 'Alert message')
  .option('--severity <level>', 'Severity (trivial, minor, major, critical)')
  .option('--server-name <name>', 'Server name')
  .option('--group-name <name>', 'Group name')
  .option('--app-name <name>', 'Application name')
  .option('--country-name <name>', 'Country name')
  .option('--api-key <key>', 'Ingest API key (overrides config)')
  .option('--resolve-after <seconds>', 'Quiet seconds before auto-resolve (overrides config)')
  .option('--heartbeat-interval <seconds>', 'Agent heartbeat interval (overrides config)')
  .option('--heartbeat', 'Send one heartbeat and exit', false)
  .option('--agent', 'Run as long-lived agent (heartbeat loop + resolve flush)', false)
  .option('--flush-resolves', 'Only resolve quiet fingerprints from local state', false)
  .option('--dry-run', 'Log without sending', false);

program.parse(process.argv);
const options = program.opts();

const { path: configPath, data: config } = loadConfig();
const apiKey = options.apiKey || config.api_key || process.env.ALERT_INGEST_API_KEY;
const baseUrl = resolveBaseUrl(config);
const resolveAfterSeconds =
  options.resolveAfter != null
    ? Number(options.resolveAfter)
    : Number(config.resolve_after_seconds != null ? config.resolve_after_seconds : 300);
const heartbeatIntervalSeconds =
  options.heartbeatInterval != null
    ? Number(options.heartbeatInterval)
    : Number(
        config.heartbeat_interval_seconds != null
          ? config.heartbeat_interval_seconds
          : DEFAULT_HEARTBEAT_INTERVAL
      );
const serverName = options.serverName || config.server_name || 'cli1-server';

async function sendAlertOnce() {
  const state = loadState();
  const alert = {
    message: options.message || config.message || 'CLI Test',
    severity: options.severity || config.severity || 'minor',
    server_name: serverName,
    group_name: options.groupName || config.group_name || 'techops',
    app_name: options.appName || config.app_name || 'monitor',
    country_name: options.countryName || config.country_name || 'United States'
  };

  const fingerprint = buildFingerprint(alert);
  const nowIso = new Date().toISOString();

  const res = await withRetries(
    () => postJson(`${baseUrl}/alert`, alert, apiKey, options.dryRun),
    'ingest'
  );
  console.log('Ingest:', res.data);
  if (!options.dryRun) {
    state.alerts[fingerprint] = {
      fingerprint,
      status: 'active',
      last_seen_at: nowIso,
      opened_at: state.alerts[fingerprint]?.opened_at || nowIso,
      resolved_at: null,
      ...alert
    };
  }

  if (options.dryRun) {
    await flushQuietResolves({
      state,
      baseUrl,
      apiKey,
      resolveAfterSeconds,
      dryRun: true,
      exceptFp: fingerprint
    });
    return;
  }

  await flushQuietResolves({
    state,
    baseUrl,
    apiKey,
    resolveAfterSeconds,
    dryRun: false,
    exceptFp: fingerprint
  });
  saveState(state);
}

async function runAgentLoop() {
  console.log(
    `Agent mode for server="${serverName}" every ${heartbeatIntervalSeconds}s (Ctrl+C to stop)`
  );

  const tick = async () => {
    try {
      await sendHeartbeat({
        baseUrl,
        apiKey,
        serverName,
        dryRun: options.dryRun
      });
      const state = loadState();
      const n = await flushQuietResolves({
        state,
        baseUrl,
        apiKey,
        resolveAfterSeconds,
        dryRun: options.dryRun
      });
      if (!options.dryRun) saveState(state);
      if (n) console.log(`Flushed ${n} quiet alert(s).`);
    } catch (err) {
      console.error('Agent tick failed:', err.response?.data?.error || err.message);
    }
  };

  await tick();
  setInterval(tick, Math.max(5, heartbeatIntervalSeconds) * 1000);
}

async function main() {
  if (!options.dryRun && !apiKey) {
    console.error('Missing API key. Set api_key in config.yaml, ALERT_INGEST_API_KEY, or --api-key.');
    process.exitCode = 1;
    return;
  }

  console.log('Config:', configPath || '(defaults)');
  console.log('State:', STATE_PATH);
  console.log('resolve_after_seconds:', resolveAfterSeconds);
  console.log('heartbeat_interval_seconds:', heartbeatIntervalSeconds);

  if (options.agent) {
    await runAgentLoop();
    return;
  }

  if (options.heartbeat) {
    await sendHeartbeat({
      baseUrl,
      apiKey,
      serverName,
      dryRun: options.dryRun
    });
    return;
  }

  if (options.flushResolves) {
    const state = loadState();
    const n = await flushQuietResolves({
      state,
      baseUrl,
      apiKey,
      resolveAfterSeconds,
      dryRun: options.dryRun
    });
    saveState(state);
    console.log(`Flush complete. Resolved ${n} quiet alert(s).`);
    return;
  }

  await sendAlertOnce();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
