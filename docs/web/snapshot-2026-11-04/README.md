# OpsRadar web admin snapshot

Captured November 4, 2026 at a 1440 × 960 desktop viewport. The portal ran against an isolated development database with seeded records.

- [Sign-in screen](01-sign-in.png) → [Dashboard](02-dashboard.png)
- [Alerts](03-alerts.png) → [Servers](04-servers.png)
- Inventory includes [Groups](05-groups.png), [Applications](06-applications.png), and [Countries](07-countries.png).
- Account administration includes [Users](08-users.png), [Password reset requests](09-password-reset-requests.png), and [Settings](10-settings.png).

## Access approval flow

A seeded user submits a group access request → an administrator opens [Access requests](11-access-pending.png) → selects **Approve** → the same request shows [Approved](12-access-approved.png) → the decision appears in [Audit](13-audit.png).

The capture verified approval through the web portal. The account session was established using the isolated API before capturing the signed-in pages. The sign-in screenshot shows the blank form.

See the [mobile screen snapshot](../../mobile/snapshot-2026-11-04/README.md) for the requester's view.
