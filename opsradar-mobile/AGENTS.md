# OpsRadar mobile development

- Preserve the Prism visual direction, Precision severity icons, and persistent Light/Dark/System themes.
- Use the pinned Expo SDK version and matching versioned Expo documentation. Install native modules with expo install.
- Keep API/session handling in src/api.ts and src/context.tsx; native notification behavior belongs in src/notifications.ts. Workspace owns the current lightweight navigation stack and Android back handling.
- Native projects are generated. Put native changes in app.config.ts and plugins/, not generated android/ios files.
- Expo Go on a physical Android phone is the default development workflow (`npm start`). Keep caches in root .cache on D:. Native builds are optional for standalone delivery/push testing; do not start them for routine UI work. Do not enable paid cloud builds, billing, store publication, FCM or APNs without deployment-owned configuration and explicit scope.
- Keep signing keys, passwords, provider service accounts, session tokens and generated artifacts outside Git.
- Run typecheck and web export after client changes. Run scripts/smoke-preview.cjs only against the isolated dev-local API; never production data. API scope/session/push changes require backend isolated integration tests.
- Record native build and real-device verification separately. iOS remains unverified until built on Apple tooling.
