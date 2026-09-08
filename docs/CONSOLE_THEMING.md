# Console Theming

**Status: tried and cut (Roadmap Phase 11).** A seed-driven color theming system for the console's
Glass-side UI was built, wired up, and evaluated against the real running app — then reverted at
Crawford's call. `src/index.css` defines static colors again, same as before this phase ever started.
This doc now records what was tried and why it didn't stay, so the reasoning isn't re-litigated later
(and so `docs/intent/console-theming.md` / `docs/specs/CONSOLE_THEMING.md` / `docs/tasks/CONSOLE_THEMING.md`,
which still describe the seed-driven design in detail, aren't mistaken for current behavior).

**Related docs:** [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the noise-map registry this
design built on) · [ROBOT_DESIGN.md](ROBOT_DESIGN.md) (the bounded-HSL, no-static-palette precedent
this design followed, then deliberately diverged from) · [UI_SHELL.md](UI_SHELL.md) (Sleeve/Glass
split, `ScreenViewport` boundary) · [roadmap/roadmap.md](roadmap/roadmap.md) Phase 11 (this phase,
now marked cut) · Phase 11.1 (Oblique Cabinetry UI — its face-shading was scoped to consume this
phase's *seed-driven* tokens; that premise no longer holds, see the note there)

## What was built

`src/utils/consoleTheme.ts` computed bounded HSL values — `--color-bg`/`--color-surface` from the
active Attenuation Style's seed, `--color-accent`/`--color-border` from the active locale's coordinate
seed — applied as an inline style on `Tablet.tsx`'s `.tablet` root, following the same
`getSeededVal`/noise-map pattern every other procedurally-generated system in this codebase uses
(robots, buildings, melodies). A companion `contrastRatio.ts` proved, via an exhaustive hue sweep, that
every possible seed cleared WCAG AA against the app's fixed text colors. It shipped, worked correctly,
and was fully tested — the decision to cut it was aesthetic, not a bug.

## Why it was cut

The WCAG-AA-for-every-seed guarantee forced the structural tier (`--color-bg`/`--color-surface`) into
a 9-percentage-point lightness band (5–14%) to protect fixed-text contrast, and pushed the accent tier
the opposite direction (72–88% lightness) to guarantee 3:1 against that dark background. In practice
this read as "the same dark gray, faintly tinted" for the tier that was supposed to feel structural,
and "too light/vivid" for the tier that was supposed to read as restrained chrome — the safety
constraint dominated the visual outcome rather than serving it. This was a foreseeable tension, not a
surprise: `docs/specs/CONSOLE_THEMING.md §7` flagged the structural-tier variety question as an open
risk before it ever shipped, and it went unresolved because there was no tuning fix available —
provably-safe-for-every-seed and visually-distinct-per-seed pull in opposite directions by
construction, so no amount of bound-adjustment was going to resolve it.

There's also a scope question worth naming: "no static/fixed color palette" was carried over from
[ROBOT_DESIGN.md](ROBOT_DESIGN.md)'s rule for robots without re-litigating whether it actually applied
here. Robots are small, numerous, and decorative — a bad procedural roll is forgettable. Console chrome
is the one thing on screen at all times. Different subject, no obligation to inherit the same rule.

## What's there instead

**"Ballast"** — a hand-picked static palette, chosen with actual taste rather than generated inside a
safety envelope. Picked from 5 named candidates (Ballast, Phosphor, Sonar, Signal Copper, Cold Iron)
presented side-by-side as instrument-panel mockups; cold graphite bg/surface with a depth-gauge cyan
accent. This is the deliberate, current choice, not a placeholder — swap it for a different mood if the
project's needs change, but don't treat it as an unfinished value waiting on a "real" answer.

Same 4 CSS custom properties as the seed-driven version targeted (`--color-bg`/`--color-surface`/
`--color-accent`/`--color-border`), same fixed `--color-text-primary`/`--color-text-muted`, in
`src/index.css`'s `:root` block:

```css
--color-bg: #12161a;
--color-surface: #1a2027;
--color-border: rgba(140, 190, 210, 0.14);
--color-accent: #5fc9dc;
```

Changing this later is genuinely low-overhead — no architecture to migrate, just these 4 values in one
place, since every component already consumes them via `var(--color-*)` rather than hardcoding colors.

## What was reverted

All of it, cleanly — `git revert` on `feature/theme-and-boxes`, confirmed `src/` byte-identical to the
pre-phase state:

- `src/utils/contrastRatio.ts` / `.test.ts` (WCAG contrast math)
- `src/utils/consoleTheme.ts` / `.test.ts` (the bounded HSL generation)
- `Tablet.tsx`'s theme wiring and its test coverage
- `Console.css`'s `color-mix()` re-derivation of `.console`'s glass translucency
- `index.css`'s theme-token comments and the global retransmit-crossfade transition rule
- The `SleeveContainer.css`/`PowerRockerSwitch` fix for the seed-color leak that was found and fixed
  mid-phase (both were inheriting seed-driven color despite being explicitly out of scope — see the
  git history on `feature/theme-and-boxes` if that bug class matters for a future attempt)
- `PaletteSample`, the dev-only debug overlay that showed the computed theme values live

## If this gets revisited later

The intent/spec/tasks docs (`docs/intent/console-theming.md`, `docs/specs/CONSOLE_THEMING.md`,
`docs/tasks/CONSOLE_THEMING.md`) are kept as a historical record of what was actually tried, bounds and
all — worth reading before re-attempting a seed-driven approach, so the same tension doesn't get
rediscovered from scratch. A few directions that weren't tried and might resolve the actual tension
(rather than just re-tuning the same bounds):

- Decouple safety from variety by construction — only constrain what's provably load-bearing (text
  sits on `surface`, not `bg`; `bg` itself may not need the same guarantee) instead of squeezing both
  tiers to protect fixed text everywhere.
- A curated-bucket hybrid: hash the seed to pick among a small hand-designed set of hue families,
  using the seed only for fine variation within the chosen family — deterministic and never
  hardcoded to one look, but a person vets the floor of what's possible instead of trusting math to
  always land somewhere decent.
- Apply the seed as a subtle tint/overlay on a static base rather than a full independent HSL
  derivation — "reacts to the seed" stays true with a much smaller chance of landing somewhere bad.

## Oblique Cabinetry (Phase 11.1.1 — Foundation & Button)

The Oblique Cabinetry system (roadmap [11.1.1](roadmap/roadmap.md#1111-oblique-cabinetry-foundation--button))
gives interactive primitives a 2.5D "physical switch" identity — flat at rest, extruding toward the
viewer when active. Its face-shading consumes this doc's **current, static** "Ballast" tokens
(`--color-accent`/`--color-surface`, `src/index.css`) directly — not the seed-driven tokens the
original combined draft assumed before Phase 11 was cut (see above). Full derivation:
[docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md](specs/OBLIQUE_CABINETRY_FOUNDATION.md).

**The projection vector.** "2px right for every 1px down" is a standard oblique/cabinet-projection
depth axis. A cabinet box's front face sits flush with its resting footprint at rest and slides along
that fixed `(2, 1)` vector as it pops fully toward the viewer: `frontFaceOffset = (2·D·t, D·t)` for pop
progress `t ∈ [0, 1]`, where `D` is `CABINET_POP_DISTANCE` (`src/utils/cabinetGeometry.ts`) — a fixed
distance, deliberately *not* scaled by the box's own height `H` (the original design scaled the offset
with `H`, 2×height/height, which read as far too much protrusion once actually seen rendered at the
40/48px tiers — corrected after a real visual pass, not a theoretical concern). `D` itself has been
tuned by feel more than once since that initial correction — this doc intentionally doesn't restate its
current numeric value; `cabinetGeometry.ts` is the one source of truth for that. Every breakpoint pops
the same fixed `(2D, D)` distance at `t = 1`; only the box's own footprint height `H` still varies by
tier. The Top Face and Left Face walls are parallelograms connecting the *stationary* footprint edge to
the *current* position of the front face's corresponding edge — at `t = 0` both collapse to zero-area
(flat, side walls collapsed); at `t = 1` they're the fully-open walls of a box whose front face has slid
`(2D, D)` toward the viewer. `CabinetBox.css`'s reserved hit-area padding (`padding-right`/
`padding-bottom`) matches this fixed distance exactly, not `--cabinet-box-height` — the two are
independent measurements, and conflating them was the specific bug that fix corrected.
Implemented once as a pure function, `src/utils/cabinetGeometry.ts`'s `computeCabinetGeometry`, and
tweened by GSAP between its `t=0`/`t=1` outputs directly — the same polygon-`points`-attribute-tweening
technique `PowerRockerSwitch.tsx` already uses for its own rocker-switch faces, not a per-frame
recompute.

**Face-shading via `color-mix()`, not a JS module.** Reusing this doc's own §1.3 `color-mix()`
technique (above) rather than inventing a new one: `CabinetBox.css` derives the Top Face's lighter tint
and the Left Face's darker tint directly from `--color-accent` —

```css
.sc-cabinet-box__top-face  { fill: color-mix(in srgb, var(--color-accent) 100%, white 20%); }
.sc-cabinet-box__left-face { fill: color-mix(in srgb, var(--color-accent) 100%, black 25%); }
```

— Top Face lighter (overhead light), Left Face darker (shadowed side), the same convention
`PowerRockerSwitch.css`'s own side/edge faces already use. The front face's own background stays
`--color-surface`, unchanged from a flat button's today, and carries no `border-radius` — sharp
corners read as a cleaner match for the walls' own straight-edged parallelogram geometry than a
rounded front panel did. Only the walls, visible exclusively while popped, carry the accent-tinted
"active" cue via their fill — and, since the same visual pass, via a glow too (below).

**The pop-proportional glow.** The walls also glow — via `filter: drop-shadow(0 0 calc(var(--cabinet-glow,
0) * 20px) var(--color-accent))` on `.sc-cabinet-box__walls` — and the glow's intensity tracks exactly
how far the box has popped, not a separate on/off state. `--cabinet-glow` is a CSS custom property
tweened `0 → 1` by the *same* GSAP timeline (same `duration`/`ease`) that drives the pop offset itself
(`CabinetBox.tsx`), set on the shared wrapper `<div>` rather than the front face — the walls are the
front face's *sibling*, not its descendant, so only a common ancestor's custom property reaches both
via CSS inheritance. `drop-shadow`, not `box-shadow`, because the glow should follow the walls'
actual polygon silhouette (a parallelogram, not the walls SVG's own rectangular bounding box) — the
same reasoning that already ruled out `box-shadow` for the corner-rounding attempt that was tried and
rejected first (a `blur()`/`contrast()` "goo" filter on the walls, which read as too soft/melty at
this small a scale and was reverted before shipping). The glow is deliberately on the "back" (the
walls, which stay visually anchored to the stationary footprint) rather than the moving front face —
confirmed explicitly during design review, not an arbitrary choice.

**A new breakpoint concept, collapsed to one JS source.** Cabinetry introduces this app's first
viewport-width breakpoint tiers (mobile ≤640px / tablet 641–1024px / desktop >1024px, driving box
heights 32/40/48px) — nothing else in `src/` used one before. `src/utils/cabinetBreakpoints.ts` is the
sole source of truth, read via `useCabinetBoxHeight`'s `matchMedia`; `CabinetBox.tsx` applies the
resolved value (and, the same way, `cabinetGeometry.ts`'s `CABINET_POP_DISTANCE`) as inline
`--cabinet-box-height`/`--cabinet-pop-distance` custom properties on its own wrapper, and `CabinetBox.css`
reads them via `var()` rather than re-deriving either independently through its own `@media` rules —
that CSS-side duplication existed briefly, went stale in prose more than once as both values were
tuned by feel, and was collapsed away rather than guarded more carefully once a code review flagged it
as a real recurring pattern. Same "JS-owned value applied as an inline style" precedent `App.tsx`'s own
`realWorldGradient` already established in this codebase.

Status as of Foundation & Button (11.1.1): `CabinetBox` (the shared rendering primitive, including the
pop-proportional glow and sharp front-face corners above) and `Button` (its first real consumer) have
shipped and were confirmed against the real running app; `Toggle` and the 3 sliders (11.1.2–11.1.5)
have not yet. `CabinetBox` as it stands here — walls, glow, and all — is the reference every later
11.1.x item's own cabinet box should match, not just the geometry/face-shading fundamentals.
