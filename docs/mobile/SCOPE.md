# Mobile application scope

Status: proposed product scope; no mobile client exists yet. See [feature status](FEATURES.md) for implementation state.

## Purpose and user journey

Give an OpsRadar user a phone-based alert inbox and notifications for resources they are authorized to view. Administrators configure inventory, users, alert settings, and access approvals in the existing web portal.

1. The administrator creates the user and inventory on the web.
2. The user signs in on the phone, changes a temporary password if required, and completes TOTP verification when enabled.
3. The user requests a group or server and supplies an optional reason.
4. The administrator approves or rejects that request on the web.
5. Approval grants access; notification preferences then determine which future matching alert events produce push notifications.
6. Tapping a notification opens the currently authorized alert details. Reading a notification does not acknowledge or resolve the underlying alert.

## Screens

| Screen | First-release behavior |
| --- | --- |
| Authentication | Login, required password change, existing TOTP challenge/enrollment policy, reset-request entry point |
| Alerts | Authorized active/resolved alerts, search, pagination, severity and resource filters, pull-to-refresh |
| Alert detail | Message, severity, resource names, available timestamps, and current lifecycle status |
| Notifications | Read/unread history and links to alerts; distinguish a notification event from current alert state |
| My access | Approved resources and the user's pending, approved, and rejected requests |
| Request access | Search a minimal requestable catalogue, select a group/server, submit reason |
| Settings | Severity preferences, device notification-permission status, session/logout controls |

## Authorization rules

- Server-side permission checks are authoritative for lists, details, notification history, and delivery jobs.
- Existing non-admin visibility is group membership OR a matching view permission. Broad pre-existing grants remain effective; a new request is not the only way access can be granted.
- A pending or rejected request grants nothing. Prevent duplicate pending requests.
- A server grant applies to that server, not its entire group. A group grant permits the group's matching alerts.
- Default new users to no resource access. Administrators retain their existing broad visibility; hiding management screens is not a backend authorization boundary.
- Access removal stops future pushes after current authorization is checked. Already displayed OS notifications cannot be reliably recalled; keep their content minimal.
- Severity preferences affect notification selection, not which authorized alerts the user may browse.
- Newly approved users can browse retained matching alerts; do not push the entire historic backlog by default.

## Notification behavior

- Notify on a new alert and, if configured, resolution. Do not push every repeat ingest/heartbeat.
- Preserve existing initial severity defaults: critical/major enabled, minor/trivial disabled. Let users change them.
- A notification tap requires authentication and a fresh permission check. Handle expired sessions, revoked access, and deleted/retention-pruned alerts gracefully.
- Users can deny OS notification permission and still use the inbox. Refresh on resume and after reconnect to recover missed events.
- Push is a best-effort convenience, not a guaranteed emergency paging channel or a promise to bypass silent mode/Do Not Disturb.

## Outside the first release

Inventory creation, user management, agent API keys, access approval, alert-rule configuration, editing/resolving alerts from mobile, SMS, email delivery, voice calls, billing, on-call escalation, guaranteed delivery, critical-alert entitlements, automatic resource monitoring, and multi-tenant SaaS isolation.

One backend per deployment is the initial model. Running this for multiple businesses in one shared database requires a separately designed and tested tenant-isolation model.
