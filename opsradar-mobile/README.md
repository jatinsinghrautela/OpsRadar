# OpsRadar mobile

Android-first Expo/React Native companion with shared iOS source. The Prism interface includes Light, Dark and System appearance, Precision severity icons, scoped alerts/details, activity, access requests and notification preferences. Administration remains in the web portal.

## Run locally

Default: use Expo Go on a physical Android phone. No Android Studio, emulator, Gradle build, EAS cloud build or paid account is needed for this preview. Use Node 24, npm, and a running OpsRadar API. From this directory:

```sh
npm ci
cp .env.example .env.local
# Set EXPO_PUBLIC_API_URL to an API reachable from your device.
npm start
```

Install an [Expo Go version compatible with SDK 58](https://expo.dev/go?device=true&platform=android&sdkVersion=58), connect the phone and PC to the same trusted Wi-Fi, run `npm start`, and scan the terminal QR code from Expo Go. The launcher explicitly selects Expo Go and keeps npm/Expo/Metro temporary caches under root `.cache` on the project's drive. It does not compile or publish an APK. Metro must remain running during preview.

### Expo account login, including physical iOS previews

Expo Go on a physical iOS device requires the same Expo account in the phone app and the CLI. Use these project commands so login and Metro share the same private Expo home on D::

```powershell
npm run expo:login -- --username jatinsinghrautela
# Enter your Expo password and any 2FA code at the terminal prompts.
npm run expo:whoami
# Confirm jatinsinghrautela, then:
npm start
```

Use your own account name if different. This is the Expo account, not the OpsRadar `admin` login. Login uses terminal prompts to avoid the Windows automatic-browser-launch failure. Do not put passwords in command arguments or chat. Plain `npx expo login` uses the default Expo home on C: and does not sign into this project's separate D: home. Restart Metro after changing accounts, then scan again or tap Try Again in Expo Go. The account/login step does not enable a paid build or subscription. See [Expo's account-mismatch guide](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).

For the separate portable development API, stop its existing terminal first, then start it from `../opsradar-backend` with PowerShell:

```powershell
$env:DEV_SEED='true'
$env:DEV_API_HOST='0.0.0.0'
node scripts/dev-local.cjs
```

This deliberately makes the API reachable on your trusted LAN; PostgreSQL remains loopback-only. Allow Node through Windows Firewall on the private network if prompted. Set `EXPO_PUBLIC_API_URL` in `.env.local` to `http://YOUR-PC-LAN-IP:5050` before starting Metro, or change **Server address** on sign-in. `localhost` on the phone refers to the phone. Do not expose this seeded development API to the public internet; omit `DEV_API_HOST` for the normal loopback-only default. Other API deployments should use their own reachable URL.

Use `npm run web` for a browser preview. `npm run android` and `npm run build:android` remain explicit optional native build commands, not routine development steps. Android emulator host access uses `10.0.2.2`; a physical phone needs your server's LAN/VPN address or HTTPS URL. Never put JWT secrets, database passwords or provider service accounts in `EXPO_PUBLIC_*` variables.

Native sessions use SecureStore. Browser preview sessions use sessionStorage and are intended for development. Push is optional and disabled by default; the inbox works without Firebase/Expo accounts. Remote Android push is unavailable in Expo Go: notification registration/listeners are skipped there and the app explains the limitation. UI, scoped inbox, access requests and preferences remain usable. A native build will eventually be required for actual background push and standalone distribution; that is separate from this free Expo Go preview. See [Expo notifications limitations](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/).

### Login succeeds through TOTP, then fails

Starting an existing Docker container does not update its image. A backend built before mobile support can accept the authenticator code but return HTTP 404 when the app subsequently calls `POST /mobile/sessions`. From the repository root run `docker compose up -d --build backend` to rebuild the API and apply migration `008-mobile.js`, then restart mobile sign-in. Keep the existing PostgreSQL volume; do not reset the database or authenticator enrollment. This backend update works with the first signed APK as well as Expo Go.

## Local Android APK

On Windows, install Android SDK and JDK 17, set `ANDROID_HOME`, then run:

```powershell
# Development APK; requires Metro for JavaScript.
npm run build:android

# Standalone release: supply YOUR signing key and passwords in this shell.
$env:OPSRADAR_KEYSTORE_FILE='D:\private\opsradar.p12'
$env:OPSRADAR_KEY_ALIAS='opsradar'
$env:OPSRADAR_KEYSTORE_PASSWORD='<private password>'
$env:OPSRADAR_KEY_PASSWORD='<private password>'
$env:EXPO_PUBLIC_API_URL='https://your-api.example'
npm run build:android -- -Release
```

Create a key with the JDK `keytool` and back up it and its passwords privately: future updates need the same key. Release builds refuse to use a debug key. `-AllowHttp` explicitly permits personal LAN HTTP (default is HTTPS). `-SkipOptimization` disables release shrinking for faster personal builds. `-Architecture arm64-v8a` is the default; choose another supported architecture for your device. Output is `android/app/build/outputs/apk/release/app-release.apk`. Install with `adb install -r <apk>` or copy the APK to your phone. No cloud build or store account is required for this path.

Native projects are generated by Expo prebuild and ignored in Git. Keep native customizations in the committed config plugins. On Linux/macOS, use `npx expo prebuild --platform android`, then `./gradlew assembleRelease` in `android/` with the same signing environment. iOS requires macOS/Xcode and local provisioning; run `npx expo run:ios`. iOS builds and device behavior have not been verified.

The first signed personal ARM64 APK is available locally in `artifacts/opsradar-personal-arm64.apk` (ignored by Git). Its private signing key and generated passwords are under root `.cache/signing/`; back them up privately before cleaning caches. For the current development API, connect your Android phone by USB, enable USB debugging, run `adb reverse tcp:5050 tcp:5050`, install the APK, then use **Server address** on sign-in to choose `http://localhost:5050`. The emulator can use `http://10.0.2.2:5050`. Development API binding is loopback-only; a phone cannot reach it over LAN without deliberately changing that deployment. Preview credentials are in root `.cache/dev-local/credentials.json` (`previewUsername` / `previewPassword`); admin credentials use `username` / `password`. These are separate generated accounts for seeded data.

## Verification and isolated services

```sh
npm run typecheck
npm run export:web
```

Backend tests: from `../opsradar-backend`, run `npm ci` then `node scripts/test-mobile.cjs`. This creates a fresh temporary PostgreSQL database and tests scope, sessions, preferences, approvals and mocked push delivery. It does not use the normal database.

For a separate disposable development environment on this Windows machine, run `node scripts/dev-local.cjs` from the backend directory with `DEV_SEED=true`. It starts portable PostgreSQL on 55439 and API on 5050, stores private credentials under root `.cache/dev-local/credentials.json`, and seeds preview data. It is separate from Docker's database. Keep its terminal open; Ctrl+C stops it. Never expose this seeded environment publicly.

Build web with `EXPO_PUBLIC_API_URL=http://localhost:5050`, then `node scripts/serve-preview.cjs` serves it at localhost:8082. `node scripts/smoke-preview.cjs` uses local Microsoft Edge headless to verify login, scoped alerts, theme persistence, push-disabled status, request/approval and logout against that seeded API. The smoke test adds a test group/request to the isolated development database.

The web admin is currently running at `http://localhost:3000` against that separate API. To restart it, from `../opsradar-frontend` run `npm ci`, then set `REACT_APP_API_URL=http://localhost:5050` and run `npm start` (PowerShell: `$env:REACT_APP_API_URL='http://localhost:5050'`). Keep service terminals open; Ctrl+C stops each service. Original Docker services can be started separately with the root runbook once C: has enough free space.

## Optional push and business distribution

See [current implementation status](../docs/mobile/BUILD_STATUS.md), [personal setup](../docs/mobile/PERSONAL_SETUP.md) and [business setup](../docs/mobile/BUSINESS_SETUP.md). No paid services, store submissions, APNs or production messaging credentials are enabled by this source.
