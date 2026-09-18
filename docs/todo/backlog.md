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

**Status:** ☑ fixed, pending manual visual verification — `feature/company-fixes-part-2`
(2026-09-15). `Header.tsx` now renders one `RadioButton` instance; `.header` itself became
a 2-area CSS Grid (`"rocker"`/`"nav"`, `Header.css`) that repositions `.header__row--nav`
between its own full-width row below `.rocker-spacer` (<430px) and sitting beside it
(≥430px) — the exact "named grid areas" shape this item's own fix-shape note below
sketched, reusing `.header__row--nav`'s previously-inert `grid-area: nav` declaration.
`.rocker-spacer` (`ScreenViewport.css`) gained one line (`grid-area: rocker`) and is
otherwise untouched — its own internal volume/status layout, deadzone padding, and
min-height are unaffected, confirmed via `git diff --stat`. The dead
`.header__row--status-nav` wrapper and `.primary`/`.secondary` modifier classes/media
rules were removed along with the duplication. `Header.test.tsx`'s "renders 3 nav options,
once per responsive nav group" assertion is now "exactly once each," plus a new test
asserting no `.primary`/`.secondary` split remains. All 4 verification commands
(`build:types`/`lint`/`test`/`build`) clean. **Not verified in a live browser this
session** (none available) — the responsive repositioning at the 430px crossover, and
whether nav visually sits where it should beside `.rocker-spacer` at ≥430px, still needs a
real-browser check before this is fully closed out.

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
The project name is now final ("Trace Atlas") and the sleeve already shows it as a text
wordmark — a CSS `::before` pseudo-element on `.sleeve-container__bottom-strip`
(`SleeveContainer.css:116-133`, uppercased, centered), not markup in `SleeveContainer.tsx`.
Crawford wants a real image logo, bottom-right — open question whether it replaces the
text wordmark or sits alongside it. Blocked only on the logo artwork itself (a favicon
cube, `public/favicon.svg`, exists but isn't a wordmark-scale logo).

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
Attenuation Style + coordinate combinations; once roadmap Phase 21 (Sector Settings:
Shareable Link Import/Export) lands, he wants to update the in-app preset list with
current, shareable links, alongside reorganizing how AS/coordinates/presets are laid
out in the Sector Settings panel. Depends on Phase 21 for the "shareable link" half —
Session Storage (Phase 20) alone only makes a link possible via the address bar, not
an in-app Export/Import action.

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

**Status:** ☑ fixed, pending live-browser confirmation — `bug/svg-y` (2026-09-15).
`PowerRockerSwitch.tsx`'s nested `.rocker-power-svg` (the power icon inside the rocker switch)
was the one element in the codebase whose `y` position was never set in JSX at all — its own
comment said so outright ("GSAP attr-tweens `y`: 54 at rest, 50 when pressed"), set only by
`useGSAP`'s `gsap.set(powerSvgEl, { attr: { y: POWER_SVG_REST.y } })` on mount. On the very first
paint, before that effect runs, the attribute was absent/invalid — matching the exact browser
error. "Twice on every load" is React `StrictMode` (`main.tsx`) double-invoking mount effects in
dev, not two separate bug sites. Fix: give the `<svg>` an explicit `y={POWER_SVG_REST.y}` default
in JSX so a valid value exists from the very first paint; GSAP still owns the tween from there.
New `PowerRockerSwitch.test.tsx` test reproduced the bug directly (RED: `y` attribute `null` on
initial render, under the real "before any JS has run" condition — `vitest.setup.ts`'s global
gsap mock's own `set` is a genuine DOM no-op) before the fix, then passed after.
`build:types`/`lint`/`test` (144 files/2696 tests) all clean. **Not confirmed in a live browser
this session** (none available) — the hypothesis was strong (the one component matching the
bug's exact shape) but the actual Chrome console output was never watched directly; flag if it
recurs.

Found in the same console check as item 19 (2026-09-14).

### 21. Factory: Every Instance Re-renders Once/Sec for Day/Night Lighting

**Status:** ☑ fixed — code landed on `refactor/factory-timing` (2026-09-14, Tasks 1-4 of
[docs/tasks/FACTORY_LIGHTING_RERENDER.md](../tasks/FACTORY_LIGHTING_RERENDER.md) — full spec
at [docs/specs/FACTORY_LIGHTING_RERENDER.md](../specs/FACTORY_LIGHTING_RERENDER.md)),
**live-verified 2026-09-15** (Crawford, React DevTools Profiler, Ranked view). The specific bug
— wasted JS recomputation of geometry/greebles on every tick — is confirmed gone. The live
check also surfaced two *further* costs this item's own fix couldn't have touched, each found
and fixed in the same pass: item 23 (`BubbleStream` unmemoized) and item 24 (unrounded
lighting floats defeating React's own DOM-write diffing) — see those entries for what the
Profiler actually showed and how each was run down.

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

**What actually shipped (2026-09-14):** the spec-driven-development pass (step 2 above) found
that of the 13 rooftop/facade renderer functions, only 5 (`pitchedRoof`/`crownSpire` rooftop;
`squareWindows`/`wideWindows`/`tallWindows` facade) read a lighting field at all — the other 8
were already fully static and needed no code change, just wholesale memoization. Rather than a
new child component, the isolation boundary is a single `staticVisual` `useMemo` inside
`FactoryInner` itself (confirmed with Crawford as a deliberate, smaller-footprint deviation from
the "small child component" wording above — same performance outcome). Each of the 5 dynamic
renderers gained a `compute*Layout`/`paint*` pair (geometry vs. color), wired through new
`ROOFTOP_LAYOUT_PAINT`/`FACADE_LAYOUT_PAINT` registries. Full detail, including two real bugs
caught and fixed during TDD (a rooftop layout-branch regression, and a same-module `vi.spyOn`
dead end that needed a different spy target), in the task file linked above.

### 22. RobotBody: Every Robot Re-renders Once/Sec for Day/Night Lighting

**Status:** ☑ fixed — same session as items 21/23 (2026-09-14). Spec at
[docs/specs/ROBOT_BODY_LIGHTING_RERENDER.md](../specs/ROBOT_BODY_LIGHTING_RERENDER.md), task
breakdown at [docs/tasks/ROBOT_BODY_LIGHTING_RERENDER.md](../tasks/ROBOT_BODY_LIGHTING_RERENDER.md).
Confirmed via direct code search that `lightnessMultiplier` was read in exactly one place
(`applyLightnessMultiplier`) — a much smaller fix than item 21 turned out to be needed: `visual`
split into `audioVisual` (memoized on `[robot.audioAttributes, robot.octaveRange]` only, no
lighting dependency) and `colors` (the lightness-adjusted result, computed fresh every render).
One file, one task, TDD'd (regression spy on `shapeParamsFromAudio` confirmed red — 1 call at
mount growing to 4 after 3 ticks — then green). Live profiler re-check still deferred (no
browser with React DevTools available in-session), same as items 21/23.

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

### 23. BubbleStream: Not Memoized — Re-renders on Every Parent Factory Tick

**Status:** ☑ fixed — same session as item 21 (2026-09-14).

Found live-verifying item 21's fix (Crawford, React DevTools Profiler, 2026-09-14) — the
Ranked/Flamegraph view still showed a large number of `BubbleStream` instances lighting up on
every tick even after item 21's `staticVisual` fix landed. Root cause: `BubbleStream.tsx`
(unlike `Factory`/`RobotBody`/the Robot shape components) was never wrapped in `React.memo`.
Every prop it takes (`actorId`, `ventX`, `ventY`, `seed`, `isActive`, `totalBuildings`,
`bodyHue`, `depthScale`) is a plain primitive — all of them already effectively stable
per-factory (derived from static, spawn-time-only values in `Factory.tsx`, several already
routed through item 21's own `staticVisual` memo) — so every one of `FactoryInner`'s own
still-expected once/sec re-renders (item 21 reduced *what work* that render does; it never
stopped the render itself) was also re-invoking every bubble-eligible factory's
`BubbleStream` function body for no reason, on top of the reduced `FactoryInner` cost.
`BubbleStream`'s own internal GSAP timeline was never at risk (`useGSAP`'s own
`dependencies: [config, ventX, ventY, depthScale]` already correctly no-ops when those don't
change) — this was purely the surrounding React render/reconciliation cost.

**Fix:** wrapped in `React.memo`, matching the exact `XxxInner`/`export const Xxx =
React.memo(XxxInner)` pattern `Factory.tsx` and the Robot shape components already use. No
custom comparator needed — every prop is a primitive, so the default shallow compare is
already correct. `BubbleStream.test.tsx`'s `'exports a React component'` assertion updated
(`typeof` a memoized component is `'object'`, not `'function'`); a real render-based
re-render-count test wasn't viable (`BubbleStream`'s GSAP effect calls `tl.add()`, which the
global `gsap` test mock doesn't implement — confirmed directly), so verified structurally
instead (`$$typeof === Symbol.for('react.memo')`, no custom comparator). **Live-verified
2026-09-15** (Crawford, React DevTools Profiler, Ranked view): clicking `BubbleStreamInner`
reports *"Did not render on the client during this profiling session"* across a full
28-commit recording — the fix is confirmed working in the real app, not just structurally.

### 24. Unrounded Lighting Floats Defeat React's Own DOM-Write Diffing

**Status:** ☑ fixed — same session as items 21-23 (2026-09-15).

Found live-verifying items 21-23's fixes (Crawford, React DevTools Profiler, Ranked view,
2026-09-15) — even with all of 21-23 landed, `FactoryInner (Memo)` entries still cost
**5-9ms each** (~30 instances visible), the same order of magnitude as the original ~150ms/tick
baseline item 21 itself recorded. Crawford correctly pushed back on the initial read of this
("that's just inherent DOM-mutation cost") — a direct empirical check (rendering real
`Factory` instances through repeated lighting ticks, timed) confirmed the *relative* cost
scaled with window count as expected, but that didn't explain why even a genuinely cheap
paint step would force a real DOM write on literally every tick.

Root cause, found by re-reading `applyColorShift` (`colorUtils.ts`) and the window-`opacity`
line in `facadeGreebles.tsx`'s `paintWindowItems` (added in item 21's Task 3): neither rounded
its output. `eastLMultiplier`/`westLMultiplier`/`nightDepth` are continuous, never-repeating
floats sampled every tick from a sine-based day/night curve — `l = base.l * lMultiplier` (and
the window `opacity` product) produced a genuinely *different* number on every single tick,
even when the real visual change was imperceptible. React's reconciler skips a DOM write for
an attribute only when `Object.is(prevValue, nextValue)` is true — a plain value check, not
something `React.memo` governs — so an unrounded float defeats that check on every tick,
forcing a real `fill`/`opacity` write to the actual DOM every second across every lit element
in the scene, regardless of how cheap the *computation* feeding it had become. Items 21-23
eliminated wasted JS computation; this is a distinct cost — wasted DOM mutation — that only
existed because the two never-equal values were never given a chance to compare equal.

**Fix:** round before building the output — `Math.round(base.l * lMultiplier)` (whole-percent
lightness, `colorUtils.ts`) and `Math.round(opacityBase * multiplier * 100) / 100`
(2-decimal opacity, `facadeGreebles.tsx`) — 100 distinct levels each, visually indistinguishable
from full float precision. Same fix shape this codebase has used before for an unrelated
instance of the identical problem (`CabinetBox`'s `ResizeObserver` measurement rounding,
`528c77b`/`9fbcb7d`, per project memory). Confirmed every existing `applyColorShift` test
already used values that happened to round to whole numbers (no regression), added tests
proving two lighting values differing by a sub-perceptible amount now produce the *identical*
string/number, and an end-to-end `Factory` test confirming body fill is unchanged across a
realistic one-real-second tick delta even at dawn — the steepest part of the sine curve, the
worst case for this fix to hold. Full suite: 143 files / 2584 tests, `build:types`, `lint`,
and production build all clean.

### 25. Once/Sec Lighting Tick Updates Every Subscriber in One Synchronized Commit

**Status:** ☑ fixed — same session as items 21/23/24 (2026-09-15).

Found via a question Crawford asked live-verifying item 24's fix (React DevTools Profiler,
Ranked view, 2026-09-15): every `FactoryInner`/`RobotBody` instance subscribed to
`activeLocaleLocalTime` still visibly fires "in lockstep" every tick — all ~36+ of them in one
React commit. Confirmed this is real, measurable cost, not just a visual artifact: a direct
timed probe (rendering ~36 `Factory` instances sharing one `activeLocaleLocalTime` update,
post item 24's rounding fix) measured **~43ms for a single shared tick in jsdom** — real
browser cost would be higher. This is expected React behavior, not a bug — every subscriber
to the same store value re-renders in the same batched commit by design, which is exactly
what prevents visual tearing (half the buildings lit, half still dark, in the same frame). But
"correct" and "cheap" are different things: with nothing left inside that commit that's
*wasted* work (items 21/23/24), the remaining cost is just the sheer number of subscribers
updating together, all at once, blocking the main thread for one synchronous stretch.

**Fix:** wrapped `AttenuationStyleView.tsx`'s tick — both `setActiveLocaleLocalTime` and
`setActiveLocaleTemperature` — in `React.startTransition`. Doesn't reduce the total work;
marks it low-priority so React can interrupt it for anything more urgent, or spread it across
multiple frames via React 18+'s concurrent scheduler, instead of blocking synchronously.
Doesn't affect the underlying store values (`useUIStore.getState()...` still updates
synchronously as always, unrelated to React's fiber scheduling) — confirmed via all 5
pre-existing `AttenuationStyleView.test.tsx` tests passing unmodified (they read store state
directly, not rendered DOM). React scheduling priority isn't directly observable in a
synchronous jsdom test (Testing Library's `act()` flushes transitions before returning either
way), so the new test is a source-scan regression guard confirming both store updates stay
inside the `startTransition` call, matching this file's own existing pattern for its
setInterval-count guard. Full suite: 143 files / 2585 tests, `build:types`, `lint`, and
production build all clean. Live re-verification (does the commit visibly spread across
multiple frames now, and does it feel less spiky) still deferred to Crawford's next live
Profiler check, same as items 21/23/24's own remaining live-verification steps.

### 26. Oblique Cabinetry Primitives: No Memo Boundary Anywhere — Whole Panels Re-render Together

**Status:** ☑ fixed — code landed on `refactor/factory-timing` (2026-09-15, Tasks 1-12 of
[docs/tasks/OBLIQUE_CABINETRY_MEMOIZATION.md](../tasks/OBLIQUE_CABINETRY_MEMOIZATION.md) — full
spec at [docs/specs/OBLIQUE_CABINETRY_MEMOIZATION.md](../specs/OBLIQUE_CABINETRY_MEMOIZATION.md)),
**live-verified round 2, 2026-09-15** (Crawford, React DevTools Profiler) — the 3 LFO-bearing
blocks (3-Band EQ / Low-Pass Filter / High-Pass Filter) confirmed no longer cascade during an
Audio Swell, after `bba6767`/`9ed46fe` (below). An automated end-to-end
regression test (`AudioRigDrawer.test.tsx`'s "re-render cascade regression" describe block)
confirms the originally-reported mechanism is fixed: a `setGlobalAudio` update to one field no
longer re-executes a sibling field's own control. Implementation also found and fixed a real gap
in Tasks 1-3 as originally landed — `SliderLinear`/`SliderLog`/`SliderCenteredZero` had only
gained the internal `states` `useMemo`, never the `React.memo` wrap the spec's own file list also
called for — caught only once Task 12's deeper end-to-end test exercised it; see that task's own
entry in the tasks file for the full story.

**Live-verification round 1** (Crawford, React DevTools "highlight updates", same day): found the
code fix above didn't fully hold for LFO-bearing blocks (eq3/filterLPF/filterHPF) — their whole
subtree, including the shared LFO display and its own internal Shape/Rate/Depth controls, still
re-rendered on every swell tick for that block, not just the swelling field. Root cause:
`AudioRigLfoGroup` (`AudioRigDrawer.tsx`) built its own `Lfo` component's `schema` prop (and 2
`DirectionalPanel` schemas) as a fresh inline object every render — a real test-coverage gap, since
Task 12's own cascade tests only covered Delay/Compressor, neither of which has any `lfoTarget`
params. Fixed by memoizing all 3. A second, smaller issue found in the same pass while fixing the
first: `Lfo.tsx` itself constructed its own 3 internal schemas and onChange closures fresh on every
render too, so once Lfo's own memo bailed correctly at the group level, dragging one of its own
3 fields (Shape/Rate/Depth) still re-rendered the other two unnecessarily — fixed the same way,
plus stable per-field `onChange` handlers. Both fixes have their own automated regression tests;
**re-live-verified in round 2** (Crawford, 2026-09-15) — the 3 LFO-bearing blocks confirmed clean.

Found live-verifying item 25 (Crawford, React DevTools Profiler, 2026-09-15): during an
automatic Audio Swell, the entire affected `AudioRigEffectPanel` re-renders together — every
`CabinetBox`/`SliderLog`/`SliderLinear`/`RadioButton`/`Lfo`/`SliderCenteredZero` inside it,
not just the one field actually swelling. Root cause: none of the 14 shared Oblique Cabinetry
primitives (`docs/COMPONENT_LIBRARY.md`) are wrapped in `React.memo`, unlike `Factory`/
`RobotBody`/`BubbleStream` (items 21-23). When one field's value changes, the panel that owns
that effect's whole settings object correctly re-renders (Zustand's immutable update means the
whole per-effect object is a new reference whenever any field inside it changes) — and because
nothing downstream can bail out, every sibling control re-executes too, even ones whose own
value never changed.

Confirmed deeper than a simple "add `React.memo` everywhere" fix while researching the spec:
`AudioRigDrawer.tsx` constructs every `onChange` handler as a fresh inline closure on every
render (`(v) => updateParam(param.field, v)`) — memoizing the primitives alone would change
nothing for this specific panel, since an unstabilized callback prop still looks "different"
every render regardless. Also: `VoxelTrack`-based sliders (`SliderLinear`/`SliderLog`/
`SliderCenteredZero`) call `computeVoxelBoxStates`/`computeVoxelBoxStatesCenteredZero`
(`voxelTrackMath.ts`) directly in their render body, unmemoized — a fresh array on every call
even when the input value hasn't changed — which would defeat memoization of `VoxelTrack`/
`CabinetBox` on its own, since `VoxelTrack` builds each `CabinetBox`'s `children` fresh from
that array every time it re-executes.

Not yet implemented — see the spec for the full design, including which of the 14 primitives'
memo benefit is fully self-contained vs. conditional on caller behavior (`AccordionContainer`/
`DirectionalPanel`'s externally-supplied `children`), and which other drawers (RobotOptionsTab,
SectorSettingsDrawer, header nav's `RadioButton` duplication — backlog item 1 — Ping Controls/
Contour, Signature Array, Company management) likely have the identical unstabilized-callback
pattern and would need the same treatment in their own follow-up passes before they'd see any
benefit from the primitives being memoized.

### 27. Robot Options: Whole Panel Re-renders on Any Single Field Edit

Found live (Crawford, 2026-09-15): the Robot Options screen's accordions ("even when no
company is selected" — ruling out the separate company-broadcast path, `CompanyOptionsSection`,
as the trigger) re-render frequently during ordinary single-robot editing. Confirmed via code:
this is item 26's own predicted follow-up (`docs/specs/OBLIQUE_CABINETRY_MEMOIZATION.md` §1.4/
§7.5) — the identical unstabilized-inline-object/closure pattern that spec fixed for
`AudioRigDrawer.tsx`, just not yet applied to `RobotOptionsTab.tsx` and the 5 section components
it renders.

**Root cause:** `RobotOptionsTab.tsx` (`src/components/panels/screen/console/RobotOptionsTab.tsx:67-121`)
rebuilds `audioSettingValue`/`pingControlsValue`/`signatureArrayValue` as fresh object literals,
every `onXChange` as a fresh arrow closure, and every `style` prop (`getTraitColorStyle(...)`/
`getRobotColorStyle(...)`) as a fresh `CSSProperties` object, on every render. None of its 5
direct children — `RobotDisplaySection`, `AudioSettingSection`, `PingControlsDrawer`,
`PingContourDrawer`, `SignatureArrayDrawer` — are `React.memo`-wrapped, so any single field edit
(→ `localeStore` update → `robot` selector returns a new object → `RobotOptionsTab` re-renders)
cascades into all 5 re-executing regardless of which one the user actually touched. Each then
hands a new `style`/`children` ref into its own already-memoized `AccordionContainer` (item 26),
defeating that memo too. `AudioSettingSection.tsx:97` additionally builds its `Lfo` schema prop
inline every render (`{ id: 'robotOptions.volume.lfo', type: 'lfo', humanLabel: displayLabel }`)
— the exact same instability item 26's round-1 live-verification found and fixed in
`AudioRigLfoGroup`/`Lfo.tsx` itself, reproduced at this call site. `PingContourDrawer.tsx:50,54`
builds 2 `DirectionalPanel` schema objects inline too, though these don't depend on any prop/
state and can simply be hoisted to module scope. `RobotDisplaySection.tsx:44,46` rebuilds
`companyAssignmentSchema` (from `companies`) and `handleCompanyChange` fresh every render as well.

**Fix shape:** same playbook as item 26 — `React.memo` the 5 section components, `useMemo` the 3
value objects and the `Lfo`/`DirectionalPanel` inline schemas, `useCallback` every `onXChange`
passed down. Note: `RobotDisplaySection` is the one exception — it's not actually one of "the
accordions" (its own docstring: not an `AccordionContainer`, the always-visible header block),
and its sole prop is the *entire* `robot` object rather than a narrowed value, so `React.memo`
alone can't stop it re-rendering on every edit (its prop is, by construction, always the same new
reference that triggered `RobotOptionsTab`'s own re-render in the first place) — memoized anyway
for consistency/no-regression, but the real fix (the other 4 sections' cascade) doesn't depend on
it. `CompanyOptionsSection.tsx` (the company-broadcast call site for the same 4 schema-driven
drawers) has the identical unstabilized pattern but wasn't the one reported here (no company
selected) — flagged as an identical-pattern follow-up, not fixed in this pass, same "prove it on
the one measured case first" scoping item 21→22 and item 26 itself already used.

**Status:** code fix landed on `refactor/factory-timing` (2026-09-15, Tasks 1-6 of
[docs/tasks/ROBOT_OPTIONS_TAB_MEMOIZATION.md](../tasks/ROBOT_OPTIONS_TAB_MEMOIZATION.md) — full
spec at [docs/specs/ROBOT_OPTIONS_TAB_MEMOIZATION.md](../specs/ROBOT_OPTIONS_TAB_MEMOIZATION.md)).
**Not yet marked fixed** — needs a live browser with React DevTools Profiler (Crawford, or a
future session with one) to confirm, same as every other item in this session's own chain. Full
suite (144 files / 2668 tests), `build:types`, `lint`, and production build all clean.

A real bug surfaced mid-implementation, not anticipated by the spec: the planned
`useCallback([robot, localeId])` dependency array for every `applyXxx`-calling handler was wrong
— `robot` is a new reference on *every* edit regardless of which field changed, so keying every
handler on it made all of them unstable on every edit, defeating every section's own memo
regardless of which field the user actually touched. Caught by the plan's own cascade test going
RED for the wrong reason (a Density-only edit still re-rendered `AudioSettingSection`). Fixed the
same way `Lfo.tsx` stabilizes its own per-field handlers (item 26 round 1): a ref holds the
current `robot`, and every handler reads it at call time instead of closing over `robot` directly.
See the task file's own Task 6 entry for the full story.

`RobotDisplaySection` (the always-visible header, not one of "the accordions") is memoized for
consistency but — per its own prop contract (the entire `robot` object, not a narrowed value) —
does not and cannot stop re-rendering on every edit without a deeper prop-shape change; flagged,
not attempted, same "prove it on the measured case first" reasoning as `CompanyOptionsSection.tsx`
above.

**Update, same day:** live-checked `CompanyOptionsSection.tsx` (React DevTools "highlight
updates") and found it still cascading heavily — worse than `RobotOptionsTab` was, since this
component subscribes to the *whole locale's* `robots` array, which gets a new reference on any
robot edit anywhere in the locale, not just an edit to a member of the selected company. Applied
the identical treatment: `members`/`resolved`/each section's own narrowly-derived value object are
now `useMemo`'d, and every handler reads `members`/`resolved`/`company`/`allRobotsSelected`/
`allRobotsLastEditedOptions` from a ref (same "stable callback, fresh values read at call time"
pattern as `RobotOptionsTab.tsx`) rather than closing over them directly.

Two more real bugs surfaced mid-implementation:
1. **The whole-`resolved`-object problem, one level removed.** `resolved` bundles every field into
   one shared snapshot, and was originally handed to all 4 sections more or less as-is — so even
   once stabilized as a single object, any field edit on the company's first member still
   invalidated all 4 sections together, the identical bug `RobotOptionsTab` had for `robot` itself.
   Fixed by deriving each section its own narrowly-`useMemo`'d value (mirroring `RobotOptionsTab`'s
   own 3-way split), each keyed only on the specific `resolved` sub-fields it actually uses.
2. **`resolveCompanyOptions` (`systems/companyOptions.ts`) itself returned fresh fallback objects
   on every call** — `{ ...DEFAULT_LFO_SETTINGS[VOLUME_LFO_TARGET] }` for an unset `volumeLfo`,
   `[]` for unset `layers`, `{}` for unset `lfoSettings` — each a brand-new reference every call
   even when nothing about the source robot changed, defeating the per-section memoization above
   regardless. Fixed by returning shared stable references instead (module-level
   `EMPTY_LAYERS`/`EMPTY_LFO_SETTINGS` constants, and `DEFAULT_LFO_SETTINGS[...]` directly rather
   than a spread copy) — safe since nothing downstream mutates a `CompanyOptionsSnapshot` field in
   place (every consumer spreads: `{ ...value, field }`).

Also hit `react-hooks/preserve-manual-memoization` (this repo's React Compiler lint rule): a
`useMemo` callback that reads `resolved.field` directly makes the compiler infer the *whole*
`resolved` object as the dependency, rejecting a manually-narrower array as a mismatch. Fixed by
destructuring each needed field to its own local *before* the `useMemo` call, so the callback body
never references `resolved` itself — the compiler's own inference then lines up with the narrower
array. New end-to-end cascade tests added to `CompanyOptionsSection.test.tsx` (RED confirmed first
via `git stash` on both changed files): editing a non-member robot leaves all 4 sections
un-re-rendered; editing one field on the actual first member re-renders only that field's own
section.

Full suite (144 files/2670 tests), `build:types`, `lint`, `build` all clean. Not yet marked ☑
fixed — same live-profiler gate as the rest of this item.

**Second update, same day — Robot Selection hub tile:** live-checked (screenshot: "RobotsTab
x438", "RobotFilterPanel x256", "CompanyOptionsSection x256", every descendant lit up) and found
`RobotFilterPanel.tsx` — rendered by `RobotsTab` with zero props — was missing the exact memo
boundary `CompanyManager.tsx` (its own sibling, rendered one level deeper) already carries; its own
doc comment names the mechanism precisely: `RobotsTab` re-renders on every audio-swell tick
(~8-9x/sec, `audioSwells.ts`'s `tickAudioSwells` → `applyAdsr`/etc. → `updateRobot`, a new `robots`
array reference every time), and without a memo boundary a zero-prop child re-renders in lockstep
regardless. Fixed identically: `React.memo`, no other change needed (empty props can never
differ). `CompanyOptionsSection` itself got the same wrap for consistency, with an honest limit
documented in its own doc comment: the memo wrap stops `RobotsTab`'s churn from forcing it to
re-render, but can't stop its OWN `robots`-array subscription (needed to compute `members`) from
re-executing its body on every tick regardless — fully eliminating that would need a deeper store
restructuring (per-robot selectors instead of one whole-locale array), out of scope here.
`RobotSelectionCard` (each card in the grid) was already correctly `React.memo`-wrapped with a
boolean `anySolo` selector from an earlier documented bugfix — confirmed via direct read, nothing
to do there. `RobotsTab` itself needs its own necessary re-render whenever the robots array
changes (it maps the roster into cards) — not fixable without the same deeper restructuring.

Full suite (144 files/2672 tests — one `audioSwells.test.ts` flake on the combined run, confirmed
clean 65/65 in isolation, the same known random-seeded flake pattern item 26 Task 12 already
recorded), `build:types`, `lint`, `build` all clean.

**Third update, same day — the deeper architectural fix, Crawford-requested:** live-verified with
React DevTools "highlight updates" that even after the memo wraps above, an *idle* robot's card
(battery/job/docking/company all static) still re-rendered every time. Traced (see
`docs/COMPANIES.md`-adjacent code, `src/systems/robotSystems.ts`'s `tickRobotLifecycle`,
`src/stores/localeStore.ts:200`'s `updateRobot`): the lifecycle tick itself only touches the one
robot whose battery is actually draining/recharging that tick (not a blanket rebuild) — but
`updateRobot`'s `existing.robots.map(...)` always allocates a **new top-level array** regardless,
and `RobotsTab.tsx` subscribed to that whole array with default equality, so it — and everything
composed beneath it — re-rendered on *any* robot's tick anywhere in the locale, not just the one
actually shown re-rendering.

**Fix: `RobotSelectionCard` now looks up its own robot by id** (`useLocaleStore` `.find()`,
returning the same reference unless THAT robot specifically changed) instead of receiving the
whole `Robot` object as a prop from `RobotsTab`'s own `.map()`. `RobotsTab.tsx` itself now
subscribes to a narrow `{ id, companyId }` roster via a custom-equality wrapping selector
(`useRobotRoster`, same ref-caching technique zustand's own `useShallow` uses internally, since
Zustand v5's store hook has no second `equalityFn` parameter — that was a v4 API) — it only
re-renders when a robot is actually added/removed/reassigned, never on a battery/audio/job/docking
tick. `filterRobotsByCompanyFocus` (`utils/robotListFilter.ts`) was generalized to accept this
narrower shape instead of full `Robot[]`. New regression tests confirm (RED via `git stash` first):
`RobotsTab` does not re-execute when an untouched robot's field changes elsewhere in the locale,
but does when a robot is reassigned to a different company.

Full suite (144 files/2674 tests, clean — no flake this run), `build:types`, `lint`, `build` all
clean.

**Fourth update, same day — the world-view robots ("swimming in the water"), Crawford-prompted:**
same question extended one layer further — the individual robot actors in `OceanScene` (the
ocean-themed world scene, not the UI selection cards), asking whether they needed the identical
treatment. Investigated first rather than assuming: confirmed robot movement itself is **fully
GSAP/ref-driven** (`src/animation/swimAnimation.ts`'s `createSwimTimeline` animates a DOM ref
directly via `getRef`, never touching React/Zustand per frame — `Robot.tsx`'s own mount-only
`useLayoutEffect`, `[robot.id]`/now `[robotId]` deps, confirms this), so none of the reported
re-render volume was legitimate animation — it was the identical whole-array-reference bug,
confirmed present: `OceanScene.tsx` subscribed to the whole `robots` array directly, and `Robot`
(the per-robot world component) took the entire `Robot` object as a prop with no memo boundary.

**Fix:** `Robot.tsx` now looks up its own robot by id via `useLocaleStore` (mirroring
`RobotSelectionCard`'s own fix) and is `React.memo`-wrapped. `OceanScene.tsx` now subscribes to
just an array of robot ids via `useShallow` (`zustand/react/shallow` — already this codebase's own
established idiom for exactly "compare an array of primitives by value," used in
`AudioRigDrawer.tsx`) rather than the whole array — simpler than `RobotsTab`'s own custom-equality
wrapper since the world view never filters robots by company, so no `companyId` needs to travel
with the roster here. New regression tests (RED via `git stash` first, using an unmemoized
`vi.fn()` `Robot` mock as the render-count marker, same technique as `RobotOptionsTab.test.tsx`):
`OceanScene` does not re-render its robot layer when an untouched robot's field changes, but does
when a robot is added.

Full suite (144 files/2676 tests, clean), `build:types`, `lint`, `build` all clean.

**Fifth update, same day — per-field cascade WITHIN an accordion, Crawford-prompted:** asked to
check every accordion for a DIFFERENT bug: "when one ADSR item changes on a robot, everything in
the accordion rerenders." Confirmed and audited all 4 shared drawer components plus their shared
`LfoTargetGroup` primitive — this is a *different* mechanism from every fix above (which stopped
whole-*component* cascades between accordions); this one is INSIDE a single already-memoized
accordion, where the component's own internal handlers were rebuilt fresh every render, defeating
its own children's memo even though the component itself correctly bailed or re-rendered as a
whole.

- **`PingContourDrawer.tsx`** — confirmed: `handleAttackChange`/`handleDecayChange`/
  `handleSustainChange`/`handleReleaseChange` were built fresh, unmemoized, every render, so
  editing Attack rebuilt Decay/Sustain/Release's own `onChange` too, cascading all 4 sliders
  together. Fixed with the same ref-cached-value + `useCallback` pattern as `RobotOptionsTab.tsx`.
- **`AudioSettingSection.tsx`** — same class, one instance: the Audio Setting `RadioButton`'s
  `onChange={(v) => onAudioModeChange(v as Robot['audioMode'])}` was a fresh closure every render,
  so editing Volume also re-rendered the radio. Fixed with `useCallback`.
- **`PingControlsDrawer.tsx`** — audited, confirmed already clean (every `onChange` passes
  straight through, matching its own Task 2 doc claim).
- **`SignatureArrayDrawer.tsx`** — the biggest instance: `handleTypeChange`/`handleParamChange`/
  the `fields` array/`renderField` callback were all built fresh inside the parent's own `.map()`
  over `SIGNATURE_ARRAY_CONFIG`, so editing one layer's Gain cascaded into all 3 layers' worth of
  controls. **This also invalidates item 26/27's own earlier reasoning for this file** ("the outer
  memo boundary already handles it" — docs/tasks/ROBOT_OPTIONS_TAB_MEMOIZATION.md Task 4's own
  note): correct that the component-level re-render frequency was fine, but wrong that it made the
  internal per-layer cascade harmless — it doesn't. Fixed by extracting a new `React.memo`-wrapped
  `SignatureArrayLayer` sub-component per layer, with the parent building 3 shared, stable,
  `idx`-keyed handlers via the same ref-cached pattern. **Known, documented limitation left in
  place:** `lfoSettings` is one flat object shared by all 3 layers (`applyLayerLfo` always
  rebuilds the whole record), so an LFO-settings edit (not a plain Gain/Detune/Phase drag) still
  cascades across all 3 layers — narrowing that would need its own follow-up, out of scope here.
- **`LfoTargetGroup.tsx`** (the shared LFO-display primitive `SignatureArrayDrawer` composes) —
  was not `React.memo`-wrapped at all, and had the same 2-inline-schema instability item 26/27
  already fixed elsewhere (its own `sliders` `DirectionalPanel` schema and its own `Lfo` schema).
  Without this, `SignatureArrayDrawer`'s own per-layer fix would have had no effect — even a
  perfectly stable caller couldn't make an unmemoized child bail. Fixed: `React.memo` + both
  schemas `useMemo`'d + the `Lfo` `onChange` stabilized via `useCallback`. Confirmed via a repo
  search that this component (the wrapper, not the `useLfoTargetGroup` hook) has exactly one
  consumer (`SignatureArrayDrawer`), so this fix is fully scoped.

New regression tests added to all 5 touched files (RED confirmed via `git stash` first, using the
established `resolveAccessibleName`-filtered-by-`schema.id` marker technique). Full suite (144
files/2680 tests, clean), `build:types`, `lint`, `build` all clean.

**Sixth update, same day — checked the 2 remaining areas Crawford named (Robot Selection page,
Audio Rig), rather than assume the audit above was exhaustive:**

- **Robot Selection page (`RobotsTab.tsx`/`RobotFilterPanel.tsx`/`CompanyManager.tsx`/
  `CompanyButtonRow.tsx`/`CompanyCrudControls.tsx`/`RobotSelectionCard.tsx`):** confirmed **not
  applicable** — none of these use `AccordionContainer` at all (grepped every file; the only hits
  are doc comments, including `CompanyCrudControls.tsx` explicitly recording that its own
  accordion wrap was *removed* in an earlier phase). This whole area is flat, non-accordion UI —
  the "accordion re-renders all siblings" bug class doesn't apply here by construction. Not
  force-fit; genuinely nothing to fix.
- **`AudioRigDrawer.tsx` (item 26's own original fix target) — every block re-audited against
  today's sharper understanding of this bug class:** Transport & Composition, the Compressor's own
  5 direct `paramRow` calls, Decay Mode's `RadioButton`, the Drift sliders, and EQ3/LPF/HPF via
  `AudioRigLfoGroup` — all confirmed clean; every `onChange` already routes through the stabilized
  `fieldOnChange` map or its own `useCallback`, every schema is a config import or already
  `useMemo`'d. **One (harmless) inconsistency found and fixed for consistency:** the Compressor
  block's 2 `DirectionalPanel` schemas (`audioRig.compressor.topRow`/`bottomRow`) were still inline
  object literals, unlike every other schema in this file — not a functional bug (confirmed:
  `DirectionalPanel`'s own memo already only pays off when `children` is also stable, which it
  isn't here regardless — same documented conditional-benefit case from item 26 §1.3), just the
  one remaining spot not matching the file's own established "schema is always a stable reference"
  convention. Hoisted to module-level constants, matching `PingContourDrawer.tsx`'s own identical
  earlier fix.

Full suite (144 files/2680 tests, unchanged — a pure hygiene fix, no new tests needed since it's
not a functional regression), `build:types`, `lint`, `build` all clean.

### 28. Repo-Wide: Informational console.log Noise Dominating the Console

**Status:** ☑ fixed — `chore/console-log-cleanup` (2026-09-15), 4 commits, ~44 call sites across
9 files. Raised directly by Crawford ("a whole lot of console logs going that we don't need
anymore") — a broader companion to item 19, which fixed one specific instance of the same root
cause.

**Root cause:** most of these call sites were gated by `if (DEV_TUNING)` (or the `devLog`/`devWarn`
helpers in `helpers.ts`, same gate), and `DEV_TUNING = import.meta.env.DEV` (`constants/index.ts`)
is `true` for the entire lifetime of `npm run dev` — it never actually silenced anything during
normal local development, only in a production build. Every one of these fired constantly, for as
long as the app was open.

**What was removed** (pure informational/status prints — no return value or side effect consumed
elsewhere): `swimAnimation.ts`'s timeline started/stored (fired on every robot swim cycle,
continuously — the single loudest source); `spawnSystem.ts`'s per-robot spawn, audio-copy,
company-seeded, and re-registration-count logs; `interactionSystem.ts`'s flurry/interaction-start
logs; `collisionSystem.ts`'s and `robotSystems.ts`'s already-running/started/stopped lifecycle
logs; and the bulk of the audio engine's own status prints (`AudioEngine.ts` — Started/Stopped,
voice reserve/release, melody register/unregister, layer-param/envelope-applied confirmations that
fired on every real-time slider edit, polyphony-capped; `globalFx.ts` — FX chain wired;
`beatClock.ts` — initialized/reset, scheduleRepeat/cancelSchedule on both branches, likely the
single highest-frequency site given how central BeatClock is to musical timing; `harmonySystem.ts`
— palette set/changed, cycle scheduled/stopped, the latter recurring every
`MEASURES_PER_PALETTE_ENTRY` measures for the whole session). The now-fully-dead `devLog` helper
itself was removed last, once nothing called it.

**What was deliberately left alone:** every genuine error/warning path — `AudioEngine.ts`'s 3
direct `console.warn`/`console.error` on actual failures, `idleSystem.ts`'s missing-robot warn
(item 19), `main.tsx`'s one-time `?seed=` info, `helpers.ts`'s `swallow()`, and all ~94 `devWarn`
callers across the audio engine and stores — every one of those wraps a real `catch (err)`, not
routine status. `devWarn` itself is unchanged and still has real callers.

Two incremental scope-check corrections made live during implementation, not silently absorbed:
`swimAnimation.ts`'s "No ref found for robot X, deferring animation" warning was accidentally
removed once, then restored — it was never in the approved list (a real, if minor, guard-miss
signal, unlike the two status prints beside it that were approved). `interactionSystem.ts`'s
`INTERACTION_COOLDOWN_MEASURES` constant and `AudioEngine.ts`'s `unregisterRobotMelody` count
variable were removed too, as the direct, unavoidable consequence of removing their only
consumers (the deleted log lines) — not unrelated cleanup.

All 4 commits verified independently: `build:types`/`lint`/`test` (144 files/2695 tests) clean
after each; final commit also re-ran `build`. Pure log removal with no behavior change — no new
tests were needed or added.
