# Architecture

## Context

OpsRadar operates as a **lightweight alert bridge**, not a metrics/log platform.

- **Target:** constrained or legacy agent hosts (Node-only CLI; optional Windows NSSM / Linux systemd).
- **Non-goals:** time-series metrics, log indexing, distributed tracing, Kafka/stream pipelines, or replacing Grafana/Prometheus/ELK.
- **Engineers** run Node CLI agents (per-server API key).
- **Admins** manage inventory and view everything in the web UI.
- **Users** see scoped alerts and in-app notifications.

```text
[CLI agents] --X-API-Key (per server)--> [Backend API] <---JWT--- [Web UI]
                                              |
                                              v
                                        [PostgreSQL]
                                         volume: opsradar_pgdata
```

## Containers (Docker Compose)

| Service | Build / image | Host port | Persistence |
|---------|---------------|-----------|-------------|
| `postgres` | `postgres:15-alpine` | `5433→5432` | Named volume `opsradar_pgdata` |
| `backend` | `./opsradar-backend` | `5000` | Stateless (DB holds data) |
| `frontend` | `./opsradar-frontend` | `3000` | Stateless |

CLI runs on agent hosts (Node 18+); not containerized by default.

## Application structure

```text
opsradar-backend/   app.js + routes/ + middleware/ + services/ + migrations/
opsradar-frontend/  React CRA + MUI
opsradar-cli/       Commander agent (alert, resolve, heartbeat, --agent)
docs/              Deploy + role guides
```

### Boot sequence
1. Umzug migrations  
2. `bootstrapAdmin()` if no admin exists (`must_change_password: true`)  
3. Listen; periodic retention prune  

### Auth
- UI: JWT (`JWT_SECRET`)
- Ingest / resolve / heartbeat: **per-server** hashed `ingest_api_key` via `X-API-Key` (plaintext shown once on create/rotate), or admin JWT for UI-created alerts
- Password change: short-lived change token; TOTP optional (Skip allowed)
- Account lock: `User.is_active`; locked users cannot log in
- Alerts list: optional `page` / `pageSize` (or `limit`) returns `{ items, total, page, pageSize, totalPages }`

### Retention
`app.retention_days` → `server.retention_days` → `ALERT_RETENTION_DAYS` (default 30)

### Agent liveness
CLI heartbeat every `heartbeat_interval_seconds` (default 900). Server **Down** after 2× interval without a beat.

## Explicit non-goals (near term)
Metrics/log/trace platforms (Prometheus, Grafana, Loki/ELK, Kafka pipelines, APM), microservices, Kubernetes, paid SMS/email delivery, mandatory per-host mTLS.

## Planned mobile companion

Android-first React Native/Expo source with iOS support is planned; there is no mobile client or push delivery implementation yet. Mobile users will view scoped alerts and request access, while administration remains in the web portal. No-cost FCM/Expo messaging is an optional planned integration, with paid services off by default. See the [mobile documentation](mobile/README.md) for the design, delivery milestones, feature status, and personal/commercial build paths.
