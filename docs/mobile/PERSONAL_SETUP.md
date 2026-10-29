# Personal setup: free Android path

Status: preparation guide and future build runbook. The mobile app and configuration switches are not implemented yet. You can run the existing backend/web/agents now; mobile build commands below require completion of [the plan](PLAN.md).

## What you need

- Your existing Windows, Linux, or macOS development computer; Android Studio, compatible Android SDK/JDK, Node.js/npm, Git, and an Android phone with Google Play services for FCM.
- A running OpsRadar backend/database and web admin portal on hardware you control. The phone must reach the API; `localhost` on a phone is the phone, not your PC.
- Internet access for dependency downloads, push provider connectivity, and phone messaging. Backend and phone can use LAN/VPN access for API traffic; native push still uses external provider infrastructure.
- A deployment-owned Firebase project for Android messaging. Keep it on the no-cost Spark plan and do not activate chargeable Firebase products or link billing for this path.
- For the initially proposed Expo Push adapter, your own free Expo project and configured FCM v1 delivery credentials. No paid Expo subscription or cloud build is required for local native builds.

## 1. Prepare the existing server now

```bash
git clone https://github.com/jatinsinghrautela/OpsRadar.git
cd OpsRadar
cp .env.example .env
# Edit .env: replace example JWT/database secrets and bootstrap credentials.
npm start
```

PowerShell equivalent for copying: `Copy-Item .env.example .env`.

Use the web portal to change the bootstrap password, create inventory/users, and provision the agent. See [deployment](../DEPLOY.md) and [agent setup](../GUIDE_ENGINEER.md). Use an API hostname/address reachable by the phone. Configure HTTPS and the necessary firewall/VPN rules; do not expose PostgreSQL to phones. Stop the local stack with `npm stop` when finished; restarting is an explicit operator action.

## 2. Prepare Android push after implementation

1. Choose your own Android application ID (for example `com.yourname.opsradar`) and register that app in your Firebase project.
2. Supply the Firebase Android client configuration to the app through the documented local build inputs. Keep backend/provider private credentials separate.
3. Configure FCM v1 delivery credentials for the selected Expo adapter, using the [official setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
4. Set the implemented API URL configuration to your HTTPS backend; it is public app configuration, not a secret.
5. Explicitly enable Android push on the backend once credentials and worker are ready. Leave iOS push and paid services off.

The exact credential file locations and environment examples must be delivered with the mobile implementation. Do not invent credentials or commit private keys.

## 3. Development build after implementation

Expected workflow, to be confirmed against the generated app:

```bash
cd opsradar-mobile
npm ci
npx expo run:android --device
```

Connect a phone with USB debugging enabled, or use a suitable emulator for UI development. Use a physical phone for end-to-end push acceptance. A development build can depend on Metro; it is not the standalone APK for everyday use. Remote push testing in Expo Go is not supported by this plan.

## 4. Standalone personal APK after implementation

1. Generate/maintain the native Android project using the committed Expo configuration.
2. Create a private release keystore and configure release signing outside Git. A debug-signed test build is not the personal release artifact.
3. From the generated `android/` folder, build the signed release APK using Android Studio or Gradle `assembleRelease` (`gradlew.bat assembleRelease` on Windows, `./gradlew assembleRelease` on Linux/macOS).
4. The conventional output is `app/build/outputs/apk/release/app-release.apk`; confirm the actual path for the implemented build.
5. Install directly on your own phone using an approved local-install path, for example `adb install -r <path-to-apk>` with USB debugging authorized. Check current Android verification/distribution requirements before sharing beyond your device.
6. Keep the same application ID and signing key for upgrades. Back up the key/password securely; do not upload them to the repository.

The release must bundle JavaScript and work with Metro off. See [Expo local release instructions](https://docs.expo.dev/guides/local-app-production/). Exact build/signing instructions must be tested and updated when source exists.

## 5. Verify the user workflow

Sign in, request a server, approve on the web, send an agent alert, receive the phone notification, and open the correct detail. Check no-access behavior, denied OS permission, logout, revoked access, API outage, and reconnect. A running service/accepted push receipt is not proof of delivery to the user.

## Free-path boundaries

FCM and Expo push sending have no service charge under current published terms. Avoid paid hosting, EAS paid plans, store accounts, SMS, and automatic billing. API hosting must remain on existing hardware or another deliberately chosen no-cost arrangement. Services are not guaranteed free forever; see [cost references](README.md#cost-references).

Android developer verification is evolving by region and device; do not assume distributing APKs to an unlimited audience has no account requirements. Check [Google's current guidance](https://developer.android.com/developer-verification).

iOS source support remains part of the plan, but native iOS push/distribution is not part of this free Android runbook. Local iOS compilation needs macOS/Xcode; ordinary native push provisioning and distribution generally require the operator's paid Apple program membership. See [business/iOS instructions](BUSINESS_SETUP.md).
