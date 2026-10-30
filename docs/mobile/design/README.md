# OpsRadar mobile visual direction

## Selected direction: Prism

The user selected **Prism**, with Precision-style severity icons and Light/Dark/System appearance controls. Open the [Prism design and prototype guide](PRISM.md) for the current design links, 26 screens, 140 native prototype connections, theme behavior, and labeled flow-map fallback. The radar/orbit concepts below are archived alternatives, not the selected direction. The mobile app itself is still unimplemented.

## Archived first concept: Radar editorial

Status: archived design concept, 2026-10-30. Six earlier native editable Figma screens and separate SVG concept illustrations are retained. These are proposed designs, not implemented mobile screens. All names, counts, dates, and permission states are sample data.

Open [OpsRadar Mobile in Figma](https://www.figma.com/design/osWxsVNpXNTD33zC3c6abf?node-id=4-300). The Figma file is the primary design review surface. It contains editable DM Sans text, Auto Layout screen/card hierarchies, Simple Design System button instances, and Material 3 switch instances with OpsRadar color overrides. The SVGs are a separate earlier illustration pass and are not a pixel-identical export of the native file.

## Visual principles

Use a calm editorial layout with a radar motif: warm ivory surfaces, deep ink typography, lime highlights, generous spacing, and restrained geometry. Reserve red/amber for alert severity and display text labels alongside color. Use DM Sans for the primary native design typography, matching the web product. An operational inbox must remain readable under pressure; artistic details must not obscure status or content.

Tokens: background `#F6F5EF`, ink `#172D3B`, accent `#D5F47A`, secondary text `#64747A`, critical `#B63D3D`, major `#996017`. Use a system sans-serif in implementation, strong heading hierarchy, 16–24 unit card radii, and platform-appropriate safe areas. Validate contrast, text scaling, screen-reader labels, touch targets, and reduced-motion behavior during implementation. The concepts do not constitute an accessibility audit.

## Preview and screen files

- [All six screens](overview.svg)
- [Rendered native Figma preview](figma-preview.png)
- [Sign in](01-sign-in.svg)
- [Alert inbox](02-alert-inbox.svg)
- [Alert details](03-alert-details.svg)
- [My access](04-my-access.svg)
- [Request access](05-request-access.svg)
- [Settings](06-settings.svg)

The primary navigation is Alerts / Access / Settings. Notification history will sit within Alerts. Sign-in is visually separate from authenticated navigation. Alert details stay read-only; access submission explicitly communicates that admin approval is required.

Follow-up frames before implementation: notification history, request pending/rejected, TOTP, forced password change, account reset request, empty/no-access, loading, offline/API error, revoked/pruned alert, notification permission denied, and large-text layouts. Dark mode and animation are future design passes, not shown or promised as implemented.

## Figma handoff

The [native Figma file](https://www.figma.com/design/osWxsVNpXNTD33zC3c6abf?node-id=4-300) is created in the owner's account. No `.fig` export or public link-sharing permission change was performed. Access follows the file's Figma sharing settings. The six screens are editable concepts; interactive prototype connections and full component/variable foundations are not included yet. No paid plan or AI credit generation was used.

For the next Figma pass, formalize foundations/colors/type/spacing, reusable alert-card and field components, and prototype links for login → inbox → detail and Access → request → pending; add error/permission states. Maintain separate Android/iOS safe-area and native-notification specifications. Alternatively, import the individual SVGs into another Figma file for vector editing; that does not preserve native Auto Layout or library instances. Do not purchase a Figma plan or enable paid services for this work.

Regenerate the assets from the repository root with `node docs/mobile/design/generate-concepts.cjs`. This generator has no external dependencies. Review screen designs before treating them as implementation specifications.
