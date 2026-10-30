# Feature status and deployment defaults

Reviewed: 2026-10-30. Documentation-only milestone. "Disabled" below means a proposed deployment default, not an implemented feature switch.

| Feature | Current repository | Planned default / gate |
| --- | --- | --- |
| Web administration, API, PostgreSQL, CLI agents | Implemented | Existing deployment configuration |
| Group/server requests and web approval | Implemented in API/web | Mobile UI planned; approval required |
| Scoped alerts and alert-list pagination | Implemented in API/web | Reuse in mobile |
| In-app notification history/read state | Implemented for web | Reuse after pagination/access hardening |
| Severity preference storage | Implemented | Major/critical on, minor/trivial off initially |
| Android mobile screens | Not implemented | First mobile target |
| iOS mobile screens | Not implemented | Shared-source target; Apple build/test gate |
| Prism Light/Dark screen designs and theme control | 26 editable Figma frames, simulated appearance states | Future app must implement/persist Light/Dark/System |
| Click-through design navigation | 140 native Figma prototype connections | Sample states only; not live API integration |
| Refresh tokens and revocable device sessions | Not implemented | Required for mobile release |
| Device registration and push outbox/worker | Not implemented | Disabled until explicitly configured |
| Android native push | Not implemented | Enable after free FCM/Expo configuration and real-device tests |
| iOS native push | Not implemented | Disabled until APNs credentials/provisioning and testing |
| APK local release build | Not implemented | Planned personal distribution path |
| Android/iOS store publishing | Not configured | Manual operator opt-in, own accounts/signing |
| Paid Expo/cloud hosting plans | Not configured by this plan | Off; local builds/self-hosting are baseline |
| SMS, voice, paid email delivery | Not part of mobile scope | Off / not implemented |
| Mobile admin/configuration or alert resolution | Not part of first release | Remains in web / future scope |
| Advertising, billing, subscriptions, paid analytics | Not part of this plan | Off / not implemented |
| Multi-tenant SaaS | Not implemented | Requires separate isolation design |
| Emergency/critical-alert bypass of device settings | Not promised | Outside first-release scope |

## Meaning of free

Personal Android use is designed to avoid additional software/service subscription and store fees: build locally, install directly, self-host the API, and use no-cost messaging. Existing hardware, connectivity, power, and time are still required. Free services have terms/limits that may change; the project must not automatically upgrade plans or enable billing.

Business use can also be self-hosted without store publishing. App Store/Play distribution, additional hosting, support, hardware, or optional paid services are separate choices. See [personal setup](PERSONAL_SETUP.md), [business setup](BUSINESS_SETUP.md), and [dated cost references](README.md#cost-references).

## Operator activation gates

1. First complete the relevant implementation milestone and update this file.
2. Supply deployment-owned credentials outside Git and client bundles.
3. Explicitly enable the selected provider/platform. Missing credentials must leave inbox functionality usable and delivery disabled with a clear status.
4. Test permissions, revocation, logout, provider failures, and notification taps before declaring the feature available.
5. Record tested app/backend versions. Do not infer working iOS notifications from Android tests.
