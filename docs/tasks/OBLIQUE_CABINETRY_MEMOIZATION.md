# Implementation Plan: Oblique Cabinetry Memoization

Source spec: [docs/specs/OBLIQUE_CABINETRY_MEMOIZATION.md](../specs/OBLIQUE_CABINETRY_MEMOIZATION.md).
Source backlog item: [docs/todo/backlog.md #26](../todo/backlog.md#26-oblique-cabinetry-primitives-no-memo-boundary-anywhere--whole-panels-re-render-together).
Thirteen tasks across five phases: three derived-array memoization tasks (the deepest layer of
the spec's own fix chain), two structural-memo tasks for the shared `VoxelTrack`/`CabinetBox`
rendering core, six primitive-sweep tasks covering the remaining 11 primitives, one high-risk
call-site stabilization task in `AudioRigDrawer.tsx` (the only task that actually changes
observable re-render behavior for a real consumer), and one verification/close-out pass.

## Overview

None of the 14 shared Oblique Cabinetry primitives (`src/components/ui/controls/`) are wrapped in
`React.memo`, so any single field update inside an `AudioRigEffectPanel` re-renders every sibling
control in that panel, not just the one whose value changed (confirmed live via React DevTools
Profiler during an Audio Swell tick — `AudioRigEffectPanel x36, CabinetBox x36, SliderLog x36,
SliderLinear x36`, identical counts throughout). The spec traced this to three layers, each a
precondition for the one above it: (1) `computeVoxelBoxStates`/`...CenteredZero`
(`voxelTrackMath.ts`) are pure functions called directly in `SliderLinear`/`SliderLog`/
`SliderCenteredZero`'s render bodies, returning a fresh array every call; (2) `VoxelTrack` maps
that fresh array into fresh `CabinetBox` children every render; (3) `AudioRigDrawer.tsx` builds
every `onChange` as a new inline arrow function on every render, which defeats `React.memo`'s
shallow-compare regardless of how many primitives get wrapped. This plan fixes all three layers
plus memoizes the remaining 11 primitives, matching the spec's "safe regardless of caller
readiness" framing (§1.4) — everything except the final `AudioRigDrawer.tsx` task can land, be
reviewed, and even be reverted independently with zero behavior change to the running app.

## Architecture Decisions

- **Resolves spec §7 open item 2 (CabinetBox test/GSAP-mock compatibility):** confirmed directly
  by reading `CabinetBox.test.tsx` — it already renders `CabinetBox` directly against a **local**
  `gsap` mock (`vi.mock('gsap', ...)` at the top of the file, overriding `vitest.setup.ts`'s
  global noop for this file only, capturing `fromTo`/`set` calls), the same pattern
  `useLfoTargetGroup.test.ts` already uses. It does **not** hit `BubbleStream.test.tsx`'s
  `tl.add()` gap (`BubbleStream` needed a different accommodation because it calls `.add()`, which
  this local mock never defines — `CabinetBox` never calls `.add()`). Tasks 4/5 below write
  real render-based, render-count-spy tests directly, no `BubbleStream`-style workaround needed.
- **Resolves spec §7 open item 1 (the exact `useCallback` mechanical shape in
  `AudioRigDrawer.tsx`):** a `useCallback`-wrapped `updateParam(field, value)` plus a `useMemo`-built
  **per-field onChange map** (`Record<string, (v: number) => void>`), keyed by `block.params`
  (stable — a slice of the module-level `AUDIO_RIG_CONFIG`) and `updateParam` (stable once
  memoized, since `effectKey`/`setGlobalAudio` don't change across an `AudioRigEffectPanel`
  instance's own lifetime). `paramRow` changes from building `(v) => updateParam(param.field, v)`
  inline to accepting a pre-bound `onChange` directly; `AudioRigLfoGroup` takes the same map
  instead of a raw `updateParam` prop. This is the "one memoized factory, not a `useCallback` per
  literal call site" option the spec left open — chosen because `block.params`'s field set is
  already a stable, closed list per effect (no field ever appears/disappears across an instance's
  life), so building the whole map once and reusing entries is both simpler and cheaper than
  hand-writing a `useCallback` at each of the ~9 distinct call shapes in this file (`paramRow`'s
  loop, the compressor special case's 5 direct `paramRow` calls, `AudioRigLfoGroup`'s own
  `params.map`, `driftContent`'s 2 `SliderCenteredZero`s, the Decay Mode `RadioButton`, and
  `AudioRigDrawer`'s own top-level Ping Variance slider).
- **Tasks 1-11 (every primitive/utility file) are purely additive/internal to their own file** —
  same reasoning items 21-23's plans used: a memoized component with an unmigrated caller is no
  worse off than today, never worse, so these tasks can land and be reviewed independently of
  Task 12. **Task 12 (`AudioRigDrawer.tsx`) is the only task that changes observable re-render
  behavior for a real consumer**, and is scoped, sized, and risk-flagged accordingly (see Task 12).
- **No custom `React.memo` comparator anywhere** (spec §3) — every real prop across all 16 files is
  either a primitive or a stable module-level config object; if a task's own testing surfaces an
  exception, that's a signal to fix the instability at its source (flag it), not add a comparator.
- **The `XxxInner`/`export const Xxx = React.memo(XxxInner)` pattern** (spec §4), applied uniformly
  across all 16 files, matching `Factory.tsx`/`BubbleStream.tsx`'s existing precedent in this
  codebase, chosen over `RobotBody.tsx`'s inline `memo(function RobotBody() {...})` form because
  several of these files (`CabinetBox.tsx` especially) carry extensive JSDoc anchored to the
  function declaration that reads more naturally split from the export line.

## Dependency Graph

```
Task 1 (SliderLinear.tsx — useMemo computeVoxelBoxStates)        ─┐
Task 2 (SliderLog.tsx — useMemo computeVoxelBoxStates, t-space)   ─┤  independent of each other
Task 3 (SliderCenteredZero.tsx — useMemo …CenteredZero)           ─┘
                                                                      │
                                                                      ▼
Task 4 (CabinetBox.tsx — React.memo(CabinetBoxInner))             ─┐  independent of Tasks 1-3
                                                                      │  and of each other, but
Task 5 (VoxelTrack.tsx — React.memo(VoxelTrackInner))              ─┘  Task 5's own end-to-end
                                                                         "sibling box didn't
                                                                         re-render" test needs
                                                                         Tasks 1-4 all landed
                                                                         to be meaningful
                                                                      │
                                                                      ▼
Tasks 6-11 (remaining 11 primitives, React.memo sweep) — independent of Tasks 1-5 and each other
                                                                      │
                                                                      ▼
Task 12 (AudioRigDrawer.tsx — useCallback stabilization, the actual fix) — depends on ALL of
                                                                            Tasks 1-11
                                                                      │
                                                                      ▼
Task 13 (manual profiler re-verification + docs close-out) — depends on Task 12
```

## Task List

### Phase 1: Derived-Array Memoization (layer 1 — the deepest precondition)

- [x] **Task 1: `SliderLinear.tsx` — memoize the `computeVoxelBoxStates` call site**

  **Description:** Wrap the existing `const states = computeVoxelBoxStates(value, schema.min,
  schema.max, boxCount);` (line 56) in `useMemo`, deps `[value, schema.min, schema.max,
  boxCount]`. `voxelTrackMath.ts` itself is untouched — the fix is memoizing the call site, not
  the pure function.

  **Acceptance criteria:**
  - [x] `states` is the same array reference across two renders with identical `value`/
        `schema.min`/`schema.max`/`boxCount`.
  - [x] A spy on `computeVoxelBoxStates` (real cross-module call — confirmed genuinely
        cross-module: RED against pre-fix code showed 3 calls across mount + 2 unchanged
        re-renders, proving `vi.spyOn` on the `voxelTrackMath` namespace import observes
        `SliderLinear.tsx`'s own call, unlike item 21's same-module `selectVariantFromSeed`
        case) is called once at mount and does NOT get called again across 2 forced parent
        re-renders with unchanged `value`/`schema`/`boxCount`.
  - [x] The spy call count DOES increment when `value` changes, when `schema.min`/`schema.max`
        change, and when the fitted `boxCount` changes via a `ResizeObserver` measurement —
        proves the memo isn't over-eager on any of its 4 real dependencies.
  - [x] Both the interactive and `readOnly` render branches use the same memoized `states` — true
        by construction (one shared local variable read by both branches), not a separate test.

  **Verification:**
  - [x] `npx vitest run src/components/ui/controls/SliderLinear.test.tsx` passes (40 tests — 36
        pre-existing, 4 new).
  - [x] `npm run build:types`, `npm run lint` clean.
  - [x] `npm test` full suite passes (143 files / 2589 tests).

  **Dependencies:** None.

  **Files:** `src/components/ui/controls/SliderLinear.tsx`,
  `src/components/ui/controls/SliderLinear.test.tsx`

  **Estimated scope:** S (one call site, one new test block)

- [ ] **Task 2: `SliderLog.tsx` — memoize the `computeVoxelBoxStates` call site**

  **Description:** Same shape as Task 1, adapted for this file's own t-space call:
  `computeVoxelBoxStates(t, 0, 1, boxCount)` (line 45), where `t = sliderLogValueToT(value,
  schema.min, schema.max)` is itself recomputed every render. `useMemo` deps: `[t, boxCount]`
  (`0`/`1` are literals, not real dependencies).

  **Acceptance criteria:** Same shape as Task 1's, adapted to this file's `t`/`boxCount` inputs —
  spy call count flat across re-renders with unchanged `value`/`schema.min`/`schema.max`/
  `boxCount` (which resolve to unchanged `t`), increments when `value` changes.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/SliderLog.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` full suite passes.

  **Dependencies:** None (parallelizable with Task 1, Task 3).

  **Files:** `src/components/ui/controls/SliderLog.tsx`,
  `src/components/ui/controls/SliderLog.test.tsx`

  **Estimated scope:** S

- [ ] **Task 3: `SliderCenteredZero.tsx` — memoize the `computeVoxelBoxStatesCenteredZero` call
  site**

  **Description:** Same shape, wrapping `computeVoxelBoxStatesCenteredZero(value, schema.min,
  schema.max, boxCount)` (line 44) in `useMemo`, deps `[value, schema.min, schema.max, boxCount]`.

  **Acceptance criteria:** Same shape as Tasks 1-2's, spying on
  `computeVoxelBoxStatesCenteredZero` instead.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/SliderCenteredZero.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` full suite passes.

  **Dependencies:** None (parallelizable with Task 1, Task 2).

  **Files:** `src/components/ui/controls/SliderCenteredZero.tsx`,
  `src/components/ui/controls/SliderCenteredZero.test.tsx`

  **Estimated scope:** S

### Checkpoint: Layer 1 Complete

- [ ] `npm run build:types`, `npm run lint`, `npm test` (full suite) clean.
- [ ] All 3 sliders' `states`/`voxelTrackMath.ts` call counts confirmed flat across unchanged-prop
      re-renders — the referential stability `VoxelTrack`'s own memo (Task 5) depends on now
      exists.

---

### Phase 2: Structural Memo — the Shared Rendering Core

- [ ] **Task 4: `CabinetBox.tsx` — `React.memo(CabinetBoxInner)`**

  **Description:** Split the existing `export function CabinetBox(...)` into
  `function CabinetBoxInner(...)` (body unchanged) + `export const CabinetBox =
  React.memo(CabinetBoxInner);`. No internal logic changes — GSAP timeline handling
  (`timelineMap`, `setTimeline`/`killTimeline`), the `ResizeObserver`, and every existing prop
  stay byte-identical.

  **Acceptance criteria:**
  - [ ] `CabinetBox.$$typeof === Symbol.for('react.memo')`.
  - [ ] A render-count test: mount `CabinetBox` inside a re-rendering parent that passes
        identical props (`popped`, `timelineKey`, `children`, etc.) each time; assert the inner
        render body does not re-execute on the second/third render (render-count spy or
        `React.Profiler.onRender`). Confirmed red against pre-fix `CabinetBox` first.
  - [ ] The same test, with one prop changed (e.g. `popped`), confirms the render body DOES
        re-execute — proves the memo isn't silently eating real updates.
  - [ ] Every existing `CabinetBox.test.tsx` assertion (GSAP timeline registration, wall
        scale/skew, `--cabinet-glow`, ResizeObserver-driven width, `zIndex`, `autoHeight`, etc.)
        passes unmodified.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/CabinetBox.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` full suite passes — confirms every existing consumer (`VoxelTrack`, `Button`,
        `Toggle`, `RadioButton`, `AccordionContainer`, `DirectionalPanel`, `TextInput`) still
        renders correctly through the now-memoized export.

  **Dependencies:** None.

  **Files:** `src/components/ui/controls/CabinetBox.tsx`,
  `src/components/ui/controls/CabinetBox.test.tsx`

  **Estimated scope:** S (mechanical split; the file's real complexity is in its existing
  unchanged internals, not this task's diff)

- [ ] **Task 5: `VoxelTrack.tsx` — `React.memo(VoxelTrackInner)`**

  **Description:** Same split pattern: `function VoxelTrackInner({ states, boxSize, gap, axis,
  timelineKeyPrefix }: VoxelTrackProps)` + `export const VoxelTrack =
  React.memo(VoxelTrackInner);`. No internal logic changes.

  **Acceptance criteria:**
  - [ ] `VoxelTrack.$$typeof === Symbol.for('react.memo')`.
  - [ ] Render-count test: mount `VoxelTrack` with a stable `states` array reference (built once,
        outside the re-rendering parent's own render) across 2-3 forced parent re-renders; assert
        the render body doesn't re-execute (its own `.map()` over `states` doesn't run again — no
        new `CabinetBox` elements constructed).
  - [ ] The same test with a **new** (but deep-equal) `states` array reference on each render
        confirms the render body DOES re-execute — this is what makes Task 1's memoization a real
        precondition, not incidental: a bare `React.memo` on `VoxelTrack` alone, fed an unmemoized
        caller, would never bail.
  - [ ] **The end-to-end regression test this whole plan exists for:** render `SliderLinear`
        (now depending on Tasks 1 + 4 + this task) inside a re-rendering parent with unchanged
        `value`/`schema`; assert a spy on `computeVoxelBoxStates` OR a `CabinetBox`-level
        render-count marker confirms NO individual `CabinetBox` in the row re-executes its own
        render body on the parent's re-render. Confirmed red against pre-Task-1/4/5 code first.
  - [ ] Every existing `VoxelTrack.test.tsx` assertion passes unmodified.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/VoxelTrack.test.tsx
        src/components/ui/controls/SliderLinear.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` full suite passes.

  **Dependencies:** Tasks 1, 2, 3 (states referential stability), Task 4 (`CabinetBox` itself
  memoized, so the end-to-end test's "nothing downstream re-executes" claim is actually true all
  the way down, not just at `VoxelTrack`'s own top level).

  **Files:** `src/components/ui/controls/VoxelTrack.tsx`,
  `src/components/ui/controls/VoxelTrack.test.tsx`

  **Estimated scope:** S–M (the mechanical split is small; the end-to-end regression test is the
  part worth budgeting real time for — it's the test that actually proves the mechanism, same
  category as item 21 Task 4's `shiftHSL` spy)

### Checkpoint: Structural Core Complete

- [ ] `npm run build:types`, `npm run lint`, `npm test` (full suite) clean.
- [ ] The end-to-end "a slider with unchanged value/schema re-renders zero of its own
      `CabinetBox`es" test is green, and was confirmed red before Tasks 1-5.
- [ ] Review with human before proceeding — this is the last checkpoint before the broader
      primitive sweep, which depends on this chain actually working.

---

### Phase 3: Remaining Primitives — `React.memo` Sweep

Every task in this phase is the same mechanical shape (`XxxInner` split + `React.memo` + a
`$$typeof`/render-count test pair per component) applied to self-contained primitives per the
spec's own per-primitive audit (§1.3) — no `computeVoxelBoxStates`-style prerequisite, since none
of these take a `VoxelTrack`-derived array. Grouped in pairs to keep each task's file count small;
order within this phase doesn't matter (all independent of each other and of Phase 2's `Xxx`
exports, though they compose `CabinetBox`/`DualLabel` internally, already memoized by Task 4).

- [ ] **Task 6: `DualLabel.tsx` + `Button.tsx`** — `React.memo`, each. `DualLabel`'s own props
  (`loreLabel?`, `humanLabel?`) are always plain strings off a stable `schema` — trivially
  memo-safe (spec §1.3's own note: its benefit is realized once its *parent* primitive bails, so
  `DualLabel` is never even reached — still worth memoizing directly for the cases where it is).
  `Button` composes `CabinetBox` + `DualLabel` internally, no caller-supplied `children`.

  **Acceptance criteria (each component):** `$$typeof === Symbol.for('react.memo')`; a
  render-count test proves a re-render with identical props doesn't re-execute the body, and a
  changed prop (e.g. `Button`'s `disabled`, `DualLabel`'s `humanLabel`) does. Every existing test
  in `DualLabel.test.tsx`/`Button.test.tsx` passes unmodified.

  **Verification:** `npx vitest run src/components/ui/controls/DualLabel.test.tsx
  src/components/ui/controls/Button.test.tsx`; `npm run build:types`; `npm run lint`; `npm test`
  full suite.

  **Dependencies:** Task 4 (`CabinetBox` memoized — not required for these tests to pass, but
  required for the memo to be worth anything downstream).

  **Files:** `DualLabel.tsx`/`.test.tsx`, `Button.tsx`/`.test.tsx` (all under
  `src/components/ui/controls/`)

  **Estimated scope:** S

- [ ] **Task 7: `Toggle.tsx` + `TextInput.tsx`** — same shape. Note: `Toggle` sometimes receives
  caller-supplied `children` (Header's Mute switch) — memoize it anyway (spec §1.3's conditional
  case), same as `AccordionContainer`/`DirectionalPanel` below; document in the render-count test
  that the "no-children" call shape is the one with a guaranteed bail-out.

  **Acceptance criteria / Verification / Dependencies / Files / Scope:** same shape as Task 6,
  for `Toggle.tsx`/`.test.tsx`, `TextInput.tsx`/`.test.tsx`.

- [ ] **Task 8: `Stepper.tsx` + `StepperWithToggle.tsx`** — same shape.

  **Files:** `Stepper.tsx`/`.test.tsx`, `StepperWithToggle.tsx`/`.test.tsx`

- [ ] **Task 9: `CoordsInput.tsx` + `RadioButton.tsx`** — same shape. `RadioButton` renders one
  `CabinetBox` per option (spec §1.3) — its own memo benefit still depends on `CabinetBox` (Task
  4) and on `RadioButton` itself not rebuilding fresh `children` per option on every render, which
  this task's own memoization doesn't change (each option's `children` is still built fresh
  inside `RadioButton`'s own render body when it DOES run) — that's expected and fine: the goal is
  `RadioButton` bailing entirely when its own props are unchanged, not eliminating its internal
  per-option construction when it does run.

  **Files:** `CoordsInput.tsx`/`.test.tsx`, `RadioButton.tsx`/`.test.tsx`

- [ ] **Task 10: `Lfo.tsx` + `AccordionContainer.tsx`** — same shape. `AccordionContainer` takes
  caller-supplied `children` (like `Toggle`) — same conditional-benefit note as Task 7.

  **Files:** `Lfo.tsx`/`.test.tsx`, `AccordionContainer.tsx`/`.test.tsx`

- [ ] **Task 11: `DirectionalPanel.tsx`** — solo task (the spec's own §1.3 flags it individually
  for its conditional-benefit case; confirmed via direct read of the file: every real call site
  in this codebase constructs its `children` inline — e.g. `AudioRigDrawer.tsx`'s own
  `<DirectionalPanel schema={...}>{...inline JSX...}</DirectionalPanel>` — so `React.memo` here
  is correct to add (never harmful) but won't itself produce a measurable win until/unless a
  caller's own children construction becomes referentially stable, which is out of this plan's
  scope). Document this plainly in the component's own comment, matching §3's requirement.

  **Acceptance criteria:** `$$typeof === Symbol.for('react.memo')`; existing
  `DirectionalPanel.test.tsx` assertions pass unmodified; one new test explicitly demonstrating
  the "inline children defeats the memo" case (a re-render with freshly-constructed but
  deep-equal `children` still re-executes) alongside one proving a **stable** `children` reference
  (e.g. hoisted to a variable outside the render) DOES bail — documents the real, conditional
  nature of this primitive's benefit rather than silently asserting a guarantee that doesn't hold.

  **Files:** `DirectionalPanel.tsx`, `DirectionalPanel.test.tsx`

  **Estimated scope:** S

### Checkpoint: Primitive Library Complete

- [ ] `npm run build:types`, `npm run lint`, `npm test` (full suite) clean.
- [ ] All 16 files (`CabinetBox`, `VoxelTrack`, + the 14 documented primitives) are
      `React.memo`-wrapped, confirmed via `grep -rL "React.memo\|= memo(" src/components/ui/controls
      --include="*.tsx" | grep -v test` returning zero non-test files (mirrors the spec's own
      original confirmation grep, inverted).
- [ ] The primitive-library half of the fix is complete and safe regardless of any caller's own
      readiness (§1.4) — every existing drawer (`RobotOptionsTab`, `SectorSettingsDrawer`, etc.)
      still passes its own unmodified tests, importing these now-memoized components.
- [ ] Review with human before Task 12 — the one task that actually changes `AudioRigDrawer.tsx`'s
      observable behavior.

---

### Phase 4: Integration — the Actual Fix

- [ ] **Task 12: `AudioRigDrawer.tsx` — callback stabilization**

  **Description:** Per the resolved mechanical shape (Architecture Decisions above):
  1. In `AudioRigEffectPanel`, wrap `updateParam` in `useCallback`, deps `[effectKey,
     setGlobalAudio]`.
  2. Add a `useMemo`-built `fieldOnChange: Record<string, (v: number) => void>`, one entry per
     `block.params[i].field`, each `(v) => updateParam(field, v)`, deps `[block.params,
     updateParam]`.
  3. Change `paramRow(param, effect, updateParam)` to `paramRow(param, effect, onChange)`,
     replacing its internal `(v) => updateParam(param.field, v)` construction with the passed-in
     `onChange` directly. Update all 6 call sites (the generic `block.params.map(...)` path, and
     the compressor special case's 5 direct `paramRow` calls) to pass `fieldOnChange[param.field]`.
  4. Change `AudioRigLfoGroupProps.updateParam: (field, value) => void` to
     `fieldOnChange: Record<string, (v: number) => void>`; update `AudioRigLfoGroup`'s own
     `params.map(...)` to use `fieldOnChange[param.field]` instead of building
     `(v) => updateParam(param.field, v)` inline; update `AudioRigEffectPanel`'s own
     `<AudioRigLfoGroup updateParam={updateParam} .../>` call to pass `fieldOnChange` instead.
  5. Wrap `AudioRigLfoGroup`'s own `onChange={(v) => setGlobalLfo(selectedTarget, v)}` (the `Lfo`
     component's prop) in `useCallback`, deps `[selectedTarget, setGlobalLfo]`.
  6. Wrap `driftContent`'s two `SliderCenteredZero` `onChange`s (`rateDrift`/`depthDrift`) in
     `useCallback` inside `AudioRigEffectPanel`, deps `[driftGroup, setGlobalLfoDrift]` each.
  7. Wrap the compressor special case's `RadioButton onChange={(v) =>
     setCompressorBeforeDelay(v === 'controlled')}` in `useCallback`, deps
     `[setCompressorBeforeDelay]`.
  8. In `AudioRigDrawer` itself, wrap the top-level Ping Variance Automation slider's
     `onChange={(v) => setPingVarianceAutomation(v / 100)}` in `useCallback`, deps
     `[setPingVarianceAutomation]` (the BPM slider's `onChange={setBPM}` is already a stable store
     action — no change needed).

  **Acceptance criteria:**
  - [ ] Every prop passed into a now-`React.memo`'d primitive from this file
        (`SliderLinear`/`SliderLog`/`SliderCenteredZero`/`Stepper`/`RadioButton`/`Lfo`) is
        referentially stable across an `AudioRigEffectPanel` re-render triggered by an unrelated
        field's value changing.
  - [ ] **The end-to-end cascade regression test this whole spec exists for:** render
        `AudioRigEffectPanel` (reusing `AudioRigDrawer.test.tsx`'s existing render setup) for a
        block with 2+ params; change ONE field's value via a simulated `setGlobalAudio` call
        (mirroring an audio-swell tick); assert a render-count spy/marker on a **sibling** field's
        own slider (one that did NOT receive the changed field) shows NO re-execution. Confirmed
        red against pre-Task-12 code first (with Tasks 1-11 already landed) — this is the test
        that actually proves the originally-reported bug (§1.1) is fixed, not just that
        individual primitives are memo-wrapped in isolation.
  - [ ] Every existing `AudioRigDrawer.test.tsx` assertion passes unmodified — all interactive
        behavior (dragging a slider, the Decay Mode radio, LFO target selection) is unchanged.
  - [ ] `fieldOnChange` (and any other `useMemo`/`useCallback` added here) is confirmed stable
        across renders that don't change `effectKey`/`block.params` — not just "present," via a
        reference-identity assertion, not merely "the test happens to pass."

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/AudioRigDrawer.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` full suite passes.
  - [ ] `npm run build` succeeds.

  **Dependencies:** Tasks 1-11 (every primitive this file renders must already be `React.memo`'d
  for this task's own stabilization to have any observable effect — per Architecture Decisions,
  this is the ONE task where that matters).

  **Files:** `src/components/panels/screen/console/AudioRigDrawer.tsx`,
  `src/components/panels/screen/console/AudioRigDrawer.test.tsx`

  **Estimated scope:** L by file count (1-2 files) but the highest-risk, most intricate diff in
  this plan — touches 3 components' worth of callback plumbing in one file. Budget a full focused
  session, not a quick edit; same posture as item 21's own Task 4 note ("this is the task the
  entire plan exists to protect"). Consider splitting into two commits (the `updateParam`/
  `fieldOnChange`/`paramRow` restructure, then the remaining individual `useCallback` wraps) if it
  grows unwieldy as a single diff — not required, but flagged here as a valid split if needed.

### Checkpoint: Integration Complete

- [ ] `npm run build:types`, `npm run lint`, `npm test` (full suite), `npm run build` all clean.
- [ ] The Task 12 end-to-end cascade regression test is green and was confirmed red first.

---

### Phase 5: Verification & Close-out

- [ ] **Task 13: Manual profiler re-verification + documentation close-out**

  **Description:** No further production code changes. Closes the loop the same way items 21/23-
  25 did: the bug was found live via React DevTools Profiler; the fix should be confirmed the same
  way.

  **Acceptance criteria / checklist:**
  - [ ] **Genuinely deferred — needs a live browser with React DevTools, not available in this
        session:** `npm run dev`, open Audio Rig, let an Audio Swell run, Profiler Ranked/
        Flamegraph view — confirm only the actually-swelling field's own control shows real
        render duration, not the whole panel (per spec §5's own manual check).
  - [ ] Deferred alongside the above: spot-check that dragging a slider, toggling the Decay Mode
        radio, and switching an LFO target all still work exactly as before — a pure perf
        refactor, zero behavioral change expected.
  - [ ] `docs/COMPONENT_LIBRARY.md` update (spec §6): a short note that all 14 primitives (+
        `DualLabel`, + `VoxelTrack`) are `React.memo`-wrapped, and that consumers should pass a
        stable `onChange` (`useCallback`, or a memoized per-field map as `AudioRigDrawer.tsx` now
        does) to actually benefit — an implicit performance contract, not a type-level one.
  - [ ] `docs/todo/backlog.md` item 26: status line added noting the code fix landed, linking this
        task file and the spec — **not** marked fixed until the live profiler check above actually
        runs, matching this backlog's own "found → fixed → live-verified" pattern.

  **Verification:**
  - [ ] `npm run lint`, `npm run build:types` re-run clean after the doc edits.

  **Dependencies:** Task 12.

  **Files:** `docs/todo/backlog.md`, `docs/COMPONENT_LIBRARY.md`

  **Estimated scope:** XS (no production code; doc edits land now, live-profiler items genuinely
  deferred to a live browser)

### Checkpoint: Complete

- [ ] Tasks 1-12's acceptance criteria met; Task 13's doc-only items done, live-profiler items
      deferred.
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Live profiler check recorded and confirms only the swelling field re-renders — open, needs a
      live browser (Crawford, or a future session with one).
- [ ] `docs/todo/backlog.md` item 26 marked fixed — blocked on the live profiler check.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A render-count/`useMemo` regression test is written loosely enough that it passes even without the fix (false green) | Medium — the tests that actually prove each layer works silently don't | Every task explicitly requires confirming its key regression test fails against pre-task code before being treated as done, same bar item 21/22 held themselves to |
| Task 12's `fieldOnChange` map or one of its dependent `useCallback`s has a stale/incorrect dependency array, silently reintroducing the exact bug this plan fixes (an onChange that looks stable but isn't, or one that goes stale and calls a wrong `updateParam`) | High — would ship code that passes every unit test in isolation but never actually stops the cascade in the real app | Task 12's own acceptance criteria require a reference-identity assertion on `fieldOnChange` across renders, not just "the UI still works"; the manual profiler check (Task 13) is the final real-world confirmation this doesn't happen |
| `DirectionalPanel`/`AccordionContainer`/`Toggle`'s conditional-benefit memoization (Tasks 7, 10, 11) gets treated as a guaranteed win in the close-out docs, misleading a future session into skipping the real fix (stabilizing a caller's own `children` construction) for these | Low-Medium — wasted future investigation time | Task 11's own acceptance criteria require a test that explicitly demonstrates the "inline children defeats the memo" case, and the Architecture Decisions/§1.3 framing is carried into the Task 13 `docs/COMPONENT_LIBRARY.md` update |
| Manual profiler re-check (Task 13) is skipped or deferred indefinitely | Medium — the actual perf claim goes unverified in the real app despite all tests passing | Task 13 is its own phase/checkpoint, not folded into Task 12's "done" state; `docs/todo/backlog.md` item 26 explicitly not marked fixed until this step's numbers are recorded |

## Open Questions

Resolved during this planning pass (see Architecture Decisions for full reasoning):

- ~~**Spec §7 item 1 — exact `useCallback` mechanical shape in `AudioRigDrawer.tsx`?**~~
  **Resolved: `useCallback`-wrapped `updateParam` + a `useMemo`-built per-field `onChange` map**,
  threaded through `paramRow` and `AudioRigLfoGroup`'s own prop shape. See Task 12.
- ~~**Spec §7 item 2 — does `CabinetBox.test.tsx` already render directly, or hit
  `BubbleStream`'s `tl.add()` gap?**~~ **Resolved: renders directly**, against its own local
  `gsap` mock — confirmed by reading the file. No workaround needed.

Still open, left for Crawford (spec §7 items 3-5, unchanged by this plan):

1. **Branch choice.** This plan defaults to continuing on `refactor/factory-timing` (same branch
   items 21-25 landed on, and the spec's own stated default) — flag before Task 1 if a fresh
   branch is preferred instead.
2. **Follow-up drawers** (`RobotOptionsTab`/`RobotAudioTab`/`RobotOscillatorsTab`,
   `SectorSettingsDrawer`, `PingControlsDrawer`, `PingContourDrawer`, `SignatureArrayDrawer`,
   `AudioSettingSection`, `CompanyManager`/`CompanyButtonRow`, `Header.tsx`'s nav `RadioButton`) —
   each likely carries the identical unstabilized-inline-closure pattern `AudioRigDrawer.tsx` had,
   and each needs its own follow-up spec/task pass to benefit from Tasks 1-11's primitive-library
   fix. Not scoped or sized here, same as the source spec left it.
