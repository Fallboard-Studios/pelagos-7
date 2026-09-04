# Console Theming

**Shipped: [Roadmap Phase 11](roadmap/roadmap.md).** `src/utils/consoleTheme.ts` computes bounded, seed-derived `--color-bg`/`--color-surface`/`--color-accent`/`--color-border` values; `src/components/tablet/Tablet.tsx` applies them as an inline style on `.tablet`. `src/index.css`'s static color-token values now serve only as the pre-theme fallback (visible only before the first `computeConsoleTheme()` result lands). See [docs/specs/CONSOLE_THEMING.md](specs/CONSOLE_THEMING.md) for the full derivation this doc summarizes.

**Related docs:** [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the noise-map registry and seed-determinism guarantee this design builds on) · [ROBOT_DESIGN.md](ROBOT_DESIGN.md) (the bounded-HSL, no-static-palette precedent this design follows for a different subject) · [UI_SHELL.md](UI_SHELL.md) (Sleeve/Glass split, `ScreenViewport` boundary) · [roadmap/roadmap.md](roadmap/roadmap.md) Phase 1 (token naming forward note), Phase 5 (the retransmit trigger this reacts to), Phase 11 (this phase), Phase 11.1 (Oblique Cabinetry — deferred, depends on this phase's tokens), Phase 12 (why this needs no storage of its own)

## What This Is Not

This is not world/environment styling. `WorldView` terrain, sky, and atmosphere are explicitly out of scope, deferred to a future version. This is also not robot styling — robot visuals stay locked to `audioAttributes` (ADSR/waveform/phase/detune) per CLAUDE.md's Visual Mapping guardrail, untouched by anything here. This design covers exactly one thing: the tablet console's own interactive chrome — the Glass-side UI drawn on top of `ScreenViewport`. The Sleeve casing is out of scope: its current static content (logo mark, `PowerRockerSwitch`) is unchanged — no generated geometry or seed-driven color touches it. Its interior edge against `ScreenViewport` remains a fixed, pre-existing dead zone (see [UI_SHELL.md](UI_SHELL.md)'s Sleeve/Glass guardrail: no interactive UI outside `ScreenViewport`).

## The Split: Scale, Not Physical Part

Two independent seeds already exist and already guarantee determinism (see [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md)): the **AS seed** and the active **locale's coordinate seed**. This design routes them by the *scale* of what they're driving, not by which physical component it lives on:

- **AS seed → large/structural elements.** `--color-bg`/`--color-surface`, computed by `computeStructuralTheme()` from `getAttenuationStyleNoiseMap()`.
- **Locale coordinate seed → small/accent elements.** `--color-accent`/`--color-border`, computed by `computeAccentTheme()` from `getLocaleNoiseMap()`.

Retransmitting a new seed in Sector Settings (Phase 5) recomputes both tiers via `Tablet.tsx`'s `useMemo` (keyed on the active AS's `id`/`name` and the active locale's `id`/`coordinates.x`/`coordinates.y`) and visibly updates the console, crossfading over 250ms (`src/index.css`'s global transition rule) unless `prefers-reduced-motion: reduce` is set, in which case it snaps. This reinforces the same "this is a piece of field equipment reporting what it's tuned to" fiction the rest of the console already leans on (`SYSTEM_FIRMWARE_RESETS`, the power-off confirm dialog).

## Color Generation: Bounded HSL, Verified Against WCAG AA

Colors stay within bounds tighter than [ROBOT_DESIGN.md](ROBOT_DESIGN.md)'s precedent (robot saturation 30–100%, luminance 20–72%) and are verified — not eyeballed — to clear WCAG AA (4.5:1 normal text, 3:1 large text/UI components) against the app's fixed dark theme for **every possible seed**, via `consoleTheme.test.ts`'s exhaustive hue sweep (0–360° in 5° steps, crossed with every combination of bound extremes). `--color-text-primary`/`--color-text-muted` are **not** seed-driven — they stay fixed, so the sweep checks the seed-driven colors against those two constant values rather than trying to vary everything at once.

**Shipped bounds** (`src/utils/consoleTheme.ts`):

```typescript
// AS-tier (structural) — --color-bg / --color-surface
BG_HUE_RANGE: [0, 360]
BG_SATURATION_RANGE: [10, 35]
BG_LIGHTNESS_RANGE: [5, 14]
SURFACE_LIGHTNESS_OFFSET: 4   // surface = bg lightness + 4pp
SURFACE_LIGHTNESS_MAX: 18     // clamp

// Locale-tier (accent) — --color-accent / --color-border
ACCENT_HUE_RANGE: [0, 360]
ACCENT_SATURATION_RANGE: [55, 90]
ACCENT_LIGHTNESS_RANGE: [72, 88]
BORDER_SATURATION_RANGE: [20, 40]
BORDER_LIGHTNESS_RANGE: [65, 80]
```

Surface is derived from bg (same hue/saturation, `+4pp` lightness, clamped to `SURFACE_LIGHTNESS_MAX`) rather than independently seeded — mirroring the relationship the old static `#121212`/`#1a1a1a` pair already had. Border reuses accent's own seeded hue rather than sampling a fifth, independent hue — it reads as a desaturated, dimmer sibling of accent. No static/fixed palette table anywhere — every color is `getSeededVal(...)`-sampled, same rule [ROBOT_DESIGN.md](ROBOT_DESIGN.md) already enforces for robots. Full derivation and the worst-case contrast table: [docs/specs/CONSOLE_THEMING.md §1.1](specs/CONSOLE_THEMING.md).

## Generating Enough Variety

Resolved: hue is the primary differentiator, sampled across the full 0–360° range independently for the AS tier and the locale tier (two unrelated `NoiseFunction2D`s by construction — `getAttenuationStyleNoiseMap`/`getLocaleNoiseMap`), and saturation is sampled as its own independent value within each tier's bounded range. No additional bucketing/anti-collision scheme sits on top — two fully-independent continuous hue channels, each crossed with their own independently-seeded saturation/lightness, is enough combinatorial space that no extra mechanism is needed. See [docs/specs/CONSOLE_THEMING.md §1.2](specs/CONSOLE_THEMING.md).

## The `Console.css` Conflict — Resolved

`Console.css`'s `.console` rule ([src/components/panels/screen/console/Console.css](../src/components/panels/screen/console/Console.css)) used to hardcode `--color-surface: rgba(26, 26, 26, 0.75)` for the hub's "glass" translucency over `WorldView`, which always won over the seed-driven value applied higher up the tree (`.tablet`) — custom-property inheritance resolves to the nearest declaring ancestor. Resolved with a self-referential `color-mix()`:

```css
.console {
  --color-surface: color-mix(in srgb, var(--color-surface) 75%, transparent);
}
```

The `var(--color-surface)` on the right resolves against the *inherited* (seed-derived) value from `.tablet` before this declaration overrides it locally — not a cycle, no new coupling between `consoleTheme.ts` and `Console.tsx`/`Console.css`. Same 75%-opacity relationship the old static `rgba` already expressed. `color-mix()` is broadly supported in evergreen browsers (Chromium 111+, Firefox 113+, Safari 16.4+) — this app has no polyfill layer and already assumes evergreen browsers elsewhere (GSAP/Tone.js/Radix). Full rationale: [docs/specs/CONSOLE_THEMING.md §1.3](specs/CONSOLE_THEMING.md).

## Implementation Shape

- `src/utils/consoleTheme.ts` — pure functions (`computeStructuralTheme`, `computeAccentTheme`, `computeConsoleTheme`, `consoleThemeToCSSProperties`), alongside `seedUtils.ts`/`getSeededVal.ts`. Uses `getSeededVal(noiseMap, dataId, offset, min, max)`: AS-tier tokens sample `getAttenuationStyleNoiseMap()`, locale-tier tokens sample `getLocaleNoiseMap()`. `dataId` strings follow the dot-namespaced convention: `'ui.theme.background.hue'`/`.saturation`/`.lightness`, `'ui.theme.accent.hue'`/`.saturation`/`.lightness`, `'ui.theme.border.saturation'`/`.lightness`.
- **`offset` is `0.5` for every call, not the usual `0`.** This is the one deliberate departure from `PROCEDURAL_GENERATION.md`'s typical single-value-field convention, found and fixed via `consoleTheme.test.ts`'s non-degeneracy test: `simplex-noise`'s `createNoise2D` evaluates to exactly `0` at the origin `(0, 0)` for every possible seed, and stays degenerate near it. `'ui.theme.background.hue'`'s `precomputeDataX()` hash happens to land at `x≈0.0083` — close enough that, sampled at the usual `offset=0` (`y=0`, the degenerate lattice line), 50 random Attenuation Styles collapsed to only 3–4 distinct hues instead of a full spread. A fixed non-zero, non-integer offset (`THEME_SAMPLE_OFFSET = 0.5`) moves every query off that lattice line regardless of which `x` a given `dataId` hashes to — verified this restores full variety (43/50 distinct hues for the same `dataId`). This is local to `consoleTheme.ts`; `getSeededVal`'s own `offset=0` default, and every other existing caller using it, is untouched. See [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md)'s Gotchas for the general form of this hazard.
- Output target: `--color-bg`/`--color-surface`/`--color-accent`/`--color-border` (`src/index.css`), computed once per AS/locale activation via `Tablet.tsx`'s `useMemo` and applied as that component's inline `style` — `consoleTheme.ts` itself never touches the DOM. `--color-text-primary`/`--color-text-muted` are untouched, always fixed.
- A 250ms CSS transition on retransmit stays a plain `src/index.css` rule (`*, *::before, *::after`), not scheduling/timeline-worthy — honoring `prefers-reduced-motion` the same way `PowerRockerSwitch.css` already does.

## Forbidden Patterns

- No static/fixed color palette or lookup table — colors stay derived from the seed, same rule as robots. (Verified: `consoleTheme.ts` contains no such table.)
- No skipping contrast validation — `consoleTheme.test.ts`'s exhaustive sweep proves every possible seed clears WCAG AA against the fixed dark theme, not just the seeds used in manual testing.
- Not applied to `WorldView`/terrain, robot visuals, `SleeveContainer`, or the power rocker switch — all remain untouched by this phase.
- No recomputing theme values on every render — `Tablet.tsx`'s `useMemo` guarantees this.
