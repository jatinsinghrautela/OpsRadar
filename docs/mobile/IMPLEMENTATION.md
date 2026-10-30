# Mobile implementation design

Status: original architecture proposal retained for design rationale. A first mobile/backend implementation now exists. See [concrete routes, source behavior and verification](BUILD_STATUS.md), which supersedes proposed names and historical gaps below.

## Existing components to reuse

| Capability | Current source / behavior |
| --- | --- |
| User login, temporary password change, TOTP | `opsradar-backend/routes/auth.js`; ordinary login JWT expires after one hour |
| Scoped alert listing | `routes/alerts.js` and `services/alertScope.js`; filters and optional page/pageSize pagination already exist |
| Access requests / approval | `routes/accessRequests.js`; admin approval creates group membership or server view permission |
| Recipient selection | `services/notify.js`; active users, memberships/permissions, severity preferences |
| Notification history / read state | `routes/notifications.js`; recipient filter and capped list, not full mobile history pagination |
| Notification preferences | `routes/notificationPrefs.js`; critical/major initially on |
| Agent ingestion and lifecycle | Existing agents and backend continue to generate alerts; phones never receive agent ingest API keys |

Gaps: no mobile client, device-token storage, native push delivery, durable delivery outbox, refresh-token/session-revocation flow, or dedicated authorized alert-detail route. Current stored notification history is filtered by user ID but does not re-evaluate current resource access. Current JWT middleware also needs current-user/session checks for account deactivation and stale privilege claims.

## Proposed architecture

```text
Agents --> Express API --> PostgreSQL (alerts, grants, notifications, outbox)
                 ^                          |
Web portal ------|                     delivery worker
                 |                          |
Mobile app ------+                Expo Push --> FCM / APNs --> phone
    ^                                                         |
    +------- authenticated fetch after notification tap -------+
```

Use the existing PostgreSQL for the first outbox/worker implementation; no paid queue or separate broker is required. Expo Push is the initial optional provider. Direct FCM/APNs adapters can be added later; they must not cause duplicate delivery alongside Expo.

## Proposed backend interfaces

Route names in the additions column are design proposals, not callable endpoints today.

| Area | Existing | Proposed additions |
| --- | --- | --- |
| Authentication | `POST /login`, `/login/totp`, `/change-password` | `POST /sessions/refresh`, `/sessions/logout`; server-managed revocable sessions |
| Alerts | `GET /alerts` with existing pagination/filter parameters | `GET /alerts/:id` with shared current-access enforcement |
| Access | `GET/POST /access-requests`; admin approve/reject routes | `GET /me/access`, `GET /requestable-resources` with minimal names/IDs and pagination |
| Notifications | `GET /notifications`, unread count, mark-read routes | Add compatible pagination and access rechecks; define typed access-decision events |
| Devices | None | `POST /devices` for idempotent registration/update; `DELETE /devices/:id` limited to owner |

Do not expose server IPs, agent keys, user lists, or sensitive inventory through the requestable catalogue. Preserve existing web response shapes or use explicit versioning for incompatible changes.

## Proposed data and delivery flow

- `mobile_devices`: owner, installation ID, platform, provider/token, active state, and last-seen timestamps. Handle token replacement, multiple phones, and account switching without leaking messages to a previous user.
- `user_sessions`: owner/session ID, hashed refresh token, expiry, rotation/revocation metadata. Store refresh tokens using platform-secure storage; do not put credentials in plain AsyncStorage, logs, URLs, or notification payloads.
- `notification_events` or a backward-compatible extension: typed new-alert, resolved-alert, access-approved, and access-rejected events. Existing `Notification.alert_id` is required; access decisions cannot simply be inserted into that schema.
- `push_outbox`: event/device identity, state, attempt count, next retry time, provider ticket/receipt, safe error code. Add uniqueness for event/device pairs and safe concurrent job claiming.

Persist the relevant event and delivery intent transactionally. The worker rechecks account status, session/device state, current grants, and preferences before sending or retrying. Use bounded exponential backoff, expiry, rate limiting, and provider receipt checks. An accepted provider receipt is not proof that the person saw an alert. At-least-once delivery can still produce duplicates; use stable event IDs for client deduplication.

New alerts/resolutions should create distinct lifecycle events. Do not enqueue on every repeated ingest. Recover failed intent creation and worker restarts without losing events or flooding users. Unregister on logout and disable invalid/uninstalled-device tokens. Already delivered OS notifications cannot be reliably withdrawn.

## Proposed configuration contract

These names are proposed and must be implemented and supplied in example files later; setting them today has no effect.

| Setting | Planned default | Meaning |
| --- | --- | --- |
| `PUSH_ENABLED` | `false` | Backend worker must remain inactive until deliberately enabled |
| `PUSH_PROVIDER` | `none` | Explicitly choose `expo` when its free credentials are configured |
| `EXPO_PUBLIC_API_URL` | Required during app build | Non-secret HTTPS API address bundled into the mobile app |
| `MOBILE_IOS_PUSH_ENABLED` | `false` | Do not register/send iOS pushes until Apple provisioning is ready |

Never bundle Firebase service-account private keys, APNs private keys, JWT signing secrets, or Android signing passwords into JavaScript or `EXPO_PUBLIC_*` variables. Firebase client config is different from a private service-account key. For Expo delivery, provision Android FCM v1 and iOS APNs credentials following the provider's instructions; only the chosen provider/authorized operator receives private credentials.

## Platform behavior and verification

- Use `expo-notifications` for registration, channels, permission requests, and tap handling; use development/release builds for remote-push tests, not Expo Go.
- Generate native projects with Expo tooling; local Android builds use Android Studio/SDK/JDK. Local iOS builds require macOS/Xcode. Pin the compatible tool versions when implementation starts.
- Use HTTPS for real deployments. HTTP exceptions, if needed for a LAN debug build, must be scoped to debug and excluded from release.
- Lock-screen text defaults to a generic alert notice plus a stable event/alert ID. Fetch authorized detail after login; do not cache sensitive alert content by default.
- Refresh the inbox after reconnect/resume. Handle denied permission, battery restrictions, notification expiry, and offline API separately from the current alert state.
- Keep iOS UI and push verification separate from Android verification; paid provisioning stays off until a deployment owner enables it.

References: [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [local development](https://docs.expo.dev/guides/local-app-development/), [local release builds](https://docs.expo.dev/guides/local-app-production/), [push delivery and receipts](https://docs.expo.dev/push-notifications/sending-notifications/).
