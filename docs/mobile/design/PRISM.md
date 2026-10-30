# Prism: selected mobile direction

Status: editable Figma design and simulated clickable prototype, 2026-10-30. This replaces the earlier radar/orbit visual concept as the selected direction. The mobile application itself is not implemented.

## Open the design and prototype

- [Prism design: Light inbox](https://www.figma.com/design/osWxsVNpXNTD33zC3c6abf?node-id=14-214)
- [Prism design: Dark inbox](https://www.figma.com/design/osWxsVNpXNTD33zC3c6abf?node-id=14-774)
- [Prism design: Dark settings and theme control](https://www.figma.com/design/osWxsVNpXNTD33zC3c6abf?node-id=14-1085)
- [Present the clickable prototype](https://www.figma.com/proto/osWxsVNpXNTD33zC3c6abf?page-id=12%3A34&node-id=14-214&starting-point-node-id=14%3A214)

Use Present/Play to click through. In the editor, open the Prototype tab and select an actionable button, navigation pill, or alert/resource card to see its native connection and destination. There are 140 native navigation connections, validated after creation.

## Pages and screen inventory

1. **01 · Prism — Light & Dark prototype:** 26 frames, 13 per appearance. Both themes are intentionally on one page because Figma prototype navigation is per-page. The sun/moon shortcut changes to the matching screen in the opposite appearance.
2. **02 · Screen flows & interactions:** page created, but still empty. The Starter plan tool-call limit blocked its flow-map content. The labeled [SVG flow map](prism-flow-map.svg) is supplied separately and can be dragged into this page manually. The native click-through links on page 01 are already implemented.
3. **03 · Earlier concept (archived):** the earlier ivory/ink/lime concept is retained for history. It is not the selected implementation direction.

Each appearance includes sign-in, temporary-password change, TOTP verification, reset request, inbox, alert details, activity, my access, resource discovery, access request, pending confirmation, settings, and a System-selected settings preview. The primary navigation is Alerts / Access / Settings.

## Visual language and severity icons

Use soft lilac/rose page gradients, opaque readable cards, restrained depth, floating navigation, rounded controls, and DM Sans typography. No radar/orbit artwork. The design adapts Prism's selected layout rather than recoloring the old concept.

| Severity | Icon treatment | Light text | Dark text |
| --- | --- | --- | --- |
| Critical | Precision-style warning triangle | `#B52E4A` | `#FF9CB0` |
| Major | Precision-style drive outline | `#945A13` | `#F0C182` |
| Minor | Information circle | `#3164A6` | `#9AC1FF` |
| Trivial | Check circle | `#4D7660` | `#A3D4B1` |

Every severity keeps a text label alongside its icon and color. The same outline-icon vocabulary appears in settings and the alert list. Critical and major follow the Precision direction; minor/trivial extend it consistently. Do not use severity color as the only signal.

Light foundations: background `#F4F2FB`, rose end `#F8ECF2`, card `#FFFFFF`, primary text `#2D2846`, accent `#6250B8`. Dark foundations: background `#191725`, rose end `#2D2033`, card `#2A253B`, primary text `#F2EDF9`, accent `#BBAAFF`.

## Theme controls

- **Light / Dark:** settings options navigate to their selected-state screens. The sun/moon button in every screen header previews the same screen in the other theme.
- **System:** settings has an explicit selected-state preview for following the device appearance. Figma does not query the real phone appearance; System currently shows the theme of the originating preview.
- **Future application:** persist the Light/Dark/System preference on the device; use the OS appearance when System is selected, including live changes. Keep icon/label contrast and reduced-motion behavior in both modes. These runtime behaviors are not implemented by this prototype.

## Connected journeys

| Action | Opens |
| --- | --- |
| Sign in | TOTP demo branch |
| Verify and continue | Inbox |
| Temporary-password link | Password change → TOTP |
| Reset link / reset submission | Reset-request form / sign-in |
| Alert card | Alert-detail example |
| Activity chip | Notification history |
| Access-approved history card | My access |
| Request access | Resource catalogue |
| Resource row | Infrastructure request example |
| Send access request | Pending confirmation |
| View my access | Access summary |
| Bottom navigation | Alerts, Access, or Settings |
| Light / Dark / System or sun/moon | Corresponding appearance preview |
| Sign out | Sign-in |

The [navigation manifest](prism-navigation.json) records exact node IDs and target labels for every generated link. The [visual flow map](prism-flow-map.svg) summarizes primary journeys with labeled directional arrows. It is a separate SVG because the free Figma tool quota prevented writing that extra page; no paid upgrade was enabled.

## Prototype boundaries and remaining design work

No real authentication, password change, request submission, approval, notification delivery, or preference storage occurs. Existing backend services were not restarted. Forms contain sample content; TOTP is a demonstration of the enabled-account branch. Approval still belongs in the web portal.

Search, Filters, the Servers catalogue tab, and the severity On/Off values are illustrative, not interactive controls yet. Sample alert cards open one critical-detail example and resource rows open one Infrastructure request example. The manifest documents actual destinations; do not mistake this for per-record data binding. Notification severity switches need state variants in a subsequent pass.

Still to design/verify: server-search states, per-alert detail data, loading/empty/no-grant states, rejected/revoked/pruned states, OS notification-permission prompts, large text, screen readers, platform-safe areas, and production contrast checks. Prototype presentation has no real native OS push overlay.

## Source and evidence

- [Figma construction script](prism-build.figma.js): native Auto Layout, imported Simple Design System buttons/fields/navigation pills, editable DM Sans text, and native prototype reactions. This is design-tool source, not application JavaScript. Running it again without cleanup creates another set of screens; do not rerun blindly.
- [Figma flow-map script](prism-flows.figma.js): prepared but not executed successfully because the Starter tool quota was exhausted. Its file/page IDs are specific to this design.
- [SVG flow-map generator](generate-prism-flow.cjs): dependency-free fallback; run `node docs/mobile/design/generate-prism-flow.cjs` from the repository root.
- [Light inbox preview](prism-light-inbox.png) and [Dark settings preview](prism-dark-settings.png): native screenshots captured during visual review. A final targeted pass fixed rounded-container text clipping and refined the drive icon after these captures; quota prevented refreshing the screenshots. The Figma file is authoritative.

Verification completed: 26 frames, 140 connected prototype sources, DM Sans-only text, and no vertical content overflow in the screen-content containers. Light inbox and Dark settings were visually inspected. The separate flow-map page and refreshed post-polish screenshots remain limited by the Figma free-plan tool quota.
