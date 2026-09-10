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
tier. `CabinetBox.css` no longer reserves any hit-area padding for this popped-out distance — a later
change (2026-09-09) removed the `padding-right`/`padding-bottom` reservation entirely in favor of a
static backing layer (below); `Button`/`Toggle`'s hit area now ends at the box's flat resting
footprint, not the popped one.

**The walls, and why they're two `<div>`s, not SVG `<polygon>`s (2026-09-09).** The Top Face and Left
Face walls are, geometrically, parallelograms connecting the *stationary* footprint edge to the
*current* position of the front face's corresponding edge — at `t = 0` both collapse to zero-area
(flat, side walls collapsed); at `t = 1` they're the fully-open walls of a box whose front face has slid
`(2D, D)` toward the viewer. The original implementation rendered these as two SVG `<polygon>`s, tweening
their `points` attribute directly via GSAP — the same technique `PowerRockerSwitch.tsx` still uses for
its own rocker-switch faces. That turned out to have a real, felt cost: SVG attribute animation forces a
main-thread reflow/repaint every tick, while the front face's own `x`/`y` GSAP tween is a `transform` the
browser can run entirely on the compositor — under a `VoxelTrack` row's worth of boxes animating at once,
the walls visibly lagged behind the front face (the top wall reading as "filling in" after the facade had
already arrived).

Worked through algebraically, each wall parallelogram is exactly a plain rectangle at a **fixed** skew
angle — `atan(2) ≈ 63.435°` for the Top Face, `atan(0.5) ≈ 26.565°` for the Left Face, independent of `t`
or `D` — scaled along one axis by `t` itself (`CABINET_TOP_FACE_SKEW_DEG`/`CABINET_LEFT_FACE_SKEW_DEG`,
`src/utils/cabinetGeometry.ts`). The walls are now two plain `<div>`s: the skew is set once via
`gsap.set()` on mount and never animated, and only `scaleY` (Top Face) / `scaleX` (Left Face) tween —
using the pop progress directly as the scale value, no per-frame geometry computation at all. Everything
animated (front-face offset, both wall scales, the glow below) is now a compositor/custom-property write,
not an SVG attribute mutation. Full derivation and the empirical verification against GSAP's own
composition order: [docs/specs/OBLIQUE_CABINETRY_WALL_RENDERING.md](specs/OBLIQUE_CABINETRY_WALL_RENDERING.md).

The front-face offset itself is still implemented once as a pure function,
`src/utils/cabinetGeometry.ts`'s `computeCabinetFrontFaceOffset` (renamed from `computeCabinetGeometry`,
which used to also compute the now-retired wall polygon points), and tweened by GSAP between its `t=0`/
`t=1` outputs directly.

**Face-shading via `color-mix()`, not a JS module.** Reusing this doc's own §1.3 `color-mix()`
technique (above) rather than inventing a new one: `CabinetBox.css` derives the Top Face's lighter tint
and the Left Face's darker tint directly from `--color-accent` —

```css
.sc-cabinet-box__top-face  { background-color: color-mix(in srgb, var(--color-accent) 100%, white 20%); }
.sc-cabinet-box__left-face { background-color: color-mix(in srgb, var(--color-accent) 100%, black 25%); }
```

(`background-color`, not SVG's `fill` — the walls are `<div>`s now, see above.)

— Top Face lighter (overhead light), Left Face darker (shadowed side), the same convention
`PowerRockerSwitch.css`'s own side/edge faces already use. The front face's own background is
`--color-surface` by *default* — the box's own material when it carries no text (`Toggle`'s bare
box, every `VoxelTrack` box) — and carries no `border-radius` — sharp corners read as a cleaner
match for the walls' own straight-edged parallelogram geometry than a rounded front panel did.
`Button.css` overrides its own front face to `--color-accent` specifically (2026-09-09), since it
carries real text (`DualLabel`) and reads as the "live" surface; every other consumer keeps the
`--color-surface` default. Only the walls, visible exclusively while popped, carry the
accent-tinted "active" cue via their fill — and, since the same visual pass, via a glow too
(below).

**The pop-proportional glow.** The walls also glow — via `filter: drop-shadow(0 0 calc(var(--cabinet-glow,
0) * 20px) var(--color-accent))` on `.sc-cabinet-box__walls` — and the glow's intensity tracks exactly
how far the box has popped, not a separate on/off state. `--cabinet-glow` is a CSS custom property
tweened `0 → 1` by the *same* GSAP timeline (same `duration`/`ease`) that drives the pop offset itself
(`CabinetBox.tsx`), set on the shared wrapper `<div>` rather than the front face — the walls are the
front face's *sibling*, not its descendant, so only a common ancestor's custom property reaches both
via CSS inheritance. `drop-shadow`, not `box-shadow`, because the glow should follow the walls'
actual rendered silhouette (a parallelogram, not the walls wrapper's own rectangular bounding box) — the
same reasoning that already ruled out `box-shadow` for the corner-rounding attempt that was tried and
rejected first (a `blur()`/`contrast()` "goo" filter on the walls, which read as too soft/melty at
this small a scale and was reverted before shipping). The glow is deliberately on the "back" (the
walls, which stay visually anchored to the stationary footprint) rather than the moving front face —
confirmed explicitly during design review, not an arbitrary choice.

**The static backing layer and opacity fade (2026-09-09).** A new `.sc-cabinet-box__backing` —
always fully opaque, never transformed, sized to exactly the wrapper's own flat footprint —
sits behind the walls and front face (DOM order: backing, walls, front). As `--cabinet-glow`
tweens `0 → 1`, the walls (not the front face — it stays fully opaque so its real content/label
stays legible) also fade from fully opaque toward 50% opacity, on the same tween driving the glow
and pop offset. The effect: the box's own static, accent-tinted material visibly shows through
behind the walls as they pop and glow, rather than the wrapper reserving layout room to contain
the popped extent — this is what replaced the reserved hit-area padding described above.
Confirmed via `/interview-me`, 2026-09-09 — full rationale:
`docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md § 1.6`'s post-implementation correction.

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
shipped and were confirmed against the real running app. `Toggle` (11.1.2) and `SliderLinear`
(11.1.3, below) have since shipped too; `SliderLog`/`SliderCenteredZero` (11.1.4/11.1.5) have not yet.
`CabinetBox` as it stands here — walls, glow, and all — is the reference every later 11.1.x item's own
cabinet box should match, not just the geometry/face-shading fundamentals.

## Voxel-track sliders (Phase 11.1.3 — SliderLinear)

`SliderLinear`'s traditional track+handle is replaced by `VoxelTrack`
(`src/components/ui/controls/VoxelTrack.tsx`) — a row (horizontal) or bottom-to-top column (vertical)
of uniform `CabinetBox` facades, `32×32px`/`40×40px`/`48×48px` at the same mobile/tablet/desktop tiers
`CabinetBox`'s own height uses, spaced `8px`/`10px`/`12px` apart (`CABINET_VOXEL_GAP`,
`src/utils/cabinetBreakpoints.ts`). Box size and gap are fixed per tier; box **count** is not — it's
fitted live to whatever space the slider's container actually gives it (below), never authored per
schema or held to one flat constant. All 3 voxel-track sliders have now shipped: `SliderLog` (11.1.4)
reuses this section's mechanism unchanged, feeding only its own value→`t` curve into the same
`computeVoxelBoxStates`; `SliderCenteredZero` (11.1.5) is a genuine adaptation, not a drop-in — see
"Zero-anchored dual-fill" below. `SliderLinear` and `SliderLog` share the
`boxSize`/`gap`/`boxCount`/`trackLength`/`rootStyle` glue itself via one hook, `useVoxelTrackSlider`
(`src/components/ui/controls/`), rather than each carrying its own copy; `SliderCenteredZero` calls the
same hook with its own additional `forceEven` option (below). Full derivation:
[docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md](specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md),
[docs/specs/OBLIQUE_CABINETRY_SLIDER_LOG.md](specs/OBLIQUE_CABINETRY_SLIDER_LOG.md), and
[docs/specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md](specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md).

**Self-fitting box count.** `useVoxelTrackBoxCount` (`src/components/ui/controls/`) measures available
space via `ResizeObserver` and feeds `voxelTrackMath.ts`'s `computeFittedBoxCount(availableLength,
boxSize, gap)`, which floors to the largest box count that fits without overflowing, clamped to a
`VOXEL_TRACK_MIN_BOX_COUNT` of `3` — a container too narrow even for 3 boxes at the current
breakpoint's size clamps to 3 and scrolls, rather than shrinking boxes below their fixed size.
Horizontal observes the slider's own rendered element directly (`.sc-slider-linear` is a plain block
box whose width is externally determined, so self-observation carries no feedback-loop risk); vertical
observes the parent, following `useAutoSliderOrientation`'s existing convention, **except** when the
caller omits `verticalHeight` — a live parent measurement there is genuinely circular for any container
whose own height auto-sizes to its content (the parent's height depends on this slider's rendered
height, which depends on measuring that same parent — found live as an infinite resize loop). In that
case `SliderLinear.tsx` fits against the fixed `VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT` (256px, matching
`--slider-vertical-height`) instead of measuring at all.

A `computeVoxelTrackTrailingReserve(axis)` reserve (horizontal only — `2 × VOXEL_TRACK_POP_DISTANCE`)
is subtracted from the available length before fitting a box count, then added back on top of
`computeVoxelTrackLength`'s tight result when sizing `Slider.Root` — otherwise a container whose width
happened to land on an exact multiple of `(boxSize + gap)` left no slack for the last (nearest-max)
box's own pop-out bleed, visibly overflowing at value === 100% (found live for Limiter/Tempo/Automatic
Effects).

**Dual-fill value readout.** Boxes are indexed `0` (nearest min) through `boxCount - 1` (nearest max) —
Radix's own horizontal min-at-left / vertical min-at-bottom convention. `voxelTrackMath.ts`'s
`computeVoxelBoxStates(value, min, max, boxCount)` locates the *straddling* box — the one representing
the slider's exact current value — and returns, per box, a `fillPercent` (0–100) and `popT` (0–1) fed
straight into `CabinetBox`'s `popped` prop (widened from `boolean` to `boolean | number` for exactly
this purpose). Every box below the straddling one renders fully filled (`fillPercent: 100`, `popT: 1`);
every box above it renders fully empty (`fillPercent: 0`, `popT: 0`); the straddling box itself carries
the local fractional percentage within its own slot. A dedicated `isStraddling` flag identifies that one
box explicitly — `popT` alone can't, since every filled box is *also* `popT: 1`, not just the straddling
one (found live as the root cause of every filled box briefly taking the two-piece straddle rendering
path below, each carrying a hidden always-0-width partner). `computeVoxelFillBackground(fillPercent,
axis)` renders each box's front face as solid `--color-accent` (100% filled), solid `--color-surface`
(0% filled), or — for the straddling box only — a hard-stop (not blended) two-color `linear-gradient`
split at the exact fill percentage.

**The straddling box is two adjacent `CabinetBox`es, not one.** Rather than a single box rendering an
internal gradient split, the straddling slot is a fully-popped glowing piece (the filled/min side) and a
fully-flat dark piece (the empty/max side), flush against each other and always summing to exactly the
row's normal `boxSize` — matching how a normal fully-filled or fully-empty box already renders
elsewhere in the row, rather than a third visual language for "partially filled." The glow piece's size
is `boxSize × computeVoxelStraddleSizeFraction(fillPercent)`, floored at `VOXEL_STRADDLE_MIN_SIZE_FRACTION`
(`0.1`) so it never fully disappears at value === min; the flat piece is always the exact remainder
(`boxSize - glowSize`, never independently derived), and legitimately shrinks to zero at value === max —
a fully-popped box at the maximum, with no flat sliver, is correct.

**Extrusion-falloff is a fixed per-row-position ceiling, not fill-relative.** Each box's own maximum pop
distance — `computeVoxelBoxPopDistance(index, boxCount)` — interpolates linearly from
`VOXEL_TRACK_POP_DISTANCE_MIN_RATIO` (`0.125`) of `VOXEL_TRACK_POP_DISTANCE` (`8`, `cabinetGeometry.ts`
— deliberately larger than `Button`/`Toggle`'s own `CABINET_POP_DISTANCE`, since a full row of many
boxes read as too subtle at that smaller distance) at box `0` (nearest min) up to the full
`VOXEL_TRACK_POP_DISTANCE` at the last box (nearest max) — fixed by each box's own position in the row,
never by which box currently happens to be popped. An earlier version tapered pop distance relative to
how much of the track was filled (`i / straddlingIndex`), which let a box near the minimum reach full
pop distance the moment it became the straddling box at a low value — corrected after review to depend
only on fixed row position.

**Paint order.** Because every popped box's walls bleed along the same fixed `(2, 1)` oblique vector
(right and down) regardless of axis, `computeVoxelBoxZIndex(index, boxCount, axis)` orders boxes so one
whose walls bleed into a neighbor's space paints *over* that neighbor: horizontal z-index descends as
index rises (box 0, leftmost, always wins), vertical z-index ascends as index rises (the topmost/
highest-index box, per the column's own `column-reverse` layout, always wins) — "up/left of a neighbor"
outranks "down/right of it" in both cases.

**Straddle-boundary remounts don't replay the mount flourish.** Every `CabinetBox` `VoxelTrack` renders
gets a `skipMountAnimation` prop: because the box at the straddling index changes React element shape
(plain box vs. the two-piece straddle wrapper) every time the straddling index moves, React remounts it
at the same key — without the flag, `CabinetBox`'s own "animate in from the opposite state" first-mount
behavior (correct for `Button`/`Toggle`, where a mount is a genuinely new element) replayed a full
flat↔popped tween with no real transition behind it, a spurious wall flash on every value change that
crossed a box boundary.

**Vertical wall height/anchor fix (Phase 11.1.5.1/11.1.5.2, found live via manual verification).**
`CabinetBox`'s `left-face` wall used to hardcode its `height` to the full square `boxHeight`, regardless
of `frontHeight` — correct for the horizontal axis (only `frontWidth` shrinks there, and the top-face
wall already tracks the front's real width via live `ResizeObserver` measurement) but wrong for a
*vertical* straddle box, whose two pieces shrink via `frontHeight` instead. The wall stayed full-size
and, anchored `top: 0` to its own wrapper — which the straddle layout below already sizes correctly to
`frontHeight` — visibly overflowed past that wrapper and, as the dragged value changed `frontHeight`,
read as sliding up/down rather than shrinking in place. Fixed by sizing the wall to `frontHeight ??
boxHeight` directly: no live measurement needed here, unlike the top-face's width, since `frontHeight`
is already the caller's own known synchronous value (the same one already applied to the front face's
own inline height). Once the wall matches its wrapper's real box, the flex packing that was already
correct (`column-reverse`, the glow piece flush against the track's fixed min edge, the flat piece flush
against the fixed max edge, no gap between them) does the rest for free — each wall now reads as
anchored at its own side's fixed track edge, shrinking from the seam as the value moves. Verified live
against every real vertical consumer: `SliderLinear`'s per-layer Gain/Phase/Interval
(`robotOptionsConfig.ts`) and `SliderLog`'s Filter Frequency/Resonance (`audioRigConfig.ts`). Because the
fix lives in shared `CabinetBox`, it also resolved the identical bug for `SliderCenteredZero`'s vertical
straddle boxes — see "Zero-anchored dual-fill" below. `useVoxelTrackBoxCount.ts`'s own vertical
parent-observation conservatism was checked against these same real consumers and confirmed to already
read correctly as shipped — no self-observation fix needed there.

## Zero-anchored dual-fill (Phase 11.1.5 — SliderCenteredZero)

`SliderCenteredZero` (Detune, EQ3 Low/Mid/High, LFO Rate/Depth Drift) is the one voxel-track slider
whose fill can grow in either of two directions — toward `min` or toward `max` — depending on which
side of zero the current value sits on, which the section above's single min-anchored scan
(`computeVoxelBoxStates`) has no way to express. Rather than generalize that function in place,
`voxelTrackMath.ts` adds a sibling, `computeVoxelBoxStatesCenteredZero(value, min, max, boxCount)`.

**A fixed dead-center seam, not the schema's own proportional zero point.** The row splits into two
independent halves at `Math.floor(boxCount / 2)` — never at `zeroPointPercent`'s general, asymmetric-
bounds-aware formula (`(0 - min) / (max - min)`, the pre-Cabinetry math this component used to compute
and no longer does). Every real schema shipped is symmetric anyway, so a proportional seam and a
dead-center one already coincide for every live consumer today; the simplification exists to guarantee
the seam always lands exactly on a box boundary, never inside one, regardless of how asymmetric a
future schema's bounds might be.

**Box count is forced even.** Because the seam must sit exactly between two boxes, box count can never
be odd for this slider — `useVoxelTrackSlider`'s opt-in `forceEven` option rounds the fitted count down
to the nearest even number via `computeEvenBoxCount`, floored at a new `VOXEL_TRACK_MIN_BOX_COUNT_EVEN`
of `4` (2 boxes per side) rather than the odd `VOXEL_TRACK_MIN_BOX_COUNT` of `3` used above. `SliderLinear`/
`SliderLog` never pass this option, so their own fitting is completely unaffected.

**Each side reuses `computeVoxelBoxStates`, not a second fill formula.** The positive side needs no
remapping — its own conceptual index `0` (fills first, at any small magnitude) is already the box
nearest the seam. The negative side's conceptual index `0` must land at the *highest* global index on
that side instead (nearest the seam, not nearest `min`) — computed against the side's own magnitude
(`-value`, `0`, `-min`) and then reversed before assembly. Only the side matching the value's sign is
ever computed with real fill; the other renders every box flat. At `value === 0` exactly, **both**
sides are flat — no straddling box, no minimum-visibility marker — matching how a flat/recessed box
already reads as "off"/neutral elsewhere in Cabinetry (`Toggle`'s own off state).

**Extrusion-falloff is also per-side**, ramping shallow at the seam to full depth at each side's own
physical end — the same shape the section above describes, just re-keyed per side rather than to the
whole row. This required one small, additive extension to shared infrastructure: `VoxelBoxState` gained
2 new optional fields, `popDistanceLocalIndex`/`popDistanceLocalCount`, and `VoxelTrack.tsx` prefers
them over a box's real row index/length when present. `SliderLinear`/`SliderLog`'s own
`computeVoxelBoxStates` output never sets either field, so their whole-row falloff is byte-for-byte
unaffected. Paint order (`computeVoxelBoxZIndex`) is untouched and uses the box's real global index/
row length regardless — it's purely a function of screen adjacency along the fixed oblique vector, not
which side of the seam a box belongs to; giving it a per-side scale too would break paint order exactly
at the one boundary that matters (the negative side's seam-adjacent box needs a *higher* global z than
its positive-side neighbor to correctly paint over it, which a per-side-local z-index couldn't express).

Full derivation: [docs/specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md](specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md).

**Vertical wall height/anchor fix (Phase 11.1.5.3).** `SliderCenteredZero`'s straddle pieces hit the
same `left-face` wall bug described in "Voxel-track sliders" above — same shared `CabinetBox` root
cause, fixed there once for all three sliders. Checked separately here because this slider's straddle
rendering also carries its own `flipStraddleFill` CSS `order`-swap (the negative side's filled piece
renders on the seam side, not the min side). Confirmed against real vertical consumers (EQ3 Low/Mid/High,
per-layer Detune) that `flipStraddleFill`'s fill placement is still correct on a real `column-reverse`
render — no correction needed there, only the shared wall-height fix above.
