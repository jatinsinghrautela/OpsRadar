# Mobile delivery plan

Status: milestones 1–3 have a first implementation; local builds and device verification are in progress. See [actual delivery status](BUILD_STATUS.md). The following is the original acceptance plan, not a claim that all platform acceptance checks passed. No paid subscriptions or publication are authorized.

## Milestone 1: backend readiness

- Reuse current alert pagination/filtering, access-request approval, alert scope, and severity preference logic.
- Add refreshable, revocable user sessions. Check current user activity and authorization rather than trusting stale JWT admin claims alone.
- Add authorized single-alert details, minimal requestable inventory, current-access summary, and paginated notification history.
- Recheck access for stored notifications after permission removal; ensure all push/detail paths share the same recipient rules.
- Protect public authentication and device registration against abuse and document consistent unauthorized/expired-session responses without breaking the web client.

Acceptance: API tests cover no access, group access, server-only access, rejection, revocation, inactive accounts, pagination, and web compatibility. Test against an isolated database, not personal alert history.

## Milestone 2: shared mobile foundation

- Create `opsradar-mobile/` with React Native, Expo, and TypeScript, pin dependencies, and commit its lockfile.
- Separate API client, authentication, platform notification adapters, navigation, and screens.
- Add secure session storage, login/password-change/TOTP flows, server configuration, logout, and inbox navigation.
- Preserve Android/iOS support in shared code; isolate native differences behind platform adapters.

Acceptance: Android development build can log in and show only authorized alerts; missing push credentials do not break inbox use. Source compiles/type-checks; iOS verification remains explicitly pending until tested on Apple tooling.

## Milestone 3: access workflow and alert reading

- Implement searchable requestable resources, reason entry, request status, current access, filters, and alert details.
- Add read-state synchronization and refresh on reconnect/resume.
- Show understandable empty states for no grants, pending approval, unavailable API, and pruned alerts.

Acceptance: request a server on Android, approve it through the web, and observe newly granted visibility without access to unrelated resources. Revocation removes detail/history access on subsequent requests.

## Milestone 4: opt-in push delivery

- Add device registration, owner-bound token refresh/removal, durable outbox, and a delivery worker.
- First provider: free Expo Push Service with Android FCM credentials. Keep provider selection replaceable for direct FCM/APNs in independent deployments.
- Add notification-permission prompts, Android channels, minimal payloads, deep links, retries, receipt handling, and invalid-token cleanup.
- Add approval/rejection update events without forcing them into the current alert-only notification schema.

Acceptance: a real Android phone receives an agent-generated alert and opens its authorized details. Test foreground/background/ordinary app termination, denied permission, force-stop restrictions, token expiry, logout, multiple devices, duplicate events, provider failure, and revoked access before retry. Do not promise delivery after Android force-stop.

## Milestone 5: free personal Android release

- Produce a locally signed standalone release APK with JavaScript bundled; it must not require the Metro development server.
- Publish exact SDK/JDK versions, environment examples, build commands, artifact paths, credential instructions, and key-backup steps validated against the implementation.
- Install on a physical device and test upgrade with the same signing key.

Acceptance: developer server is off, backend is reachable, APK opens and receives eligible notifications. No paid plan, billing account, paid hosting, or store submission is enabled.

## Milestone 6: iOS verification and optional commercial distribution

- On an available Mac, build and test iOS UI/auth/access flows; separately verify APNs on an appropriately provisioned device using the operator's credentials.
- Document bundle identifiers, Apple team/signing, Android signing, store privacy declarations, and release procedures.
- Perform dependency/security and license review before claiming production or redistribution readiness.

Acceptance: report Android and iOS verification separately. A shared codebase is not evidence of an iOS build or working APNs. Store release is an optional operator action, not part of the personal free path.

## Completion evidence

Update [FEATURES.md](FEATURES.md) after each milestone with implemented features, remaining gates, test environment, and relevant commit. Include an Android test record and, when possible, a separate iOS test record. Do not mark planned setup variables or endpoints as available before shipping them.
