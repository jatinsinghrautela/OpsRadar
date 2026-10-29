# Admin guide

## First login

1. Open the UI (default http://localhost:3000).
2. Sign in with bootstrap credentials (see README / `.env`).
3. Set a **new password** (required).
4. TOTP setup appears — enable an authenticator or click **Skip for now**.
5. You land on the Dashboard.

## Inventory (required before agents work)

Create in this order:

1. **Countries** — ISO-2 code + name  
2. **Applications** — apps you monitor (optional retention days)  
3. **Groups** — e.g. techops, noc  
4. **Servers** — name, IP, country; optional retention; **copy Agent API key** into that host’s CLI config  
5. **Users** — create accounts, assign groups / permissions  

Empty inventory = agents cannot open alerts (unknown country/app/group/server).

### Per-server agent keys

- Each server gets a unique ingest API key at creation (plaintext shown **once**).
- Keys are stored as **SHA-256 hashes** — they cannot be revealed later.
- **Agent key** — shows key prefix / status; if no key exists yet, mints one.
- **Rotate key** — invalidates the old key and shows a new plaintext once; update the host config immediately.

### Users — lock / unlock

- **Lock** sets `is_active=false` so login fails; unlock restores access.
- You cannot lock your own account.

## Day-to-day

| Area | What you do |
|------|-------------|
| Dashboard | Active alerts; agents live `x/y` |
| Alerts | Active / Resolved / All; server-paged list; clear resolved or clear all |
| Servers | Live / Down / Unknown from heartbeats; retention; keys (hash-at-rest) |
| Applications | Retention override (wins over server / global) |
| Users / Groups | Membership, view permissions, lock/unlock |
| Access requests | Approve/reject group or server access |
| Reset requests | Issue temp passwords (+ optional TOTP reset) |
| Audit | Review admin actions |
| Settings | Your notification severity prefs |

## Retention

Resolved alerts are deleted after:

1. Application `retention_days`, else  
2. Server `retention_days`, else  
3. Global `ALERT_RETENTION_DAYS` (default **30**)

## Notifications

In-app only (bell). Severity prefs in Settings control what creates notifications for your account.
