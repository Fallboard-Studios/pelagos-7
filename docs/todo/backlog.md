# Backlog

Tracks todos, bug fixes, and cleanup items that aren't part of a roadmap phase — either
surfaced by a `/code-review-and-quality` pass (or similar) on unrelated feature work, or
raised directly by Crawford as a smaller idea that doesn't warrant its own roadmap phase.
Distinct from `docs/todo/roadmap.md`, which tracks features/phases with their own
Create/Restructure/About/Docs shape.

Not a spec — this is a review-output backlog. Each item gets its own `/interview-me` or
spec pass (as warranted by its size) when picked up; check it off here once merged. Not
itself one of CLAUDE.md's Reference docs.

See also [docs/DUPLICATE_VALUE_AUDIT.md](DUPLICATE_VALUE_AUDIT.md) — a dedicated sibling
backlog for one specific bug class (independently-declared duplicate values) rather than a
duplicate of this doc.

## Open items

### 1. Header Nav: Single-Instance Responsive RadioButton

Found during `/code-review-and-quality` on the Header & Hub Consolidation work
(2026-09-12). Moved here from roadmap item 14 (2026-09-11) — not a correctness bug, no
other Header work in flight, and no urgency; queued until something else legitimately
touches Header's layout so the CSS-restructuring risk gets amortized into work already
happening.

`Header.tsx` currently renders the nav `RadioButton` group twice — `.primary` (inside
`.header__row--status-nav`, shown ≥430px) and `.secondary` (its own row, shown below that)
— both fully mounted at all times, CSS `display: none` hiding whichever doesn't apply for
the current breakpoint. This duplication was the root cause of a real bug (fixed via
`useId()` in `RadioButton.tsx`, `bug/header-radio-fix`): two simultaneously-mounted
instances of the identical `HEADER_NAV_SCHEMA` collided in the shared, module-level
`timelineMap`, one instance's GSAP tween killing the other's mid-animation. `useId()`
stops the collision but doesn't remove the duplication itself — every render still carries
two full `CabinetBox` trees (6 backing/wall/front DOM nodes, 6 `ResizeObserver`s, 6 sets of
mouse listeners) for a control only ever visually needed once.

Not a correctness bug on its own — today's `useId()` fix already makes the duplication
safe. A standing architecture/performance cost worth removing rather than living with
indefinitely, and a precedent worth not repeating the next time a control needs to
reposition responsively.

**Fix shape (not yet built):** restructure so a single `RadioButton` instance can occupy
either visual position depending on breakpoint — e.g. reshape the surrounding layout so
both target positions are named areas of one shared CSS Grid the single instance moves
between, rather than duplicating the component tree. `.rocker-spacer` (holding `.primary`)
and the top-level `.secondary` row sit at different DOM nesting depths today, not siblings
in one grid — scope that restructuring before starting. A JS/media-query conditional swap
was considered and rejected: it would remount the `RadioButton`'s 3 `CabinetBox` trees on
every breakpoint crossing (worse than today's always-mounted-but-hidden state) and
reintroduces the JS-driven responsive layout `Header.css`'s own top comment says this file
deliberately moved away from. Some groundwork already sits unused in `Header.css`:
`.header__row--nav`/`.header__row--status`/`.header__row--volume` already declare a
`grid-area`, currently inert since no ancestor is `display: grid` — likely a leftover from
an earlier grid-based layout attempt, and a plausible starting point for the real fix.
`Header.test.tsx`'s "renders 3 nav options, once per responsive nav group (.primary +
.secondary)" assertion will need to become "once" when this ships.

### 2. Power-On Animation: Fix Dead Selectors, Reuse powerController

Originally opened as roadmap item 13 (2026-09-11); moved here in the same cleanup that
moved item 1 — a one-file bug/reuse fix isn't roadmap-phase-shaped in retrospect, and
Crawford confirmed both of the roadmap's original stray review-finding items should live
here instead, not occupy phase numbers.

**Status:** ☑ fixed — shipped on `main`, PR #454 (2026-09-11).

Found during `/code-review-and-quality` on the Header & Hub Consolidation work.
`PowerRockerSwitch.tsx`'s `handlePowerOn()` hand-rolled its own inline GSAP wake-up
timeline instead of calling the existing `powerController.powerOnSequence()`; folded
together, dropping a `requestAnimationFrame` deferral that turned out not to be
load-bearing for anything once the dead animation below was removed. Also: both the
inline copy and `powerAnimations.ts`'s own `playTabletPowerOn`/`playTabletPowerOff`
targeted `.transport-bar__displays`/`.transport-bar__btn`, selectors deleted along with
`TransportBar` in the Header & Hub Consolidation work — silently a no-op ever since.
Removed the dead animation entirely (`powerAnimations.ts` deleted) rather than
retargeting at `Header`, confirmed with Crawford rather than assumed. Added test coverage
for `powerController.powerOnSequence()`/`shutdownWithAnimation()`, which had none before.

### 3. Onload: Better Power-Off Background

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Low priority. Today, powering
off shows nothing but the static sleeve shell + rocker switch — no distinct background
art. Crawford wants to swap in something more considered, possibly one of his own
abstract paintings. Pure asset + `background` CSS swap on `SleeveContainer.css` — no
architecture impact. Blocked on Crawford supplying the artwork.

### 4. Onload: Power-Off Intro Text

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Medium priority. Today, powering
off shows nothing but the static sleeve shell + rocker switch (`SleeveContainer.tsx` has
no off-state content at all) — a new user gets no explanation of what powering on will
do. Needs a small text block added to the off-state UI, plus actual copy explaining what
happens on power-on. Content not yet written; a placeholder can stand in until Crawford
has final copy.

### 5. Onload: Sleeve Logo

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Medium priority.
`SleeveContainer.tsx` already renders a placeholder text wordmark ("PELAGOS",
`SleeveContainer.tsx:20`) in the non-power-switch sleeve variant. Crawford wants a real
image logo, bottom-right — open question whether it replaces the text wordmark or sits
alongside it. Blocked on Crawford finalizing a project name/logo.

### 6. Helper Text on Inputs (Info Icon)

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Very low priority — mainly
blocked on the amount of content (a blurb per control) needed, not on technical
complexity. `ControlSchema` (`src/types/controls.ts`) has no helper/hint-text field
today. Concept: a small "i"/"?" icon per control that reveals a short blurb about what it
does on tap/hover. Deliberately scoped small (Crawford's own call) rather than a
schema-wide addition touching all 14 primitives.

### 7. Sector Settings: AS/Coords/Favorites Reorganization

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Medium priority. Today's
`ATTENUATION_STYLE_PRESETS` (`sectorSettingsConfig.ts`) is what Crawford means by
"favorites" — same concept, different name; not a new feature so much as a reframing
plus a data refresh. Crawford has been separately keeping his own list of good
Attenuation Style + coordinate combinations; once Session Storage's (roadmap Phase 19)
saving/sharing lands, he wants to update the in-app preset list with current, shareable
links, alongside reorganizing how AS/coordinates/presets are laid out in the Sector
Settings panel. Depends on Session Storage (Phase 19) for the "shareable link" half.

### 8. Audio: Groove Feature

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Low priority — deprioritized
behind launch. A new mechanic: a "groove" value that raises the odds of robots syncing
their rhythm to other robots while docked/recharging. Would touch `robotSystems.ts`'s
docking logic and melody/rhythm generation. Not yet scoped — open question is whether
"groove" is a single global dial (e.g. a Sector Settings or Audio Rig control) or a
per-robot/per-locale value.

### 9. Audio: More Chord Progressions + Selection UI

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Low priority — deprioritized
behind launch. Today `HARMONY_PALETTES` (`harmonySystem.ts`) is a fixed, hardcoded
12-entry array cycled automatically with no user-facing selection at all. Adding more
palettes is straightforward; adding a way to choose them is the real feature — needs a
new UI control, location not yet decided (Sector Settings vs. Audio Rig are the likely
candidates).

### 10. Visuals: Job Animations

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Medium priority — deprioritized
behind launch. `JobType` (`Robot.ts`, see `docs/ROBOT_LIFECYCLE.md`) exists and is shown
as data/text (`RobotSelectionCard`, `RobotDisplaySection`), but nothing in the
actor-rendering layer visually differentiates a robot by its current job today. Genuinely
new visual work; not yet scoped.

### 11. Visuals: Better Building Details

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Low priority — deprioritized
behind launch. Factories already have a real system to extend (`docs/BUILDING_DESIGN.md`:
silhouette base + rooftop greebles + seeded facade/window/color variation) — scope is
more likely additional greeble/variant variety within that existing system than a
structural change, but not yet confirmed with Crawford.

### 12. Visuals: Atmospheric Animations

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Medium priority — deprioritized
behind launch. No weather/atmosphere/particle system exists in `WorldView` today — this
would be genuinely new (fog, dust, light rays, precipitation, or similar — not yet
specified). Not yet scoped.

### 13. Visuals: Small Immersion Animations

Requested by Crawford (`docs/todo/temp.md`), 2026-09-11. Low priority — deprioritized
behind launch. Likely a grab-bag of minor polish (idle bobs, blinking lights, and similar
small touches) rather than a single feature; exact list not yet defined.

### 14. Header: Selects Whole Locale Object for Coordinates Only

**Status:** ☑ fixed — committed on `perf/rerender-cleanup` (`10ad07f`), not yet merged to
`main`.

Found via a manual re-render-bug sweep on `perf/rerender-cleanup` (2026-09-14), searching
the codebase for the same two anti-patterns that branch's own commits already fixed
elsewhere: whole-object/array Zustand selectors, and unrounded `ResizeObserver`
measurements feeding state. High confidence, high impact.

`Header.tsx:140` — `useLocaleStore((s) => (currentLocaleId ? s.locales[currentLocaleId] :
undefined))` — selects the entire locale object, but the only read (`Header.tsx:177`) is
`currentLocale?.coordinates?.x/.y`. This is the exact bug already fixed in
`SectorSettingsDrawer` (`ef10d99`, same branch, same store) — missed here. `Header` is
always mounted, so it re-renders on every mutation to the current locale: every robot
battery/job/docking update, every measure tick, everything.

**Fix shape:** select `coordinates` directly, same pattern as the `SectorSettingsDrawer`
fix — `useLocaleStore((s) => (currentLocaleId ? s.locales[currentLocaleId]?.coordinates :
undefined))`.

### 15. LocaleView: Selects Whole Locale Object for an Existence Check

**Status:** ☑ fixed — committed on `perf/rerender-cleanup` (`b810b7a`), not yet merged to
`main`.

Found in the same sweep as item 14 (2026-09-14). High confidence.

`LocaleView.tsx:15` — `const locale = useLocaleStore((s) => s.locales[localeId]); if
(!locale) return null;` — `locale` is never read again; `OceanScene` re-derives its own
`localeId`/robots/actors independently rather than receiving them from `LocaleView`.
Selecting the whole object means this component re-renders on every locale mutation just
to answer "does it still exist."

**Fix shape:** `const localeExists = useLocaleStore((s) => localeId in s.locales); if
(!localeExists) return null;`.

### 16. useVoxelTrackBoxCount: Unrounded ResizeObserver Measurement

**Status:** ☑ fixed — committed on `perf/rerender-cleanup` (`6a83cb2`), not yet merged to
`main`.

Found in the same sweep as item 14 (2026-09-14). High confidence, wide blast radius —
this hook backs the voxel-track box-count fitting for sliders app-wide (`SliderLinear`,
`SliderLog`, etc.).

`useVoxelTrackBoxCount.ts:76-79` — `const { width, height } = entries[0].contentRect; ...
setMeasuredLength((prev) => (prev === next ? prev : next));` compares a raw sub-pixel
float for equality. Same shape as the pre-fix `CabinetBox` bug (`528c77b`/`9fbcb7d`): real
browser sub-pixel layout rounding can report a fractionally different measurement across
consecutive observations of the same rendered size, so the bail-out never catches and
`setMeasuredLength` fires (and `computeFittedBoxCount` recomputes) on every jitter with no
real resize.

**Fix shape:** `Math.round()` the measurement before the compare, same as `528c77b`/
`9fbcb7d`.

### 17. Header: Unconditional Unrounded ResizeObserver Write to CSS Var

Found in the same sweep as item 14 (2026-09-14). **Status: checked live, does not
reproduce — closing, not worth fixing.**

`Header.tsx:93-96` — `const observer = new ResizeObserver((entries) => {
document.documentElement.style.setProperty('--header-height',
`${entries[0].contentRect.height}px`); });` — same unrounded-measurement family as items
14/16, different mechanism: writes straight to a global CSS custom property on every
observation, with no equality bail-out at all (not even an unrounded one). Confirmed
`--header-height` does feed a real layout property (`margin-top` in `Console.css`), so the
theoretical concern was sound — but a live check (temporary `console.log` in the observer
callback, checked by Crawford 2026-09-14) showed it fires exactly once on mount and stays
silent while idle, no repeated jitter. Whatever sub-pixel noise affects `CabinetBox`/
`useVoxelTrackBoxCount` doesn't manifest on Header's own root element in practice. No fix
needed unless it starts reproducing under different conditions (e.g. window resize,
responsive breakpoint crossing) — not verified either way for those, only idle-after-load.

### 18. AudioRigDrawer: Whole-Object globalAudio/globalLfo Selects

**Status:** ☑ fixed and live-verified — committed on `perf/rerender-cleanup` (`39b97d1`),
not yet merged to `main`. Re-checked live with the Profiler's "What caused this update?"
panel (2026-09-14, Crawford): a post-fix commit during an audioSwells tick shows only
`AudioRigEffectPanel key="eq3"` and `key="filterHPF"` re-rendering (6.2ms total) — every
other effect panel (compressor, limiter, delay, reverb, filterLPF) correctly sat still.
Confirms the fix works exactly as designed.

Confirmed live (2026-09-14, Crawford, React DevTools "highlight updates") — worse than
originally scoped. High confidence, high impact.

`AudioRigDrawer.tsx:228-229` — `const globalAudio = useAudioStore((s) => s.globalAudio);
const globalLfo = useAudioStore((s) => s.globalLfo);` — whole-object selects at the
container level for the entire Audio Rig. Originally scoped as "re-renders the whole
drawer on a slider drag"; the live check showed it's actually continuous — with the drawer
open and completely idle (no interaction at all), every panel (Transport & Composition,
EQ & Filters, Time & Space, Output) and every `CabinetBox`/slider under them lights up
repeatedly. Root cause: several background processes tick `globalAudio`/`globalLfo` on
their own even with nothing touched — `audioSwells.ts`'s 16n modulation ticks, LFO drift,
ping variance automation — and each one replaces the whole top-level object, which this
whole-object selector turns into a full-subtree re-render every time, for as long as the
drawer stays open.

**Fix shape:** per-effect (and likely per-LFO-target) selector hooks used directly inside
each child panel instead of hoisted to the container and prop-drilled — e.g. each effect
panel calls `useAudioStore((s) => s.globalAudio.eq3)` itself rather than receiving a slice
of a container-level `globalAudio`. Exact scope (per-effect vs. needing to go finer, to
per-param, for effects whose own sub-object changes together frequently) not yet
determined — a Profiler recording identifying exactly which ticking process(es) are
driving this and at what frequency would help size the fix before starting.

### 19. IdleSystem: console.warn Fires on the Ordinary Case, Not an Error

Found while checking item 17's console output live (2026-09-14) — Crawford flagged the
console as overwhelming on load; this is one concrete, fixable source. Low risk, high
noise reduction.

`Robot.tsx:66` calls `handleRobotIdle()` unconditionally on every robot's mount (with
`isReturning: true`, to land its first on-screen destination in the bottom half — see the
comment above that call). `idleSystem.ts:117` only proceeds past its guard when that robot
is already `Idle`+`Active`; anything else — including `docked`, the state most robots
actually spawn in — hits `console.warn('[IdleSystem] Robot ... not found or not
Idle/Active ...')` and returns early. Since most robots spawn docked, this warns on the
*ordinary, expected* path for 10 of 12 robots on every locale load, and again on every
state transition. React's dev-mode component-stack-on-warn feature turns each one into a
large internals dump, dominating the console on load and during normal play.

Not a functional bug — the guard's early return is correct — purely a log-level/hygiene
problem: an expected, common precondition-not-met is logged as a warning.

**Fix shape:** drop the log entirely, or narrow it to only the case that's actually
unexpected (`!robot` — robot missing from the store) rather than every non-Idle/Active
state.

### 20. SVG: Invalid Empty `y` Attribute at Load

Found in the same console check as item 19 (2026-09-14). Confirmed real, not yet traced to
a source.

Browser-logged twice on every load: `Error: <svg> attribute y: Unexpected end of attribute.
Expected length, "".` — something renders an SVG element with `y=""` (empty string) where a
number/length is expected. Likely in robot or actor SVG rendering, given when it fires
(right after `[AudioEngine] Started`, alongside initial robot/actor spawn), but not yet
isolated to a specific component or call site.

**Fix shape:** not yet determined — needs tracing (search for `y=` bindings in
robot/actor/factory SVG components fed by a value that can be `''`/`undefined`/`NaN`
before its source data is ready).

### 21. Factory: Every Instance Re-renders Once/Sec for Day/Night Lighting

Found while live-verifying item 18 (2026-09-14, Crawford + React DevTools Profiler,
Ranked view) — confirmed via two profiler samples exactly ~1s apart, both showing the
identical pattern. High confidence, high impact, continuous (not one-off). Architecturally
different from items 14-18 — not a whole-object-selector bug, and narrowing the selector
further won't fix it.

`Factory.tsx:108` — `const localTime = useUIStore((s) => s.activeLocaleLocalTime ?? 12);`
— every single `FactoryInner` instance (all ~36 factories in a locale) independently
subscribes to this value to compute its own day/night lighting (`getLighting(cycleMeasure)
.eastL/.westL` — sun-facing vs. shadow-side brightness). `AttenuationStyleView.tsx:46`
ticks it via `setInterval(tick, 1000)` — correctly a real wall-clock second, not
BeatClock/musical timing, so no CLAUDE.md scheduling violation there.

The selector itself is already about as narrow as possible (a single primitive). The cost
is structural: ~36 factories all recomputing real work (`getLighting`, `shiftHSL`,
`applyColorShift`, greeble rendering) in the same second, each taking 2-9ms, summing to
~150ms of main-thread work once every second, indefinitely, for as long as the world view
is open. `Factory`'s own `React.memo` (line 313) can't help — memo only blocks a
re-render caused by a *parent* passing unchanged props; it does nothing when a component's
own store subscription changes, which is what's happening here (all 36 instances change
"at once" because they all read the same tick).

**Decision (2026-09-14, Crawford):** going with (a) below, not the cheaper (c) — Crawford
confirmed a full in-game day cycle takes ~6 real minutes today (96 measures @ current BPM),
which would make (c) (throttling the 1000ms tick — the fills already CSS-transition, so a
slower tick would likely read as visually smooth) a cheap, low-risk, mostly-sufficient fix
on its own. Passed over anyway: this repo runs a deliberately strict
no-`setInterval`-for-visual-updates posture (CLAUDE.md's animation guardrails), and
performance here is a stated top priority worth the real fix rather than a tuned timer.
Scoped as its own follow-up PR/branch, not folded into this one — see shape below for why.

Investigated before deciding (2026-09-14): lighting isn't confined to `Factory.tsx` — it's
threaded through 21 separate usage sites across `greebles/rooftopGreebles.tsx` and
`greebles/facadeGreebles.tsx` (752 lines combined), both today plain `(ctx) => JSX`
functions that bake `eastLMultiplier`/`westLMultiplier`/`nightDepth`/`flickerEpoch`
straight into whatever they return — not just the 2 body fills + belt-course fills
`Factory.tsx` itself touches directly. There is also **no existing test file for
`Factory.tsx`** itself (only the two greeble sub-renderers and `BubbleStream` have
coverage) — real regression risk for a seed-deterministic, `docs/BUILDING_DESIGN.md`
guardrail-adjacent system.

**Fix shape — option (a), chosen:** isolate the lighting-dependent color computation into
a small child component per factory (or per lit element), memoized separately from the
rest of the factory's expensive, static geometry/greeble generation, so only that
lighting-dependent slice re-renders per tick — not the whole `FactoryInner` tree. Given the
blast radius (2 untested files, 21 usage sites, guardrail territory), this is planned as:
(1) add test coverage for `Factory.tsx` itself first — none exists today, and it's the
safety net for everything after; (2) a `spec-driven-development` pass for the actual
component-boundary redesign (whether `rooftopGreebles.tsx`/`facadeGreebles.tsx` become real
components or stay pure functions fed pre-computed values); (3) implement task-by-task
against that spec, re-profiling with the same DevTools Ranked-view technique that found
this to confirm the fix actually lands. Multi-session work, not a one-shot — own branch,
cut from `perf/rerender-cleanup` after it merges to `main`.

Options considered and passed over: (b) drive the color/lighting shift via a direct
ref/attribute write (or a GSAP tween) instead of a React re-render entirely — similarly
invasive to (a) (21 sites would each need imperative wiring) without option (a)'s benefit
of a clean component boundary, so not preferred; (c) reduce tick granularity — see Decision
above for why this was passed over despite being cheap and low-risk.

### 22. RobotBody: Every Robot Re-renders Once/Sec for Day/Night Lighting

Found while writing the spec for item 21's fix (`docs/specs/FACTORY_LIGHTING_RERENDER.md`,
2026-09-14) — same `activeLocaleLocalTime` tick, same bug class as item 21, different
component. Not yet scoped as its own fix; not addressed by item 21's spec.

`RobotBody.tsx:52-55` derives `lightnessMultiplier` from `useUIStore((s) =>
s.activeLocaleLocalTime ?? 12)`. The component's own `visual` `useMemo`
(`RobotBody.tsx:61-118`) depends on `[robot.audioAttributes, robot.octaveRange,
lightnessMultiplier]` — folding the once/sec lighting tick into the same memo as the
audio-derived shape data means every tick recomputes the *entire* robot visual (shape
selection via `selectRobotShape`, greeble count/size/persistence/placement-bias, ADSR/
register-driven shape params, colors) for all 12 robots in the roster, not just the part
that actually needs to change (color lightness). Same root cause as item 21 — a
lighting-driven value forcing a full re-render/recompute of otherwise-static-per-spawn
work — just in the robot-visual pipeline instead of the factory one.

**Fix shape:** not yet determined — likely the same family of fix as item 21 (isolate the
lighting-dependent step from the expensive, audio-derived-and-otherwise-static
computation), most plausibly by splitting `visual`'s color step out of the same `useMemo`
as the shape/greeble computation and keying it independently on `lightnessMultiplier`
alone. Not assumed identical to item 21's layout/paint split, though — `RobotBody`'s split
is between "audio-derived shape" and "lighting-derived color," not "geometry" vs. "paint"
within a seeded procedural-placement loop the way Factory's greebles are. Needs its own
investigation/spec pass before implementing.
