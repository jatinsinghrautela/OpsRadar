# Engineer / CLI agent guide

Designed for **resource-constrained or legacy hosts**: the agent is a single Node process (alert POST + periodic heartbeat + quiet resolve flush). It is not a metrics exporter and does not ship logs.

## Prerequisites (agent host)

- **Node.js 18+** only (Docker **not** required on the agent)
- Network reachability to the OpsRadar API (`url` in config)
- A **Server** already created by an admin in the UI
- That server’s unique **agent API key** (shown once on create/rotate)

## Config

```bash
cd opsradar-cli
cp config.example.yaml config.yaml   # or config.local.yaml
npm install
```

```yaml
url: "http://YOUR_API_HOST:5000/alert"
api_key: "<paste Agent key from Admin → Servers (shown once on create/rotate)>"
server_name: "exact-server-name-from-ui"
resolve_after_seconds: 300
heartbeat_interval_seconds: 900
group_name: "techops"
app_name: "monitor"
country_name: "United States"
```

`api_key` is **per server**. Using another server’s key will bind traffic to *that* server.

## Commands

```bash
# One-shot alert (open / reassert)
node cli.js --message "Disk > 90%" --severity major

# Dry run
node cli.js --dry-run --message "test"

# One heartbeat
node cli.js --heartbeat

# Long-lived agent: heartbeat loop + quiet-alert resolve flush
node cli.js --agent

# Only flush quiet fingerprints from local alert-state.json
node cli.js --flush-resolves
```

Local state file: `alert-state.json` next to `cli.js` (dedupe / resolve tracking).

## What “self-heal” means here

| Layer | Behavior |
|-------|----------|
| **Inside `--agent`** | Each heartbeat/resolve tick is try/catch’d — a failed API call logs and the loop keeps running. |
| **OS service** | If the Node process **exits** (crash, OOM, kill), the service manager starts it again. |
| **Not covered** | Broken `api_key`, wrong `server_name`, or unreachable API — those need config/network fixes; the agent stays up and retries on the next tick. |

Install as a service so the process survives reboot and process death.

---

## Always-on on Linux (systemd) — recommended

Unit template: `systemd/opsradar-agent.service`  
Installer: `scripts/install-linux-service.sh`

```bash
cd /path/to/opsradar-cli
cp config.example.yaml config.yaml   # set url, server_name, api_key
npm install
chmod +x scripts/install-linux-service.sh
sudo ./scripts/install-linux-service.sh
# optional dedicated user:
# sudo ./scripts/install-linux-service.sh --user opsradar
```

What the installer does:

- Writes `/etc/systemd/system/opsradar-agent.service` with your real `node` path and CLI directory
- Sets `Restart=always` / `RestartSec=5` (process crash → restart)
- Enables and starts the unit
- Appends stdout/stderr to `agent-stdout.log` / `agent-stderr.log` in the CLI dir (also in journald)

Control:

```bash
systemctl status opsradar-agent
journalctl -u opsradar-agent -f
systemctl restart opsradar-agent
systemctl stop opsradar-agent
sudo ./scripts/install-linux-service.sh --uninstall
```

Manual install (same intent as the script):

```bash
sudo cp systemd/opsradar-agent.service /etc/systemd/system/
# edit WorkingDirectory, ExecStart, log paths
sudo systemctl daemon-reload
sudo systemctl enable --now opsradar-agent
```

---

## Always-on on Windows

### Option A — NSSM (recommended)

1. Download [NSSM](https://nssm.cc/) (use the `win64\nssm.exe` build).
2. Elevated PowerShell:

```powershell
cd E:\path\to\opsradar-cli
.\scripts\install-windows-service.ps1 -NssmPath "C:\tools\nssm\win64\nssm.exe"
```

The script:

- Runs `node "<cli.js>" --agent` with **AppDirectory** = CLI folder (so `config.yaml` / `alert-state.json` resolve correctly)
- **SERVICE_AUTO_START** — starts after reboot
- **AppExit Default Restart** + **AppRestartDelay 5000** — restart on process exit (self-heal)
- Rotating `agent-stdout.log` / `agent-stderr.log`

```powershell
nssm restart OpsRadarAgent
nssm stop OpsRadarAgent
.\scripts\install-windows-service.ps1 -NssmPath "...\nssm.exe" -Uninstall
```

### Option B — Task Scheduler (fallback, no NSSM)

```powershell
.\scripts\register-windows-task.ps1
```

Runs `node cli.js --agent` at startup as **SYSTEM**, indefinite runtime, restarts on failure (up to 999 times / 1 min). Prefer NSSM when you can — its restart policy is simpler and continuous.

### Windows cross-check (intent vs scripts)

| Intent | NSSM script | Task script |
|--------|-------------|-------------|
| Long-lived `--agent` | Yes (`AppParameters` … `--agent`) | Yes |
| Correct working directory / config | `AppDirectory` = CLI dir | `-WorkingDirectory` |
| Survive reboot | `SERVICE_AUTO_START` | `-AtStartup` |
| Restart after crash | `AppExit Default Restart` + 5s delay | `RestartCount` / `RestartInterval` |
| Survive logoff | Yes (service) | Yes (SYSTEM) |
| Tick-level API errors | Handled inside CLI (loop continues) | Same |

**Note:** Older NSSM install lines that passed `"cli.js" --agent` as a single install argument could mis-bind parameters; the current script sets **AppParameters** explicitly.

---

## Logs

- Linux: `journalctl -u opsradar-agent -f` and/or `agent-*.log` in the CLI directory  
- Windows (NSSM): `agent-stdout.log` / `agent-stderr.log` in the CLI directory  

## Auth reminder

Alerts, resolve, and heartbeat all send `X-API-Key: <server key>`. There is no shared global ingest secret anymore.
