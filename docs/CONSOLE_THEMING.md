# Console Theming

**Status: design doc for [Roadmap Phase 11](roadmap/roadmap.md) — not yet implemented.** Nothing in this file describes current app behavior. Today `src/index.css` defines static, never-customized colors (`--color-accent: #646cff` is the stock Vite/React scaffold default). Update this banner and fold this content into an implementation-sourced version once `consoleTheme.ts` lands.

**Related docs:** [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the noise-map registry and seed-determinism guarantee this design builds on) · [ROBOT_DESIGN.md](ROBOT_DESIGN.md) (the bounded-HSL, no-static-palette precedent this design follows for a different subject) · [UI_SHELL.md](UI_SHELL.md) (Sleeve/Glass split, `ScreenViewport` boundary) · [roadmap/roadmap.md](roadmap/roadmap.md) Phase 1 (token naming forward note), Phase 5 (the retransmit trigger this reacts to), Phase 11 (this phase), Phase 12 (why this needs no storage of its own)

## What This Is Not

This is not world/environment styling. `WorldView` terrain, sky, and atmosphere are explicitly out of scope, deferred to a future version. This is also not robot styling — robot visuals stay locked to `audioAttributes` (ADSR/waveform/phase/detune) per CLAUDE.md's Visual Mapping guardrail, untouched by anything here. This design covers exactly one thing: the tablet console's own interactive chrome — the Glass-side UI drawn on top of `ScreenViewport`. The Sleeve casing is out of scope for now: it still exists — its current static content (logo mark, `PowerRockerSwitch`) stays as-is — but isn't gaining generated geometry or seed-driven color in this phase. Its interior edge against `ScreenViewport` is a fixed, pre-existing dead zone (see [UI_SHELL.md](UI_SHELL.md)'s Sleeve/Glass guardrail: no interactive UI outside `ScreenViewport`), not a boundary this phase needs to validate against, since nothing generated touches the Sleeve here.

## The Split: Scale, Not Physical Part

Two independent seeds already exist and already guarantee determinism (see [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md)): the **AS seed** and the active **locale's coordinate seed**. This design routes them by the *scale* of what they're driving, not by which physical component it lives on:

- **AS seed → large/structural elements.** Large background regions inside the Glass (e.g. the hub tile grid's backdrop, screen backgrounds).
- **Locale coordinate seed → small/accent elements.** Buttons, text, borders — wherever they sit in the Glass-side chrome (hub tiles, Robot Options drawers, etc.).

Retransmitting a new seed in Sector Settings (Phase 5) recomputes both tiers and visibly updates the console — this is the actual success bar, not a static "different each session" backdrop. It reinforces the same "this is a piece of field equipment reporting what it's tuned to" fiction the rest of the console already leans on (`SYSTEM_FIRMWARE_RESETS`, the power-off confirm dialog).

## Color Generation: Bounded, Not Free

Colors must stay within a legible/safe range, tighter than the precedent in [ROBOT_DESIGN.md](ROBOT_DESIGN.md) (robot saturation is bounded 30–100%, luminance 20–72%). This is real interactive chrome — buttons, borders, text — sitting on a fixed dark background (`--color-bg: #121212`, `--color-text-primary: rgba(255,255,255,0.87)`), not a decorative shape a slightly-off roll can shrug off. Whatever the final bounds, they must guarantee WCAG-adequate contrast against the app's fixed dark theme for every possible seed, not just typical ones — this is the property to test, not eyeball.

No static/fixed palette table (same rule [ROBOT_DESIGN.md](ROBOT_DESIGN.md) already enforces for robots) — colors are computed, not looked up.

## Generating Enough Variety

The AS-seed space is effectively unbounded — there are far more possible Attenuation Styles than could ever be manually curated — so a single hue rotation risks feeling same-y well before the seed space is exhausted. The exact technique is intentionally left open; the requirement is the outcome (Attenuation Styles stay genuinely distinguishable at scale), not a specific mechanism. One illustrative (non-binding) direction: hue as the primary AS-level differentiator, with a secondary seed-derived value (e.g. a gradient stop or a saturation/lightness offset) so two Attenuation Styles with a similar hue don't read as identical.

## Implementation Shape

- `src/utils/consoleTheme.ts` — pure functions computing bounded theme values from seed inputs, alongside `seedUtils.ts`/`getSeededVal.ts`. Use the existing `getSeededVal(noiseMap, dataId, offset, min, max)` pattern: AS-tier tokens sample `getAttenuationStyleNoiseMap()`, locale-tier tokens sample `getLocaleNoiseMap()`/`tryGetLocaleNoiseMap()`. `dataId` strings follow the existing dot-namespaced convention (e.g. `'ui.theme.background.hue'`, `'ui.theme.accent.hue'`) — per [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md), renaming one of these later is a breaking change to how every existing Attenuation Style looks, same as any other `dataId`.
- Output target: the CSS custom properties already in `src/index.css` (`--color-bg`, `--color-surface`, `--color-border`, `--color-accent`, `--color-text-primary`, `--color-text-muted`) — computed once per AS/locale activation and applied (e.g. as inline styles on a root element), not recomputed per render. **Known conflict to resolve when this phase is implemented:** `Console.css`'s `.console` rule already overrides `--color-surface` locally (a fixed `rgba(26, 26, 26, 0.75)`, for the hub's "glass" translucency over `WorldView` — see `AUDIO_SYSTEM.md`/`COMPONENT_LIBRARY.md`, unrelated to this phase). Since custom-property inheritance resolves to the nearest declaring ancestor, that rule will always win over a seed-derived value applied higher up (e.g. on `.tablet` or `:root`), silently preventing this phase's theming from ever reaching anything inside `.console`. Whatever computes the seed-derived surface color needs to also own `.console`'s override (e.g. apply it there directly, or re-derive the translucent variant from the same seed value) rather than only setting it further up the tree.
- A color fade on the CSS custom properties themselves can reasonably stay a plain CSS transition on retransmit — not scheduling or timeline-worthy on its own.

## Forbidden Patterns

- Don't add a static/fixed color palette or lookup table — colors stay derived from the seed, same rule as robots.
- Don't skip contrast validation — every possible seed must clear WCAG-adequate contrast against the fixed dark theme, not just the seeds used in manual testing.
- Don't apply this system to `WorldView`/terrain, robot visuals, `SleeveContainer`, or the power rocker switch — all are explicitly out of scope for this phase.
- Don't recompute theme values on every render — compute once per AS/locale activation, same as any other spawn-time-derived data in this codebase.
