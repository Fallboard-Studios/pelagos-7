# Console Theming

**Status: design doc for [Roadmap Phase 10](roadmap/roadmap.md) — not yet implemented.** Nothing in this file describes current app behavior. Today `src/index.css` defines static, never-customized colors (`--color-accent: #646cff` is the stock Vite/React scaffold default), and `SleeveContainer.css` is a flat CSS box with no SVG and no generated geometry. Update this banner and fold this content into an implementation-sourced version once `consoleTheme.ts` and the reworked `SleeveContainer.tsx` land.

**Related docs:** [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the noise-map registry and seed-determinism guarantee this design builds on) · [ROBOT_DESIGN.md](ROBOT_DESIGN.md) (the bounded-HSL, no-static-palette precedent this design follows for a different subject) · [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) (timelineMap, for any generated-geometry transition) · [UI_SHELL.md](UI_SHELL.md) (Sleeve/Glass split, `ScreenViewport` boundary) · [roadmap/roadmap.md](roadmap/roadmap.md) Phase 1 (token naming forward note), Phase 5 (the retransmit trigger this reacts to), Phase 10 (this phase), Phase 11 (why this needs no storage of its own)

## What This Is Not

This is not world/environment styling. `WorldView` terrain, sky, and atmosphere are explicitly out of scope, deferred to a future version. This is also not robot styling — robot visuals stay locked to `audioAttributes` (ADSR/waveform/phase/detune) per CLAUDE.md's Visual Mapping guardrail, untouched by anything here. This design covers exactly one thing: the tablet console's own chrome — the Sleeve casing and the Glass-side UI drawn on top of `ScreenViewport`.

## The Split: Scale, Not Physical Part

Two independent seeds already exist and already guarantee determinism (see [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md)): the **planet seed** and the active **locale's coordinate seed**. This design routes them by the *scale* of what they're driving, not by which physical component it lives on:

- **Planet seed → large/structural elements.** The Sleeve casing's exterior silhouette, its decorative indents/bands, and its base color; large background regions inside the Glass (e.g. the hub tile grid's backdrop, screen backgrounds).
- **Locale coordinate seed → small/accent elements.** Buttons, text, borders — wherever they sit, including accent details on the casing's decorative bands and everything in the Glass-side chrome (hub tiles, Robot Options drawers, etc.).

Retransmitting a new seed in Sector Settings (Phase 5) recomputes both tiers and visibly updates the console — this is the actual success bar, not a static "different each session" backdrop. It reinforces the same "this is a piece of field equipment reporting what it's tuned to" fiction the rest of the console already leans on (`SYSTEM_FIRMWARE_RESETS`, the power-off confirm dialog).

## Hard Constraint: The Interior Boundary

The casing's **interior edge — the boundary touching `ScreenViewport`** — must never move and must never be generated. Exterior silhouette, indents, and bands are free to vary; the interior edge is fixed geometry, full stop. This is non-negotiable: a generated shape that encroaches on the Glass would cover live screen content, which is a functional bug dressed up as a design feature. Whatever shape-generation approach gets used, validate the interior edge against the fixed geometry before rendering, not after.

## Color Generation: Bounded, Not Free

Colors must stay within a legible/safe range, tighter than the precedent in [ROBOT_DESIGN.md](ROBOT_DESIGN.md) (robot saturation is bounded 30–100%, luminance 20–72%). This is real interactive chrome — buttons, borders, text — sitting on a fixed dark background (`--color-bg: #121212`, `--color-text-primary: rgba(255,255,255,0.87)`), not a decorative shape a slightly-off roll can shrug off. Whatever the final bounds, they must guarantee WCAG-adequate contrast against the app's fixed dark theme for every possible seed, not just typical ones — this is the property to test, not eyeball.

No static/fixed palette table (same rule [ROBOT_DESIGN.md](ROBOT_DESIGN.md) already enforces for robots) — colors are computed, not looked up.

## Generating Enough Variety

The planet-seed space is effectively unbounded — there are far more possible planets than could ever be manually curated — so a single hue-rotation risks feeling same-y well before the seed space is exhausted. The exact technique (gradients, multi-stop accents, generated silhouette families, whatever) is intentionally left open; the requirement is the outcome (planets stay genuinely distinguishable at scale), not a specific mechanism. Two illustrative (non-binding) directions:

- **Silhouette:** a discrete "family" of casing geometry (band count, indent style) chosen deterministically from the seed, with continuous parameters (band width, spacing, depth) varying within that family — more axes of variation than color alone can provide.
- **Color:** hue as the primary planet-level differentiator, with a secondary seed-derived value (e.g. a gradient stop or a saturation/lightness offset) so two planets with a similar hue don't read as identical.

## Implementation Shape

- `src/utils/consoleTheme.ts` — pure functions computing bounded theme values from seed inputs, alongside `seedUtils.ts`/`getSeededVal.ts`. Use the existing `getSeededVal(noiseMap, dataId, offset, min, max)` pattern: planet-tier tokens sample `getPlanetNoiseMap()`, locale-tier tokens sample `getLocaleNoiseMap()`/`tryGetLocaleNoiseMap()`. `dataId` strings follow the existing dot-namespaced convention (e.g. `'ui.theme.casing.hue'`, `'ui.theme.accent.hue'`) — per [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md), renaming one of these later is a breaking change to how every existing planet looks, same as any other `dataId`.
- Output target: the CSS custom properties already in `src/index.css` (`--color-bg`, `--color-surface`, `--color-border`, `--color-accent`, `--color-text-primary`, `--color-text-muted`) — computed once per planet/locale activation and applied (e.g. as inline styles on a root element), not recomputed per render.
- `SleeveContainer.tsx`/`.css` — goes from a static CSS box to a component consuming generated theme values, rendering the exterior silhouette as SVG (the same generated-geometry pattern the robot shape components already use — see [ROBOT_DESIGN.md](ROBOT_DESIGN.md)'s Shape Components — not a new mechanism for this codebase, just a new subject for it).
- Any transition on a *generated shape* (an SVG path/attribute change on retransmit) is a GSAP timeline registered in `timelineMap`, per [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) — not a raw CSS shape morph. A simple color fade on the CSS custom properties themselves can reasonably stay a plain CSS transition; it's not scheduling or timeline-worthy on its own.

## Forbidden Patterns

- Don't add a static/fixed color palette or lookup table — colors stay derived from the seed, same rule as robots.
- Don't let generated exterior geometry cross the interior boundary — validate against the fixed interior edge before rendering.
- Don't skip contrast validation — every possible seed must clear WCAG-adequate contrast against the fixed dark theme, not just the seeds used in manual testing.
- Don't apply this system to `WorldView`/terrain, robot visuals, or the power rocker switch — all three are explicitly out of scope for this phase.
- Don't recompute theme values on every render — compute once per planet/locale activation, same as any other spawn-time-derived data in this codebase.
- Don't animate generated SVG geometry outside a GSAP timeline in `timelineMap`.
