# OpsRadar

## Running this checkout

Start Docker Desktop, then run `npm start` from this directory. This builds and starts PostgreSQL, the API, and the UI in the background. The local `.env` has been configured with generated database and JWT secrets.

Open http://localhost:3000 and sign in with username `admin` and the initial password `ChangeMeNow!`. You must choose a new password on first login. Authenticator enrollment can be skipped until later.

Use `npm run status` to check the services, `npm run logs` to follow their logs, and `npm stop` to stop them. Database data persists in the Docker volume. The first build needs an internet connection to download images and dependencies.

Self-hosted **alert bridge** for ops teams: thin Node CLI agents on monitored hosts, Express API + React admin UI + PostgreSQL on a small control plane.

## What this is (and is not)

**Built for constrained / legacy environments** — Windows or Linux hosts that cannot (or should not) run a full observability stack: limited RAM/CPU, no Docker on the agent, flaky networks, or “just page us when X breaks.”

| Layer | Resource profile |
|-------|------------------|
| **Agent host** | Node.js 18+ only. One long-lived `node cli.js --agent` process; heartbeats on the order of minutes; alert POSTs when something fails. No local metrics DB, log indexer, or message broker. |
| **Control plane** | Three Compose services (Postgres + API + UI). Far lighter than ELK / Kafka / Prometheus+Grafana+Loki, but still a small server — not a single static binary. |

**Not a competitor to** Prometheus, Grafana, Loki/ELK, Kafka-based alerting, or full APM. Those collect metrics, logs, and traces at scale. OpsRadar does **authenticated alert ingest, heartbeats, retention, and an in-app notification UI** — a push-based ops signal path when the modern stack is overkill or unavailable on the box.

Use it **alongside** a modern stack if you want (agents on legacy islands; Grafana elsewhere), or **standalone** for small/air-gapped/legacy fleets.

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Docker Desktop** + Compose v2 | Primary path for API + UI + Postgres |
| **Node.js 18+** | Required on every **agent host** that runs the CLI (Docker optional there) |
| Free ports | `3000` (UI), `5000` (API), `5433` (Postgres host map) |

## Quick start (admin server)

```bash
cp .env.example .env
# Set JWT_SECRET, POSTGRES_PASSWORD, and optional BOOTSTRAP_ADMIN_* values
docker compose up --build
```

| Service | URL |
|---------|-----|
| UI | http://localhost:3000 |
| API health | http://localhost:5000/health |
| Postgres | `localhost:5433` (named volume `opsradar_pgdata` — data persists across restarts) |

### First login

1. Sign in as bootstrap admin (defaults: `admin` / `ChangeMeNow!`, overridable via env).
2. You **must** set a new password.
3. Authenticator (TOTP) setup opens next — use **Skip for now** if you prefer optional TOTP later (Settings).
4. As admin, create inventory before agents can report:
   - **Countries** → **Applications** → **Groups** → **Servers** → **Users**
5. When you create a **Server**, copy its unique **agent API key** into that host’s CLI `config.yaml`.

## CLI agent (any host with Node)

```bash
cd opsradar-cli
cp config.example.yaml config.yaml
# Set url, server_name (must match UI), and api_key from Servers → Agent key
npm install   # if needed
node cli.js --message "Disk full" --severity major
node cli.js --agent                 # long-lived heartbeat + resolve flush
```

See [docs/GUIDE_ENGINEER.md](docs/GUIDE_ENGINEER.md) for always-on setup:

- **Linux:** `scripts/install-linux-service.sh` + `systemd/opsradar-agent.service`
- **Windows:** NSSM (`install-windows-service.ps1`) or Task Scheduler fallback


## Documentation

| Doc | Audience |
|-----|----------|
| [Deploy & persistence](docs/DEPLOY.md) | Operators standing up the stack |
| [Admin guide](docs/GUIDE_ADMIN.md) | Admins / operators |
| [Engineer / CLI guide](docs/GUIDE_ENGINEER.md) | Agent hosts |
| [User guide](docs/GUIDE_USER.md) | Regular web users |
| [Architecture](docs/ARCHITECTURE.md) | How the system fits together |

## Packages

| Path | Role |
|------|------|
| `opsradar-backend` | Express + Sequelize API |
| `opsradar-frontend` | CRA + MUI web UI |
| `opsradar-cli` | Alert + heartbeat agent (Node only) |
| `docs/` | Deploy and role guides |

## Auth model (short)

- **Web UI:** JWT after login.
- **CLI / agents:** per-**server** `X-API-Key` (unique key generated when the server is created; reveal/rotate in Admin → Servers).
- Global shared ingest key is **not** used.
