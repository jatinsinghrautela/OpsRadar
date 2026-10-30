# Feature status and deployment defaults

Reviewed: 2026-10-30. See [verification details](BUILD_STATUS.md) and [run/build instructions](../../opsradar-mobile/README.md).

| Feature | Current state | Default / remaining gate |
| --- | --- | --- |
| Web administration, API, PostgreSQL, CLI | Existing implementation | Original deployment configuration |
| Mobile scoped inbox/detail/activity | Implemented, browser tested | Current authorization required |
| Access requests, catalogue and access summary | Implemented, approval flow tested | Web admin approval |
| Prism Light/Dark/System | Implemented and persistent | Follows OS unless selected |
| Password/TOTP and revocable mobile sessions | Implemented | Native storage/device validation pending |
| Severity preferences | Implemented | Critical/major initially enabled |
| Android local build and release signing | Script/config implemented | Native build result and real-device verification |
| iOS client | Shared source/configuration | Requires macOS/Xcode build and tests |
| Push device registration/outbox/receipts | Implemented; provider mocked in tests | Disabled until owner credentials and real delivery tests |
| Android native push | Adapter implemented | PUSH_ENABLED=false, PUSH_PROVIDER=none |
| iOS native push | Shared adapter/configuration | MOBILE_IOS_PUSH_ENABLED=false; APNs and tests required |
| Store publishing and paid cloud builds | Not configured | Manual operator choice |
| SMS, billing, advertising, paid analytics | Not implemented | Off |
| Mobile admin or alert resolution | Outside first release | Use web portal |
| Multi-tenant SaaS | Not implemented | Separate isolation design required |

Personal Android builds use local tools and direct installation. No paid plan or store submission has been enabled. Existing hardware, connectivity, power and maintenance are still needed. See the [personal](PERSONAL_SETUP.md) and [business](BUSINESS_SETUP.md) operator guides and [dated cost references](README.md#cost-references).

Before enabling messaging, supply deployment-owned credentials outside Git, explicitly select the platform/provider, and test permissions, logout/revocation, provider failures and notification taps on real hardware. Never infer iOS support from Android or browser results.
