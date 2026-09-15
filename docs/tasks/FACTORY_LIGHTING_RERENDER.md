# Implementation Plan: Factory Lighting Re-render Isolation

Source spec: [docs/specs/FACTORY_LIGHTING_RERENDER.md](../specs/FACTORY_LIGHTING_RERENDER.md). Source
backlog item: [docs/todo/backlog.md #21](../todo/backlog.md#21-factory-every-instance-re-renders-oncesec-for-daynight-lighting).
Five tasks across four phases: one safety-net test file (written and passing against today's
pre-refactor code, so it's a real regression net rather than a tautology), two independent
renderer-file splits, one integration task that is the actual fix, and one verification/close-out
pass.

## Overview

Stop the once/sec `activeLocaleLocalTime` UI tick from forcing all ~36 `Factory` instances per
locale to redo their expensive, seed-driven greeble geometry (window-grid/machinery/etc. PRNG
loops) on every tick. Per the spec's own re-investigation, only 5 of the 13 rooftop/facade
renderer functions actually read a lighting field; those 5 get split into a `compute*Layout`
(geometry, memoizable forever) and a `paint*` (color, cheap, safe every render) pair, while the
other 8 are memoized wholesale with zero internal change. `Factory.tsx` gains one `staticVisual`
`useMemo` bundling everything actor-derived; only the lighting tick and its resulting fills stay
outside it.

## Architecture Decisions

- **Tasks 2 and 3 (the rooftop and facade splits) are purely additive to their own files** — each
  keeps `render<Greeble>(ctx)` as a byte-identical compatibility wrapper over its own new
  `compute*`/`paint*` pair, so neither task changes `Factory.tsx` or any existing test assertion.
  This means the actual perf fix (Task 4) is the *only* task that changes observable behavior —
  Tasks 2/3 can be reviewed, merged, and even reverted independently with zero effect on the
  running app.
- **Task 1 (baseline `Factory.test.tsx`) is sequenced first despite having no file dependency on
  Tasks 2-4** — same reasoning the source spec gives (§7.4) and the `ROBOT_SELECTION_FILTER_PANEL`
  plan used for its own Task 5: write the safety net before the risky refactor it's meant to
  protect, not after. Every assertion in Task 1 must pass against **today's** `Factory.tsx`,
  unmodified — if it doesn't, it isn't testing the codebase's real current behavior.
- **Tasks 2 and 3 are independent of each other** (different files, no shared import) and safe to
  parallelize. Both must land before Task 4, which imports `ROOFTOP_LAYOUT_PAINT` and
  `FACADE_LAYOUT_PAINT` from them.
- **The regression test that actually proves the fix works (spec §5, "the regression test the
  whole fix is for") is folded into Task 4's own acceptance criteria, not a separate task.** It
  can only be meaningful once `staticVisual` exists to spy on, and pairs naturally with the change
  that makes it pass — same red/green pairing `test-driven-development` calls for, not a
  documentation afterthought.
- **Task 5 is verification and close-out only — no code.** Re-profiling (the manual check the
  backlog itself specified as how this bug was found) and the two documentation updates the spec
  flagged (§6) but didn't commit to a task.

### Checkpoint: Confirm Open Judgment Calls — RESOLVED, Phase 2 unblocked

The spec left two mechanism choices open (§7.1, §7.2). Both confirmed directly with Crawford
(2026-09-14) as the spec's own stated default — Tasks 2-4 below proceed as specified, no rework
needed:

- [x] **§7.1 — `useMemo`, not a new child component**, as the isolation boundary (spec §1.2).
      Confirmed. Task 4 proceeds as written.
- [x] **§7.2 — `ROOFTOP_LAYOUT_PAINT`/`FACADE_LAYOUT_PAINT` stay `unknown`-typed pragmatic maps**,
      not a discriminated union. Confirmed. Tasks 2 and 3 proceed as written.

## Dependency Graph

```
Task 1 (Factory.test.tsx baseline, pre-refactor)        — independent
        │
        ▼ (recommended order, not a file dependency — see Architecture Decisions)
Task 2 (rooftopGreebles.tsx: pitchedRoof/crownSpire split)   ─┐  independent of each other,
Task 3 (facadeGreebles.tsx: window-grid split)               ─┤  both additive-only
                                                               │
                                                               ▼
Task 4 (Factory.tsx staticVisual restructure — the fix) — depends on Task 2 + Task 3
                                                               │
                                                               ▼
Task 5 (manual profiler re-verification + docs close-out) — depends on Task 4
```

## Task List

### Phase 1: Safety Net

- [x] **Task 1: `Factory.test.tsx` baseline coverage (pre-refactor)**

  **Description:** First-ever test file for `Factory.tsx` (per the backlog's own noted gap).
  Written and passing against today's code, unmodified — this is what makes it a real safety net
  rather than a test that only exists to pass once the fix lands. Reuse
  `FactoryBubbleStream.test.tsx`'s fixture pattern (`makeActor`, `TEST_ATTENUATION_STYLE`,
  `TEST_LOCALE`, `useAttenuationStyleStore`/`useLocaleStore` `.setState`, `BubbleStream` mocked)
  plus `useUIStore.setState({ activeLocaleLocalTime })` to drive the tick without real timers.
  Spec §5.

  **Acceptance criteria:**
  - [x] Renders a factory of each `FactoryVariant` (`Monolith`, `Stacks`, `Refinery`,
        `Skyscraper`, `Warehouse`) without throwing. (Variant ids found deterministically via
        `selectVariantFromSeed` itself, not hardcoded guesses — see `findActorIdForEachVariant`.)
  - [x] Body fill (`eastFill`/`westFill`, read via the rendered `<rect>`'s `fill` attribute)
        differs between a "day" (`localTime = 12`) and "night" (`localTime = 0`)
        `activeLocaleLocalTime` value on the same mounted instance.
  - [x] For a factory using a static-only greeble (`machinery` rooftop, `pipesValves` facade),
        the rendered markup for that greeble is byte-identical before and after an
        `activeLocaleLocalTime` change — proves this greeble's output is already
        lighting-independent today, both before and after Task 4.
  - [x] For a factory using a dynamic greeble (`pitchedRoof`/`crownSpire` rooftop;
        `squareWindows`/`wideWindows`/`tallWindows` facade, plus a belt-course multi-zone
        edge case), fill/opacity actually differs between day and night `activeLocaleLocalTime`
        values — proves the eventual split (Tasks 2-4) isn't allowed to freeze these.
  - [x] Confirmed to fail against a deliberately-broken `Factory.tsx` (temporarily flipped
        `DEBUG_LIGHTING_PRESET` to a fixed `'noon'` preset — an existing debug hook in the file,
        not a new mutation) — 4 of 16 tests failed as expected (body fill, pitchedRoof,
        crownSpire, the regression-guard test); the window-facade tests still passed under that
        specific mutation because `flickerEpoch` isn't gated by the preset, only
        `eastLMultiplier`/`westLMultiplier` are — a real, if incidental, finding, not a gap in
        this task (it confirms those tests are sensitive to more than one lighting input).
        Mutation reverted immediately after (confirmed via `git diff --stat`: zero net change to
        `Factory.tsx`).

  **Verification:**
  - [x] `npx vitest run src/components/actors/Factory.test.tsx` passes (16 tests).
  - [x] `npm run build:types`, `npm run lint` clean.
  - [x] `npm test` (full suite, 143 files / 2555 tests) passes.

  **Dependencies:** None.

  **Files:** `src/components/actors/Factory.test.tsx` (new)

  **Estimated scope:** S (one new test file, no production code change)

### Checkpoint: Foundation

- [x] `npm run build:types`, `npm run lint`, `npm test` (full suite, 143 files / 2555 tests) clean.
- [x] Task 1's assertions pass against today's unmodified `Factory.tsx` — confirms this is a real
      safety net, not a test written to match code that doesn't exist yet.
- [x] "Confirm Open Judgment Calls" checkpoint resolved (2026-09-14) — Phase 2 unblocked.

---

### Phase 2: Renderer Splits (independent, parallelizable)

- [ ] **Task 2: `rooftopGreebles.tsx` — split `pitchedRoof`/`crownSpire` into layout + paint**

  **Description:** Add `computePitchedRoofLayout`/`paintPitchedRoof` and
  `computeCrownSpireLayout`/`paintCrownSpire`, plus the `ROOFTOP_LAYOUT_PAINT` registry mapping
  only these two `RooftopGreeble` keys to their `{ compute, paint }` pair. `renderPitchedRoof`/
  `renderCrownSpire` become thin wrappers (`paint(compute(ctx), ctx)`) — signature, exports, and
  behavior unchanged for every existing caller. No other renderer in this file changes. Spec
  §1.4.

  **Acceptance criteria:**
  - [ ] `computePitchedRoofLayout(ctx)` returns a deep-equal result for two `ctx`s that differ
        only in `eastLMultiplier`/`westLMultiplier`/`nightDepth`/`flickerEpoch` — proves it's
        genuinely lighting-independent. Same for `computeCrownSpireLayout`.
  - [ ] `paintPitchedRoof(layout, ctx)` returns different fills for two `ctx`s that differ only in
        `eastLMultiplier`/`westLMultiplier`, given the identical `layout` object. Same for
        `paintCrownSpire`.
  - [ ] `computePitchedRoofLayout`/`computeCrownSpireLayout` return `null` (or the documented
        fallback signal) under the exact same "missing lighting context" condition the current
        fallback branch checks — the fallback visual path is preserved, not dropped.
  - [ ] `renderPitchedRoof(ctx)`/`renderCrownSpire(ctx)` — every existing assertion in
        `rooftopGreebles.test.tsx` for these two functions passes unmodified, byte-for-byte.
  - [ ] `ROOFTOP_LAYOUT_PAINT` contains exactly the keys `pitchedRoof` and `crownSpire` — every
        other `RooftopGreeble` key is absent (this absence is how `Factory.tsx` will later tell
        "static, memoize the plain call" apart from "dynamic, use compute+paint" in Task 4).
  - [ ] `Factory.tsx` is untouched by this task — confirm via `git diff --stat`.

  **Verification:**
  - [ ] `npx vitest run src/components/actors/greebles/rooftopGreebles.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` (full suite) passes — confirms this additive-only change breaks nothing
        elsewhere.

  **Dependencies:** None (parallelizable with Task 3).

  **Files:** `src/components/actors/greebles/rooftopGreebles.tsx`,
  `src/components/actors/greebles/rooftopGreebles.test.tsx`

  **Estimated scope:** S (one file's internal split + its test file; zero call-site changes)

- [ ] **Task 3: `facadeGreebles.tsx` — split the window-grid renderers into layout + paint**

  **Description:** Add `WindowLayoutItem`, `computeWindowGridLayout(ctx, type, threshold)`, and
  `paintWindowGrid(items, ctx)`; `renderSquareWindows`/`renderWideWindows`/`renderTallWindows`
  become thin wrappers over the shared pair (each supplying its own `type`/`threshold`). Add
  `FACADE_LAYOUT_PAINT` mapping these three `FacadeGreeble` keys to their `{ compute, paint }`
  pair (each `compute` pre-bound to its own type/threshold). The existing east/west recursive
  split, per-face seed offset (`+500`), and the current variable-naming quirk (§3 of the spec —
  preserved exactly, not corrected) all move into `computeWindowGridLayout` unchanged in
  behavior. `renderPipesValvesFacade`/`renderBeltCourse` are untouched (spec confirms neither
  reads a lighting field; `renderBeltCourse` is additionally dead from `Factory.tsx`'s render
  path). Spec §1.4.

  **Acceptance criteria:**
  - [ ] `computeWindowGridLayout(ctx, type, threshold)` returns the identical set of
        `WindowLayoutItem`s (same positions, same `r`/`c`/`seed`/`face`) for two `ctx`s that
        differ only in `nightDepth`/`flickerEpoch`/`lMultiplier`/`eastLMultiplier`/
        `westLMultiplier` — proves window *existence and position* is decided at layout time, not
        re-rolled by the paint-time tick.
  - [ ] `paintWindowGrid(items, ctx)` produces a different set of lit/unlit windows (and/or
        different opacities) for two `ctx`s that differ only in `nightDepth`/`flickerEpoch`,
        given the identical `items` array.
  - [ ] `renderSquareWindows(ctx)`/`renderWideWindows(ctx)`/`renderTallWindows(ctx)` — every
        existing assertion in `facadeGreebles.test.tsx` for these three functions passes
        unmodified, byte-for-byte, including the east/west split behavior and its current
        variable-naming quirk (not corrected as part of this task).
  - [ ] `FACADE_LAYOUT_PAINT` contains exactly `squareWindows`, `wideWindows`, `tallWindows` — no
        other `FacadeGreeble` key.
  - [ ] `Factory.tsx` is untouched by this task — confirm via `git diff --stat`.

  **Verification:**
  - [ ] `npx vitest run src/components/actors/greebles/facadeGreebles.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` (full suite) passes.

  **Dependencies:** None (parallelizable with Task 2).

  **Files:** `src/components/actors/greebles/facadeGreebles.tsx`,
  `src/components/actors/greebles/facadeGreebles.test.tsx`

  **Estimated scope:** M (the east/west recursive split makes this the more intricate of the two
  renderer files to carry over correctly — budget a full focused session, not a quick port)

### Checkpoint: Renderer Splits

- [ ] `npm run build:types`, `npm run lint`, `npm test` (full suite) clean.
- [ ] `Factory.tsx` has zero diff (`git diff --stat src/components/actors/Factory.tsx` empty) —
      confirms Tasks 2-3 changed no observable app behavior yet; every existing test (including
      Task 1's new baseline) passes purely because `render<Greeble>` wrappers are byte-identical.
- [ ] Review with human before proceeding to Phase 3 — this is the last checkpoint before the one
      task that actually changes `Factory.tsx`'s behavior.

---

### Phase 3: Integration (the actual fix)

- [ ] **Task 4: `Factory.tsx` — the `staticVisual` restructure**

  **Description:** Introduce one `staticVisual` `useMemo` bundling everything currently computed
  from `actor` alone: variant/size/`frontCornerX` selection (today's `config` memo, subsumed),
  `shiftedColors`, `buildingSeed`/`buildingPhase`, `actualWidth`/`actualHeight`, the 8 static-only
  greeble elements (called via the unchanged `ROOFTOP_RENDERERS`/`FACADE_RENDERERS` registries,
  now inside the memo instead of the render body), the facade belt-course zone breakdown
  (`zoneY`/`zoneHeight`/per-zone seed — geometry only), and the 5 dynamic greebles' **layout only**
  (via `ROOFTOP_LAYOUT_PAINT`/`FACADE_LAYOUT_PAINT` from Tasks 2-3). Everything downstream of the
  lighting tick (`localTime`, `eastLMultiplier`/`westLMultiplier`/`nightDepth`/`flickerEpoch`,
  body/belt fills, and the 5 dynamic greebles' **paint**) stays in the render body, recomputed
  every render. Per the confirmed decision (§7.1), this is a `useMemo` inside `FactoryInner`, not
  a new child component. `actor.config?.isOffline`/`offlineSince` are deliberately excluded from
  the memo's dependency array (spec §3). Spec §1.3.

  **Acceptance criteria:**
  - [ ] Every acceptance criterion in Task 1's `Factory.test.tsx` still passes, unmodified —
        this task must not change any observable rendered output for a given
        `(actor, activeLocaleLocalTime)` pair.
  - [ ] **The regression test the whole fix is for (spec §5):** a new `Factory.test.tsx` test
        spies on a function only the static/geometry path calls (e.g. `selectVariantFromSeed`
        from `factoryVariants.ts`, and/or `computeWindowGridLayout` for a factory using a window
        facade greeble) and asserts its call count does **not** increase across two
        `act(() => useUIStore.getState().setActiveLocaleLocalTime(...))` calls with different
        values on an already-mounted `Factory` — proving the expensive path runs once per mount,
        not once per tick. This test must fail against pre-Task-4 `Factory.tsx` (verify this
        directly — e.g. temporarily stash the change and confirm red — before committing green).
  - [ ] `staticVisual`'s dependency array is exactly: `actor.id`, `actor.position.x`,
        `actor.config?.row`, `actor.config?.hueShift`, `actor.config?.satShift`,
        `actor.config?.rooftopGreeble`, `actor.config?.facadeGreeble`,
        `actor.config?.beltCourseCount`, `actor.scaleX`, `actor.scaleY` — no
        `activeLocaleLocalTime`-derived value anywhere in it.
  - [ ] For the 2 rooftop and 3 facade dynamic greeble types, the paint step (called every
        render, outside the memo) still receives fresh `eastLMultiplier`/`westLMultiplier`/
        `nightDepth`/`flickerEpoch` each tick and visibly updates (already covered by Task 1's
        dynamic-greeble assertion, re-verified here specifically against the new code path).
  - [ ] `docs/BUILDING_DESIGN.md`'s Goal 3 (offline visual effects) remains unimplemented — this
        task does not add `isOffline`-driven lighting behavior; confirm no new read of
        `actor.config?.isOffline` was introduced beyond the existing `isActive`/bubble-eligibility
        use.

  **Verification:**
  - [ ] `npx vitest run src/components/actors/Factory.test.tsx` passes.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm test` (full suite, including `rooftopGreebles.test.tsx`/`facadeGreebles.test.tsx`/
        `FactoryBubbleStream.test.tsx`) passes unmodified.
  - [ ] `npm run build` succeeds.

  **Dependencies:** Task 2 (`ROOFTOP_LAYOUT_PAINT` exists), Task 3 (`FACADE_LAYOUT_PAINT` exists).

  **Files:** `src/components/actors/Factory.tsx`, `src/components/actors/Factory.test.tsx`

  **Estimated scope:** S by file count (1-2 files), but the highest-risk and most intricate diff
  in this plan — budget a full focused session, not a quick edit; this is the task the entire
  plan exists to protect via Tasks 1-3.

### Checkpoint: Integration

- [ ] `npm run build:types`, `npm run lint`, `npm test` (full suite), `npm run build` all clean.
- [ ] The Task 4 regression test (call-count spy) is green against the new code and was confirmed
      red against the old code.
- [ ] Review with human before proceeding to Phase 4.

---

### Phase 4: Verification & Close-out

- [ ] **Task 5: Manual profiler re-verification + documentation close-out**

  **Description:** No production code changes. Closes the loop the backlog itself specified: the
  bug was found via React DevTools Profiler (Ranked view); the fix should be confirmed the same
  way, on the same branch, by the same method. Spec §5, §6.

  **Acceptance criteria / checklist:**
  - [ ] `npm run dev`, open a locale with ~36 factories, record ~2s of idle time in the world view
        with React DevTools Profiler's Ranked view.
  - [ ] Confirm the once/sec `FactoryInner` re-render no longer shows `ROOFTOP_RENDERERS`/
        `FACADE_RENDERERS`/`computeWindowGridLayout`/`computePitchedRoofLayout`/
        `computeCrownSpireLayout` (or their callers) in the flame graph during a tick where only
        `activeLocaleLocalTime` changed — only the cheap paint-side `applyColorShift` calls should
        appear.
  - [ ] Record the new total main-thread time for one tick and compare against the ~150ms
        baseline the backlog entry recorded (2026-09-14 profiler samples).
  - [ ] Visually spot-check: day/night lighting still visibly transitions on bodies, belts, and
        the 5 dynamic greebles; the 8 static-only greebles still render correctly (no missing
        machinery/antennae/etc.).
  - [ ] Update `docs/todo/backlog.md` item 21: mark it fixed, link this plan and the live
        profiler numbers, matching items 14-18's own "found → fixed → live-verified" pattern.
  - [ ] `docs/BUILDING_DESIGN.md`'s "Greeble Renderers" section gets a short addendum noting the
        internal layout/paint split for the 5 lighting-dependent renderers, and that
        `render<Greeble>` remains the stable public entry point (spec §6) — optional polish, not
        blocking.

  **Verification:**
  - [ ] No automated verification beyond re-running `npm test`/`npm run build` once more after any
        doc edits (docs changes can't break the build, but confirm anyway per house habit).

  **Dependencies:** Task 4.

  **Files:** `docs/todo/backlog.md`, `docs/BUILDING_DESIGN.md` (optional)

  **Estimated scope:** XS (no production code; profiler session + two doc edits)

### Checkpoint: Complete

- [ ] All acceptance criteria across all 5 tasks met.
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Live profiler numbers recorded and compare favorably against the ~150ms/tick baseline.
- [ ] `docs/todo/backlog.md` item 21 marked fixed.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The east/west variable-naming quirk in `renderWindowGrid` (facadeGreebles.tsx) gets "fixed" accidentally while porting it into `computeWindowGridLayout` (Task 3) | Low-Medium — would silently change which face's windows use which seed, a real visual regression this plan's own tests might not catch if written against the same (already-ported) code | Task 3's acceptance criteria explicitly require byte-identical `facadeGreebles.test.tsx` results; write/run those tests against a copy of the *original* function first if there's any doubt during implementation |
| Task 4's regression spy test is written loosely enough that it passes even without the fix (false green) | Medium — the one test that actually proves the bug is fixed silently doesn't | Task 4's acceptance criteria explicitly require confirming the test fails against pre-Task-4 code before treating it as done |
| Manual profiler re-check (Task 5) is skipped or deferred indefinitely, same as several "not run this session" caveats in prior plans (e.g. `ROBOT_SELECTION_FILTER_PANEL.md`) | Medium — the actual perf claim goes unverified in the real app despite all tests passing | Task 5 is its own phase/checkpoint, not folded into Task 4's "done" state; `docs/todo/backlog.md` item 21 is explicitly not marked fixed until this step's numbers are recorded |

## Open Questions

Resolved (confirmed directly with Crawford, 2026-09-14):

- ~~**`useMemo` vs. a new child component (§7.1)?**~~ **Resolved: `useMemo`.** See the "Confirm
  Open Judgment Calls" checkpoint above.
- ~~**`ROOFTOP_LAYOUT_PAINT`/`FACADE_LAYOUT_PAINT`'s `unknown`-typed shape vs. a discriminated
  union (§7.2)?**~~ **Resolved: keep the pragmatic `unknown`-typed maps.** Same checkpoint.

Still open, not resolved by this task breakdown:

1. **`RobotBody.tsx`'s identical `activeLocaleLocalTime` re-render pattern** — now tracked
   separately as [docs/todo/backlog.md #22](../todo/backlog.md#22-robotbody-every-robot-re-renders-oncesec-for-daynight-lighting).
   Not part of this plan.
2. **`docs/BUILDING_DESIGN.md` addendum (Task 5)** — marked optional/non-blocking; left to
   whoever closes out Task 5 to decide if it's worth the extra few minutes.
