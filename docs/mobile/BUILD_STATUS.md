# Mobile implementation status — 2026-10-30

The first mobile implementation is in `opsradar-mobile/`. See its [run/build instructions](../../opsradar-mobile/README.md). Earlier architecture sections describe the original plan; the concrete routes and status below take precedence.

## Available

- React Native 0.88 / Expo SDK 58 / TypeScript, bundled DM Sans, Prism cards/gradients, Precision severity icons, persistent Light/Dark/System appearance.
- Login, required password change, TOTP challenge/enrollment, reset request, configurable server, secure native token storage and logout.
- Scoped paginated alert inbox, severity/status/search/server/group filters, authorized detail, activity/read state and foreground refresh.
- Current access, searchable resource catalogue, group/server request with reason, pending and approval state. Approval/configuration remain in the web portal.
- Severity preference controls and clear push-disabled status.
- Hashed rotating refresh tokens, 15-minute access tokens, 30-day revocable sessions, current account/session checks, access-aware notification history.
- Durable opt-in push outbox, retry/receipt handling, current access/preferences/device/session checks before sending, minimal lock-screen payloads. Provider HTTP is mocked in tests.
- Local Android build script, private release signing gate and generated native configuration. iOS shares source/configuration but has not been built/tested.

## Concrete API additions

Migration `008-mobile.js` creates mobile session/device/outbox storage and typed access-decision notifications. Apply migrations before running the new API (the normal backend startup migration path handles this).

| Route | Purpose |
| --- | --- |
| `POST /mobile/sessions` | Exchange authenticated login for mobile session |
| `POST /mobile/sessions/refresh` | Rotate opaque refresh token |
| `POST /mobile/sessions/logout` | Revoke session and devices |
| `GET /mobile/alerts/:id` | Current authorized detail |
| `GET /mobile/resources` | Minimal paginated group/server catalogue |
| `GET /mobile/access` | Current granted access |
| `GET /mobile/activity` | Paginated authorized notification history |
| `GET /mobile/push-status` | Deployment platform gates |
| `POST /mobile/devices` | Authenticated mobile device registration |
| `DELETE /mobile/devices/:id` | Deactivate owned device |

Existing alerts, authentication, preferences, access-request and notification read endpoints are reused. Authentication rate limits are process-local; a multi-instance deployment needs shared enforcement.

## Disabled and unverified

Push defaults: `PUSH_ENABLED=false`, `PUSH_PROVIDER=none`, `MOBILE_IOS_PUSH_ENABLED=false`. Android activation requires operator-owned Expo project ID and FCM v1 credentials/native app configuration, then a real-device delivery/tap/revocation test. Do not enable merely because mocked tests pass. Configure Firebase's Android client file through Expo Android configuration privately and upload provider service credentials to your own Expo project; neither service-account JSON nor signing keys belong in Git/client bundles. Set backend provider to `expo` and enable only after configuration. An optional `EXPO_ACCESS_TOKEN` stays server-side. iOS additionally needs APNs/signing/provisioning and its explicit gate.

No real notification has been sent, no physical Android device is connected, and no iOS build has been verified. Provider receipt acceptance does not establish that a person saw an alert. Paid builds/hosting, SMS, billing, analytics and store publication remain off. Public release still requires deployment-specific security/device testing, privacy information, licensing and store requirements.

## Validation and machine state

- Nine isolated PostgreSQL API integration tests passed, covering access denial/grants/revocation, session rotation/logout, stale/inactive identities, preferences, approvals, password-reset session/device revocation with TOTP, and mocked push jobs/receipts.
- TypeScript compilation, Expo web export and headless browser flow verification passed. Screenshots are in `opsradar-mobile/screenshots/`.
- Signed standalone Android ARM64 release build succeeded (Gradle 9.4.1 / JDK 17). APK v2 signature verified, bundled JavaScript and ARM64 libraries checked. Local artifact: `opsradar-mobile/artifacts/opsradar-personal-arm64.apk` (32,859,104 bytes), SHA-256 `c8c2fc93b105bb62b0aea5483d881e9e476501e564099340a7e295e90c5a414f`. Artifacts are ignored in Git. This personal build permits HTTP explicitly and skips shrinking; it is not a production store release or a device test.
- C: has insufficient free space for the existing Docker services. Their database volume remains untouched. A separate portable development PostgreSQL/API runs from D: at API `localhost:5050`, database `localhost:55439`; browser preview is `localhost:8082`, and the existing web admin runs at `localhost:3000` against that API. The admin compiled with existing hook-dependency warnings in unrelated pages. Its private generated credentials are in root `.cache/dev-local/credentials.json`. This is seeded test data, not the original project's data.
