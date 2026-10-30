# Business use, builds, and optional publishing

Status: shared mobile source and local Android build/signing configuration are available. See [current status](BUILD_STATUS.md) and [build commands](../../opsradar-mobile/README.md). This remains an operator publishing checklist: production/device validation, iOS builds and store submissions have not been completed.

## Deployment choices

| Choice | What changes from personal use |
| --- | --- |
| One-business self-hosted deployment | Same API/web/agents/mobile source; business owns infrastructure, credentials, backups, and distribution |
| Google Play distribution | Signed Android App Bundle, Play account, review/testing/policy requirements |
| iOS distribution | macOS/Xcode or deliberately selected build service, Apple team/signing, APNs, and App Store/TestFlight or eligible private distribution |
| Multiple customer businesses on one service | Not supported by the initial design; requires explicit tenant isolation and a separate security design |

Commercial use does not require paid push messaging, paid Expo builds, or publication. Store registration and optional infrastructure are separate operator choices. The repository will not purchase plans or publish automatically.

## 1. Establish ownership and release prerequisites

1. Review repository licensing before redistribution. At this documentation milestone there is no root `LICENSE` file. Some package manifests contain `ISC` metadata; that alone is not a clear repository-wide license grant. The project owner must select/document intended license terms and confirm asset/dependency rights before claiming commercial redistribution is authorized. This documentation does not select a license.
2. Choose the business app name, Android application ID, iOS bundle ID, versioning, and support/privacy contact.
3. Create business-owned Firebase/Expo/Apple/Google accounts as needed; do not reuse the personal project's private keys or signing identity.
4. Complete backend/mobile milestones, dependency review, device tests, backup/restore checks, and credential handling before a production rollout.

## 2. Deploy the server

Follow [DEPLOY.md](../DEPLOY.md) for the existing stack. Put the API behind HTTPS with stable DNS or an appropriately managed VPN address. Phones need access to the API; they do not need database or agent-key access.

Replace all sample credentials, configure bootstrap/account/session controls, and arrange database backups, restore testing, retention, log rotation, monitoring, and updates. Review the existing dependency advisories rather than treating the development Compose stack as production certification. The current Compose frontend is a development server; a production deployment should serve a tested production build through suitable hosting/reverse-proxy infrastructure.

Operate one deployment per business initially. No tenant boundary should be inferred from group/server permissions.

## 3. Configure push under business ownership

Use the no-cost Expo Push adapter initially with the business's Android FCM and, when ready, iOS APNs credentials. An optional future direct FCM/APNs adapter must preserve the same event/permission contract. Neither provider choice requires migrating alerts or users into a paid Firebase database.

Keep service-account/APNs private keys on the selected trusted server/provider and signing credentials in a secure operator store. Use separate development/production identities where practical. Enable the delivery worker only after credentials, receipt handling, revocation, and retry behavior pass tests.

Use minimal lock-screen content, current-access checks, and device/session cleanup on logout. Document actual data sent to messaging providers. Do not sell push delivery as a guaranteed emergency channel.

## 4. Android build and Google Play publication

After implementation:

1. Follow the [personal Android build prerequisites](PERSONAL_SETUP.md), using business configuration and release credentials.
2. Generate a signed standalone APK for direct installation or a signed AAB for Play. The conventional Gradle task for the AAB is `bundleRelease` from the generated Android project; signing and exact artifact paths must be verified in the released app.
3. Preserve the signing/upload key and application ID for upgrades; configure Play App Signing as appropriate.
4. Register the Play Console account if publishing. Current registration is US$25 once; verify local pricing and current account requirements.
5. Complete required testing, privacy/data-safety declarations, permission explanations, support information, and store review. These requirements depend on account/app circumstances.
6. Validate notification taps and login on the store-signed build, including after an upgrade.

Direct business distribution also has platform rules. Check [Android verification](https://developer.android.com/developer-verification) and account eligibility; do not assume the student/hobbyist limited-distribution option covers a business rollout.

## 5. iOS build, push, and publication

After shared code and iOS-specific implementation are ready:

1. Obtain access to macOS/Xcode for local builds. Windows/Linux development of shared source does not provide a local iOS compiler.
2. Set the business bundle ID and Apple team, create the corresponding App ID, and configure signing/provisioning. Ordinary native distribution and APNs provisioning generally need the operator's Apple Developer Program membership, currently US$99/year, subject to regional prices/eligible waivers.
3. Configure the Push Notifications capability and the APNs credential for the selected delivery provider. Do not assume a free Apple account or iOS simulator build proves production push works.
4. Compile a development build (`npx expo run:ios` is the expected local workflow once implemented). Verify UI, auth, requests, and permission behavior; then test real push with a suitably provisioned device/build.
5. Use Xcode archive/distribution or a deliberately selected build service for the signed release. Cloud subscriptions are optional and off by default.
6. Complete App Store Connect metadata, privacy disclosures, required account-management policies, review access, and TestFlight/review steps appropriate to the app. Private/enterprise distribution has separate eligibility rules.
7. Test notification tap behavior and session recovery on the distributed iOS build. Record the tested OS, device, app, and API versions.

## 6. Release and operations handover

Supply reproducible build versions, credential provisioning instructions without secrets, platform-specific verification records, database migration/rollback guidance, signing-key recovery instructions, and an explicit list of enabled integrations. Keep app/backend API compatibility and a process for rotating provider credentials and invalidating compromised devices.

Do not mark iOS supported-and-tested until iOS evidence exists. Do not mark a deployment compliant or production-ready based solely on these planning documents.

## Costs and sources

Business operators may retain free messaging and local builds. They fund any store membership, extra hardware, hosting, domain, bandwidth, support, or optional cloud service they choose. Commercial use does not guarantee a free service forever. Current sources, reviewed 2026-10-30:

- [Firebase pricing](https://firebase.google.com/pricing)
- [Expo push costs and limits](https://docs.expo.dev/push-notifications/faq/)
- [Expo local release builds](https://docs.expo.dev/guides/local-app-production/)
- [Google Play enrollment](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Apple enrollment](https://developer.apple.com/programs/enroll/)
- [Android developer verification](https://developer.android.com/developer-verification)
