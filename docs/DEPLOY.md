# Deploy guide

## Fit for constrained environments

- **Agent hosts** are the constrained side: install Node 18+, drop in `opsradar-cli/`, run as a service. No Docker, no local DB, no continuous scrape load.
- **Admin host** needs enough headroom for Postgres + API + UI (Compose). Prefer not exposing Postgres; put TLS in front for anything beyond a lab.
- This stack is intentionally **not** ELK/Kafka/Prometheus — see the README positioning section.

## Prerequisites

- Docker Engine + Compose v2 (or Docker Desktop)
- Node.js **18+** on each machine that runs the CLI agent (with or without Docker on that host)
- Outbound HTTPS/HTTP from agents to the API URL
- Open ports on the admin host: `3000`, `5000`, and optionally `5433` (prefer not exposing Postgres publicly in production)

## Environment

```bash
cp .env.example .env
```

Important variables:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Required — sign UI tokens |
| `POSTGRES_*` | Database credentials |
| `BOOTSTRAP_ADMIN_USER` / `BOOTSTRAP_ADMIN_PASSWORD` | First admin (default `admin` / `ChangeMeNow!`) |
| `ALERT_RETENTION_DAYS` | Global resolved-alert retention (default **30**); per-app / per-server overrides in UI |
| `CORS_ORIGIN` / `REACT_APP_API_URL` | Browser origin and API URL |

## Start

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:5000/health
```

On first boot the backend:

1. Runs Umzug migrations
2. Creates the bootstrap admin if none exists (`must_change_password: true`)
3. Does **not** seed countries, apps, groups, or servers — create those in the UI

## Persistence

Postgres uses the named Docker volume `opsradar_pgdata`. Data survives `docker compose down` / rebuilds.

```bash
docker volume inspect opsradar_pgdata
```

`docker compose down -v` **deletes** the volume — avoid in production.

Backend and frontend are stateless (no data volumes required).

### Backup / restore

```bash
docker compose exec -T postgres pg_dump -U opsradar opsradar > backup.sql
# restore into a running postgres service:
type backup.sql | docker compose exec -T postgres psql -U opsradar opsradar
```

## Production notes

- Put TLS termination (Caddy/nginx/Traefik) in front of UI and API; set `REACT_APP_API_URL` and `CORS_ORIGIN` to public HTTPS URLs.
- Do not publish Postgres (`5433`) to the internet.
- Rotate compromised server agent keys via **Servers → Rotate key**.
- Change bootstrap password immediately; prefer strong `BOOTSTRAP_ADMIN_PASSWORD` before first start.

## Agent hosts (no Docker required)

Only **Node.js 18+** is required. Copy `opsradar-cli/`, set `config.yaml` (`url`, `server_name`, `api_key`), then run `node cli.js --agent` or install as a Windows/Linux service — see [GUIDE_ENGINEER.md](./GUIDE_ENGINEER.md).
