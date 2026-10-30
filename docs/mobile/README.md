# OpsRadar Mobile documentation

Status: first mobile implementation available. Last reviewed: 2026-10-30.

Start with [current implementation and verification status](BUILD_STATUS.md) and the [mobile run/build guide](../../opsradar-mobile/README.md). The original plan and operator checklists below remain useful; implementation status in BUILD_STATUS.md takes precedence over historical future-tense sections.

## Reading order

| Document | Purpose |
| --- | --- |
| [Scope](SCOPE.md) | Users, screens, permission rules, and exclusions |
| [Build plan](PLAN.md) | Ordered milestones and acceptance criteria |
| [Implementation design](IMPLEMENTATION.md) | Existing code, proposed architecture, APIs, sessions, and push delivery |
| [Feature status and defaults](FEATURES.md) | What exists, what is planned, and what stays disabled |
| [Personal setup: free Android use](PERSONAL_SETUP.md) | Prerequisites, local builds, credentials, installation, and costs |
| [Business setup and publishing](BUSINESS_SETUP.md) | Self-hosted business use, Android/iOS releases, and operator responsibilities |
| [Visual design and screen concepts](design/README.md) | Modern visual direction, six editable SVG screens, and Figma handoff status |

## Agreed direction

- One React Native + Expo + TypeScript codebase, directory `opsradar-mobile/`.
- Android is the first installation and real-device test target. Design and source must also support iOS; iOS is not considered verified until built and tested there.
- Reuse the Express API and PostgreSQL. The web portal remains the administration interface.
- Mobile users read alerts, request group/server access, and manage their notification preferences.
- Use local builds and existing hardware for the personal path. Do not enable paid plans, paid hosting, SMS, billing, store submission, or automatic purchases.
- Push infrastructure is opt-in after operator configuration. Free provider usage does not imply offline operation or guaranteed delivery.
- Each independent deployment owns its credentials, identifiers, signing keys, and distribution accounts.

## Cost references

Prices and platform rules below were checked on 2026-10-30 and must be rechecked before publishing. Local power, internet, hardware, and maintenance remain the operator's responsibility.

| Service | Current position | Reference |
| --- | --- | --- |
| Firebase Cloud Messaging | Messaging is no-cost; other Firebase products can have separate charges | [Firebase pricing](https://firebase.google.com/pricing) |
| Expo Push Service | No charge to send; rate limit is 600 notifications/second/project | [Expo push FAQ](https://docs.expo.dev/push-notifications/faq/) |
| Expo cloud services | Optional free quotas and paid plans; not required for local builds | [Expo plans](https://docs.expo.dev/billing/plans/) |
| Google Play | US$25 one-time developer registration | [Play Console setup](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) |
| Apple Developer Program | Generally US$99/year; regional pricing and eligible waivers vary | [Apple enrollment](https://developer.apple.com/programs/enroll/) |
| Android distribution outside Play | Verification rules depend on region/device/distribution path; a limited-distribution account covers up to 20 devices without a registration fee | [Android verification](https://developer.android.com/developer-verification), [account options](https://support.google.com/android-developer-console/answer/16561738?hl=en) |

Commercial use does not inherently require a paid notification provider or store listing. Public store distribution introduces separate account, review, and policy requirements. These guides do not themselves grant a software license; see the business guide for the repository's current licensing status.
