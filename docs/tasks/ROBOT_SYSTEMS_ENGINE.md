# Implementation Plan: Robot Systems Engine (Roadmap Phase 7)

Source spec: [docs/specs/ROBOT_SYSTEMS_ENGINE.md](../specs/ROBOT_SYSTEMS_ENGINE.md). Source intent: [docs/intent/robot-systems-engine.md](../intent/robot-systems-engine.md).

## Overview

Build the pure Battery/Docking/Job domain models and state machines (`src/systems/robotSystems.ts`,
new), wire them into locale load and the two existing systems that need docking-awareness
(`idleSystem.ts`, `collisionSystem.ts`), and retire the dynamic spawn/despawn/persistence
scaffolding they replace (`spawnSystem.ts`'s scheduler, `removeSystem.ts`, `persists`, "+ New
Robot"). The scope matches spec §2's file list exactly; this plan sequences it and resolves spec
§7's six open questions before any task is written.

## Architecture Decisions

Resolving spec §7's open questions up front, not during implementation:

- **§7.1 — Field naming, adopted as final.** `docking: DockingState`, `dockingHoldUntilMeasure?:
  number`, `batteryLevel: number`, `job?: { type: JobType; assignedAtMeasure: number }`, exactly as
  spec §4 proposed. No further bikeshedding during implementation.
- **§7.2 — Departing→Docked is an instant position snap, no exit animation.** Matches the
  confirmed "hard mute, no fade" simplicity for audio — `removeSystem.ts`'s exit-swim logic is
  deleted wholesale (see §7.4 below), not repurposed. This is a real design choice, not a
  placeholder: revisit only if a future phase explicitly asks for a docking exit animation.
- **§7.3 — `spawnSystem.ts` keeps its filename and its exported function name (`spawnRobot`).**
  No rename to `createRobot` — the function's *behavior* changes (scheduler/min-max logic
  removed, `docking`/`batteryLevel` params added) but renaming it adds diff noise for no
  behavioral gain. The file keeps creating robots; "spawn" in the roster-creation sense (not the
  dynamic-timer sense) is still an accurate name.
- **§7.4 — `removeSystem.ts` and `removeSystem.test.ts` are deleted outright** once nothing
  references `removeRobotWithExit` (Task 14, after Task 12 removes its only caller). No empty
  placeholder file — nothing in this repo's convention keeps dead scaffolding around for a
  hypothetical future phase.
- **§7.5 — `docs/ROBOT_LIFECYCLE.md`'s content is written in Task 19**, against the final shipped
  API, not drafted speculatively now.
- **§7.6 — Dock-position and pitch-drift seeding scheme.** `robotSystems.ts` gets its own
  module-level `dockCycleCounters: Map<string, number>` (keyed by robot ID), incremented every
  time a robot lands on `Docked` — the same pattern `idleSystem.ts`'s `idleMoveCounters` and
  `spawnSystem.ts`'s `spawnCounters` already use. That counter is the `getSeededVal` offset for
  both `'robot.dock.pos'` (fed into `generateSpawnPosition`) and `'robot.pitchDrift'` (fed into a
  closure-counter `rand` for `reRollMelodyPitches`, mirroring `spawnSystem.ts`'s existing
  `melodyRand` closure exactly — see spec §4).
- **New: no import cycle between `robotSystems.ts` and `spawnSystem.ts`.** `robotSystems.ts`
  imports `generateSpawnPosition` from `spawnSystem.ts` (one-directional — it's a general
  "pick a position outside the viewBox" utility, not spawn-specific in behavior). `spawnSystem.ts`
  never imports from `robotSystems.ts`. Consequence: `spawnInitialRoster` (Task 12) creates all 12
  robots with `docking`/`batteryLevel` set but **no `job`** yet — `worldTransition.ts`'s
  `initializeLocale` (Task 15), which already imports both systems modules, calls
  `robotSystems.ts`'s `assignJob` once per initially-`Active` robot immediately after
  `spawnInitialRoster` returns. `robotSystems.ts`'s own `landOnActive` (used for every *later*
  Docking→Active transition) still calls `assignJob` internally — only the spawn-time path is
  relocated to the orchestrator, for exactly the same reason `worldTransition.ts` already
  orchestrates `placeFactories` + `spawnRobot` + `startSpawnScheduler` today rather than any one
  systems module calling another.
- **`spawnRobot`'s `reserveVoice`/`registerRobotMelody` calls become conditional** on
  `docking === DockingState.Active` — a robot created `Docked` gets no voice reserved and no
  melody registered until it actually lands on `Active` for the first time.

## Dependency Graph

```
Task 1 (types/Robot.ts)  ──┬──→ Task 2 (constants/index.ts — needs JobType)
                             │
Task 3 (types/locale.ts) ───┤ (independent of 1/2)
                             │
Task 4 (melodyGenerator.ts: reRollMelodyPitches) ──→ Task 5 (its test)
                             │
                             ├──→ Task 6 (robotSystems.ts: battery/docking tick)
                             │         │
                             │         ├──→ Task 7 (robotSystems.ts: job scoring/assignment)
                             │         │         │
                             │         │         └──→ Task 8 (robotSystems.ts: landing effects,
                             │         │                       needs Task 4's reRollMelodyPitches
                             │         │                       + spawnSystem's generateSpawnPosition)
                             │         │                   │
                             │         │                   └──→ Task 9 (robotSystems.test.ts)
                             │         │
                             ├──→ Task 10 (idleSystem.ts guard + test)      ┐ parallel-safe
                             └──→ Task 11 (collisionSystem.ts guard + test) ┘ with each other
                                       │
                                       └──→ (both need DockingState from Task 1 only)

Task 9 + Task 10 + Task 11 ──→ Checkpoint: Core Engine
                                       │
Task 7 (assignJob) + Task 2 (INITIAL_ACTIVE_ROBOTS_MIN/MAX) ──→ Task 12 (spawnSystem.ts retirement
                                       │                                  + spawnInitialRoster)
                                       │                                  │
                                       │                                  ├──→ Task 13 (its test)
                                       │                                  ├──→ Task 14 (delete
                                       │                                  │     removeSystem.ts —
                                       │                                  │     its only caller is
                                       │                                  │     now gone)
                                       │                                  └──→ Task 15
                                       │                                        (worldTransition.ts
                                       │                                        rewiring + initial
                                       │                                        assignJob loop +
                                       │                                        its test)
                                       │
Task 1 (persists removed) ───────────────────────→ Task 16 (RobotMetaTab.tsx + test)
Task 12 (spawnRobot signature change) ───────────→ Task 17 (RobotsTab.tsx + test)
Task 1 + Task 2 ──────────────────────────────────→ Task 18 (localeStore.ts batteryLevel clamp + test)

Tasks 1–18 ──→ Task 19 (docs: ROBOT_LIFECYCLE.md, UI_SHELL.md, CLAUDE.md, roadmap.md)
```

Tasks 6–9 (`robotSystems.ts` + its test) form one sequential chain within a single new file — no
parallelization within it. Tasks 10 and 11 are parallel-safe with each other and depend only on
Task 1. Tasks 16, 17, and 18 are parallel-safe with each other once their respective dependencies
land.

## Task List

### Phase 1: Foundation

- [ ] **Task 1: `src/types/Robot.ts` — new state machines, new fields, remove `persists`**

  **Description:** Add `DockingState` and `JobType` const-objects matching `RobotState`'s exact
  pattern; add `docking`, `dockingHoldUntilMeasure`, `batteryLevel`, `job` to `Robot`; remove
  `persists`.

  **Acceptance criteria:**
  - [ ] `DockingState = { Docked: 'docked', Docking: 'docking', Departing: 'departing', Active:
    'active' } as const` + derived `DockingState` type, same shape as `RobotState` (`Robot.ts:14-21`)
  - [ ] `JobType = { VentExtraction: 'ventExtraction', AcousticSurvey: 'acousticSurvey',
    StructuralInspection: 'structuralInspection', FluidMonitoring: 'fluidMonitoring' } as const` +
    derived type
  - [ ] `Robot.docking: DockingState` (required, not optional — every robot has a docking state
    from creation)
  - [ ] `Robot.dockingHoldUntilMeasure?: number`
  - [ ] `Robot.batteryLevel: number` (required, 0–100)
  - [ ] `Robot.job?: { type: JobType; assignedAtMeasure: number }`
  - [ ] `Robot.persists?: boolean` removed entirely

  **Verification:**
  - [ ] `npm run build:types` — expect NEW errors everywhere `persists` was read/written
    (`RobotMetaTab.tsx`, `spawnSystem.ts`) and everywhere a `Robot` literal is constructed without
    the new required fields (`spawnSystem.ts`); expected until Tasks 12/16 land, not a defect here
  - [ ] `npm run lint` clean for `types/Robot.ts` itself

  **Dependencies:** None.

  **Files:** `src/types/Robot.ts`, `src/engine/AudioEngine.test.ts`, `src/systems/interactionSystem.test.ts`
  (discovered via `npm run build:types` after the type change — these two test files build a
  `Robot` fixture but aren't otherwise touched by any later task, so their one-line
  `docking`/`batteryLevel` fixture additions are folded into this task rather than left as an
  untracked gap)

  **Estimated scope:** XS (3 files, two of which are one-line fixture additions)

- [ ] **Task 2: `src/constants/index.ts` — new Battery/Docking/Job constants**

  **Description:** Add the numeric constants `tickRobotLifecycle`/`spawnInitialRoster`/
  `scoreJobAffinities` depend on, and update `MAX_ROBOTS`'s doc comment.

  **Acceptance criteria:**
  - [ ] `INITIAL_ACTIVE_ROBOTS_MIN = 2`, `INITIAL_ACTIVE_ROBOTS_MAX = 4`
  - [ ] `BATTERY_DRAIN_BASE = 2`
  - [ ] `JOB_BATTERY_DRAIN_SURCHARGE: Record<JobType, number> = { ventExtraction: 1,
    acousticSurvey: 3, structuralInspection: 5, fluidMonitoring: 7 }` (imports `JobType` from
    `types/Robot.ts`)
  - [ ] `BATTERY_RECHARGE_RATE = 5`
  - [ ] `BATTERY_CRITICAL_THRESHOLD = 10`, `BATTERY_FULL_THRESHOLD = 100`
  - [ ] `DOCKED_PITCH_DRIFT_RATIO = 0.25`
  - [ ] `JOB_MAX_ROBOTS_PER_TYPE = 3`
  - [ ] `MAX_ROBOTS`'s doc comment describes it as "fixed roster size" rather than "ceiling"

  **Verification:**
  - [ ] `npm run build:types` passes for `constants/index.ts` itself
  - [ ] `npm run lint` clean for `constants/index.ts`

  **Dependencies:** Task 1 (needs `JobType`).

  **Files:** `src/constants/index.ts`

  **Estimated scope:** XS (1 file)

- [ ] **Task 3: `src/types/locale.ts` — trim `LocaleSettings`**

  **Description:** Remove the four fields that only existed to configure the retired dynamic
  spawn scheduler.

  **Acceptance criteria:**
  - [ ] `maxRobots`, `minRobots`, `autoSpawn`, `spawnFrequency` removed from `LocaleSettings`
  - [ ] The `[key: string]: unknown` index signature stays (other settings, e.g. `bpm`, are
    unaffected)

  **Verification:**
  - [ ] `npm run build:types` — no new errors expected: `LocaleSettings`' `[key: string]: unknown`
    index signature means `constants/index.ts`'s `DEFAULT_LOCALE` and `worldTransition.ts`'s
    `buildLocale` (both still construct the old `settings` shape) type-check without complaint even
    though the named fields are gone; actual removal of the stale fields from those two literals is
    still Task 15's job, just not compiler-enforced in between
  - [ ] `npm run lint` clean for `types/locale.ts`

  **Dependencies:** None (parallel-safe with Tasks 1–2).

  **Files:** `src/types/locale.ts`

  **Estimated scope:** XS (1 file)

### Checkpoint: Foundation

- [ ] `npm run build:types` shows only the expected downstream errors (files later tasks haven't
  touched yet) — no *unexpected* errors elsewhere.
- [ ] `npm run lint` passes on the three touched files.

### Phase 2: Melody Pitch-Drift Helper

- [ ] **Task 4: `src/engine/melodyGenerator.ts` — add `reRollMelodyPitches`**

  **Description:** New exported function re-rolling a seeded ratio of a melody's `noteIndex`
  values, reusing the already-exported `pickRandomIndices` and `pickWeightedIndex` — no new
  selection logic invented, per spec §4.

  **Acceptance criteria:**
  - [ ] `reRollMelodyPitches(melody, ratio, opts: { noteVariance?: ToggleValue; rand: () => number
    })` exported
  - [ ] Number of events changed = `Math.max(1, Math.round(melody.length * ratio))`
  - [ ] Changed events selected via `pickRandomIndices` (existing export, line 124) — not a new
    shuffling implementation
  - [ ] `noteVariance?.active === true` → new `noteIndex` via `pickWeightedIndex(rand)` (existing
    export, line 480); `false`/absent → `Math.floor(rand() * 8)` (unweighted)
  - [ ] `startStep`, `length`, and `octave` are identical on every returned event, including
    changed ones — only `noteIndex` differs
  - [ ] Unchanged events are the exact same object reference or a shallow-equal copy (caller
    shouldn't need to care which, but no unrelated field is mutated)

  **Verification:**
  - [ ] `npm run build:types` passes for `melodyGenerator.ts` itself
  - [ ] `npm run lint` clean

  **Dependencies:** None (independent of Foundation; parallel-safe with Tasks 1–3).

  **Files:** `src/engine/melodyGenerator.ts`

  **Estimated scope:** XS (1 file, small self-contained function)

- [ ] **Task 5: `src/engine/melodyGenerator.test.ts` — test `reRollMelodyPitches`**

  **Description:** New describe block covering the ratio math, seeded determinism, and the
  rhythm-untouched guarantee.

  **Acceptance criteria:**
  - [ ] Given a fixed `rand` seed, exactly `Math.round(melody.length * 0.25)` events (floor 1)
    have a different `noteIndex` than the input; all others are unchanged
  - [ ] `startStep`/`length`/`octave` unchanged on every event, including re-rolled ones (assert
    across the whole melody, not just spot-checked)
  - [ ] `noteVariance: { active: false }` produces picks in `[0,8)` with no weighting assumption
    baked into the assertion beyond range
  - [ ] `noteVariance: { active: true, value: N }` produces picks that are valid `pickWeightedIndex`
    outputs (i.e. never asserts an impossible index)
  - [ ] A 1-event melody with `ratio: 0.25` still changes exactly 1 event (floor-of-1 regression)

  **Verification:**
  - [ ] `npx vitest run src/engine/melodyGenerator.test.ts` — all passing
  - [ ] `npm run build:types` passes for the test file

  **Dependencies:** Task 4.

  **Files:** `src/engine/melodyGenerator.test.ts`

  **Estimated scope:** XS (1 file)

### Phase 3: `robotSystems.ts` — the core deliverable

- [ ] **Task 6: `src/systems/robotSystems.ts` — battery tick + docking transitions**

  **Description:** New file. Implements the per-measure battery drain/recharge math and the
  threshold-triggered `Docking`/`Departing` state entry (hold-until-next-measure), plus the
  `startRobotLifecycle`/`stopRobotLifecycle`/`tickRobotLifecycle` scaffolding. Landing effects
  (Task 8) and job assignment (Task 7) are stubbed as no-ops or TODOs at this point — this task is
  the pure state-machine skeleton only.

  **Acceptance criteria:**
  - [ ] `tickRobotLifecycle(localeId, measure)` exported, pure with respect to its inputs (reads/
    writes only via `useLocaleStore`)
  - [ ] `Active` robots: `batteryLevel` decreases by `BATTERY_DRAIN_BASE +
    JOB_BATTERY_DRAIN_SURCHARGE[job.type]` (0 surcharge if no job yet) per tick, floored at 0
  - [ ] `Docked` robots: `batteryLevel` increases by `BATTERY_RECHARGE_RATE` per tick, capped at 100
  - [ ] `Active` robot crossing `≤ BATTERY_CRITICAL_THRESHOLD` → `docking: Departing`,
    `dockingHoldUntilMeasure: measure + 1` (not immediately `Docked`)
  - [ ] `Docked` robot crossing `≥ BATTERY_FULL_THRESHOLD` → `docking: Docking`,
    `dockingHoldUntilMeasure: measure + 1` (not immediately `Active`)
  - [ ] `Docking`/`Departing` robot with `measure >= dockingHoldUntilMeasure` → lands on
    `Active`/`Docked` respectively (calling stub `landOnActive`/`landOnDocked` functions — full
    bodies land in Task 8), clearing `dockingHoldUntilMeasure`
  - [ ] `startRobotLifecycle(localeId)` / `stopRobotLifecycle()` exported, module-singleton pattern
    identical to `spawnSystem.ts`'s current `startSpawnScheduler`/`stopSpawnScheduler` (one active
    `subscribeToMeasure` unsubscribe-function stored in module state; idempotent start; safe
    repeated stop)
  - [ ] Uses `subscribeToMeasure` from `beatClock.ts` — no `setTimeout`/`setInterval`

  **Verification:**
  - [ ] `npm run build:types` passes for `robotSystems.ts` itself (its test is Task 9)
  - [ ] `npm run lint` clean

  **Dependencies:** Task 1, Task 2.

  **Files:** `src/systems/robotSystems.ts`

  **Estimated scope:** S (1 file, concentrated new logic)

- [ ] **Task 7: `src/systems/robotSystems.ts` — job affinity scoring + assignment**

  **Description:** Add `scoreJobAffinities` (pure) and `assignJob` (store-writing) to the same
  file, per spec §1's four job profiles.

  **Acceptance criteria:**
  - [ ] `scoreJobAffinities(robot): Record<JobType, number>` exported, pure — same robot
    attributes in, same scores out
  - [ ] Vent Extraction scores highest for low-register (`octaveRange` skewed low), dense
    (`rhythmicDensity` high), short-motif, low-`noteVariance` robots
  - [ ] Acoustic Survey scores highest for high-register, sparse, long/inactive-motif,
    high/unrestricted-variance robots
  - [ ] Structural Inspection scores highest for wide `octaveRange` span, mid-length motifs,
    balanced density
  - [ ] Fluid Monitoring scores highest for mid-register, default/mid density and variance
  - [ ] `assignJob(localeId, robotId)` exported: sorts the four types by score descending, skips
    any type already at `JOB_MAX_ROBOTS_PER_TYPE` active assignments in that locale, writes the
    first available type + `assignedAtMeasure: getCurrentMeasure()` to the robot's `job` field via
    `updateRobot`
  - [ ] All scoring inputs are the robot's already-stored, already-seeded attributes — no new
    `Math.random`/`getSeededVal` call introduced for scoring itself (the *inputs* were seeded at
    spawn; the *scoring function* is deterministic arithmetic, no additional randomness)

  **Verification:**
  - [ ] `npm run build:types` passes for `robotSystems.ts`
  - [ ] `npm run lint` clean

  **Dependencies:** Task 6 (same file, sequenced to avoid concurrent edits).

  **Files:** `src/systems/robotSystems.ts`

  **Estimated scope:** S (same file, additive)

- [ ] **Task 8: `src/systems/robotSystems.ts` — landing effects**

  **Description:** Implement `landOnActive`/`landOnDocked` for real (replacing Task 6's stubs):
  audio mute/unmute, idle-wander restart, dock positioning, and pitch drift.

  **Acceptance criteria:**
  - [ ] `landOnActive`: sets `docking: Active`, clears `dockingHoldUntilMeasure`; calls
    `AudioEngine.reserveVoice`/`registerRobotMelody` (guarded the same way `spawnSystem.ts`
    already guards — only if `audioAttributes.layers` is a non-empty array); calls `assignJob`
    (Task 7); calls `handleRobotIdle(localeId, robotId)` (imported from `idleSystem.ts`) to restart
    wandering, since `Robot.tsx` only calls it on mount
  - [ ] `landOnDocked`: sets `docking: Docked`, clears `dockingHoldUntilMeasure`; increments this
    robot's `dockCycleCounters` entry; repositions via `generateSpawnPosition(noiseMap,
    dockCycleCount)` (imported from `spawnSystem.ts` — see Architecture Decisions' no-cycle note);
    re-rolls melody via `reRollMelodyPitches(robot.melody, DOCKED_PITCH_DRIFT_RATIO, { noteVariance:
    robot.noteVariance, rand: <seeded closure keyed 'robot.pitchDrift', per Architecture
    Decisions> })`; calls `AudioEngine.releaseVoice`/`unregisterRobotMelody`
  - [ ] `dockCycleCounters: Map<string, number>` is module state, not persisted to the store
  - [ ] No `AudioEngine` method is called that doesn't already exist on its public surface (no new
    capability)

  **Verification:**
  - [ ] `npm run build:types` passes for `robotSystems.ts`
  - [ ] `npm run lint` clean

  **Dependencies:** Task 4 (`reRollMelodyPitches`), Task 6, Task 7 (`assignJob`).

  **Files:** `src/systems/robotSystems.ts`

  **Estimated scope:** S (same file, additive — ties the module together)

- [ ] **Task 9: `src/systems/robotSystems.test.ts` — full test suite**

  **Description:** New test file covering Tasks 6–8's combined behavior, per spec §5's
  `robotSystems.test.ts` coverage list.

  **Acceptance criteria:**
  - [ ] Drain math correct for all four job types plus the no-job case (0 surcharge)
  - [ ] Recharge math correct, clamped at 100
  - [ ] Critical-threshold crossing → `Departing` with `dockingHoldUntilMeasure`, not immediate
    `Docked`
  - [ ] Full-threshold crossing → `Docking` with `dockingHoldUntilMeasure`, not immediate `Active`
  - [ ] Hold-elapsed → lands on `Active`/`Docked`, `dockingHoldUntilMeasure` cleared
  - [ ] Landing on `Active`: `reserveVoice`/`registerRobotMelody` called (spy/mock `AudioEngine`),
    `job` assigned, `handleRobotIdle` invoked (spy/mock `idleSystem`)
  - [ ] Landing on `Docked`: `releaseVoice`/`unregisterRobotMelody` called, position off-screen,
    ~25% of `noteIndex` values changed, rhythm fields unchanged
  - [ ] `scoreJobAffinities` deterministic; each profile scores highest for a robot matching its
    description
  - [ ] `assignJob` respects `JOB_MAX_ROBOTS_PER_TYPE` — 4th robot for an already-full job type
    gets its next-best available type
  - [ ] `startRobotLifecycle`/`stopRobotLifecycle` idempotent, matching `spawnSystem.test.ts`'s
    existing scheduler-lifecycle test style (before this phase deletes those specific tests in
    Task 13)

  **Verification:**
  - [ ] `npx vitest run src/systems/robotSystems.test.ts` — all passing
  - [ ] `npm run build:types` passes for the test file

  **Dependencies:** Task 8.

  **Files:** `src/systems/robotSystems.test.ts`

  **Estimated scope:** M (1 file, broad coverage)

### Phase 4: Existing-System Docking Guards

- [ ] **Task 10: `src/systems/idleSystem.ts` — docking guard**

  **Description:** `handleRobotIdle` must no-op for non-`Active` robots so a `Docked` robot never
  wanders off its dock position.

  **Acceptance criteria:**
  - [ ] Early-return condition becomes `!robot || robot.state !== RobotState.Idle ||
    robot.docking !== DockingState.Active`
  - [ ] No other logic in the file changes

  **Verification:**
  - [ ] `npx vitest run src/systems/idleSystem.test.ts` — all passing, including new test below
  - [ ] `npm run build:types` passes

  **Dependencies:** Task 1 (`DockingState`).

  **Files:** `src/systems/idleSystem.ts`, `src/systems/idleSystem.test.ts`

  **Estimated scope:** XS (2 files, one-line guard + one test)

- [ ] **Task 11: `src/systems/collisionSystem.ts` — docking guard**

  **Description:** `canInteract` must exclude non-`Active` robots so a `Docked` (muted) robot is
  never flagged into an audible `triggerInteraction` by the ticker, which iterates every robot in
  the store regardless of render state.

  **Acceptance criteria:**
  - [ ] `validState` becomes `(robot.state === RobotState.Idle || robot.state ===
    RobotState.Moving) && robot.docking === DockingState.Active`
  - [ ] No other logic in the file changes

  **Verification:**
  - [ ] `npx vitest run src/systems/collisionSystem.test.ts` — all passing, including new test below
  - [ ] `npm run build:types` passes

  **Dependencies:** Task 1 (parallel-safe with Task 10).

  **Files:** `src/systems/collisionSystem.ts`, `src/systems/collisionSystem.test.ts`

  **Estimated scope:** XS (2 files, one-line guard + one test)

### Checkpoint: Core Engine

- [ ] `npm test` passes for `robotSystems.test.ts`, `melodyGenerator.test.ts`, `idleSystem.test.ts`,
  `collisionSystem.test.ts`.
- [ ] `npm run build:types` passes for every file touched in Phases 1–4 (`spawnSystem.ts`,
  `worldTransition.ts`, and the UI files remain broken until Phases 5–6 — expected).
- [ ] Manual/unit spot check: calling `tickRobotLifecycle` repeatedly against a hand-built `Active`
  robot with a critical-drain job drives it to `Departing` then `Docked` within the expected number
  of ticks.

### Phase 5: Roster Creation Retirement

- [ ] **Task 12: `src/systems/spawnSystem.ts` — remove scheduler, add `spawnInitialRoster`**

  **Description:** Remove `startSpawnScheduler`/`stopSpawnScheduler`/`SPAWN_INTERVAL_MIN/MAX` and
  the min/max "bounce" branch in `spawnRobot`; remove `persists: false` from the constructed
  `Robot`; add `docking`/`batteryLevel` handling to `spawnRobot`; add new `spawnInitialRoster
  (localeId)` looping 12× with the seeded 2–4-active/rest-docked split; remove
  `reRegisterAllRobotsAudio`/`removeNonPersistentRobots` (no more power-cycle removal).

  **Acceptance criteria:**
  - [ ] `startSpawnScheduler`, `stopSpawnScheduler`, `SPAWN_INTERVAL_MIN`, `SPAWN_INTERVAL_MAX`
    removed
  - [ ] `spawnRobot`'s min/max "bounce" branch (the `if (robots.length >= maxRobots) { ... }`
    block) removed
  - [ ] `spawnRobot` accepts `docking: DockingState` and `batteryLevel: number` (or computes them
    internally when called by `spawnInitialRoster` — implementer's choice, but the constructed
    `Robot` always has both set, never defaulted implicitly)
  - [ ] `spawnRobot`'s `AudioEngine.reserveVoice`/`registerRobotMelody` calls are conditional on
    `docking === DockingState.Active` — a robot created `Docked` gets neither
  - [ ] `persists: false` removed from the constructed `Robot` literal
  - [ ] `spawnInitialRoster(localeId)` exported: creates exactly `MAX_ROBOTS` (12) robots; a
    seeded count in `[INITIAL_ACTIVE_ROBOTS_MIN, INITIAL_ACTIVE_ROBOTS_MAX]` are `Active`, the rest
    `Docked`; every `Docked` robot's `batteryLevel` is seeded and varied (not all identical, not
    all 100); does **not** assign jobs (per Architecture Decisions' no-cycle note — that's
    `worldTransition.ts`'s job in Task 15)
  - [ ] `reRegisterAllRobotsAudio`, `removeNonPersistentRobots` removed
  - [ ] `import { removeRobotWithExit } from './removeSystem'` (if present) removed — its only
    call site was the deleted bounce branch

  **Verification:**
  - [ ] `npm run build:types` passes for `spawnSystem.ts` itself (its test is Task 13; callers in
    `worldTransition.ts`/`RobotsTab.tsx` remain broken until Tasks 15/17 — expected)
  - [ ] `npm run lint` clean

  **Dependencies:** Task 1, Task 2, Task 7 (`assignJob` not called here, but `spawnRobot`'s
  shape must match what `robotSystems.ts` expects a freshly-created `Robot` to look like).

  **Files:** `src/systems/spawnSystem.ts`

  **Estimated scope:** M (1 file, but a large removal + a new function)

- [ ] **Task 13: `src/systems/spawnSystem.test.ts` — rewrite for the new roster model**

  **Description:** Remove scheduler/min-max/bounce/persists tests; add coverage for
  `spawnInitialRoster`.

  **Acceptance criteria:**
  - [ ] All `startSpawnScheduler`/`stopSpawnScheduler`/min-max-bounce/`persists`-related tests
    removed
  - [ ] New test: `spawnInitialRoster` produces exactly 12 robots
  - [ ] New test: the `Active` count falls within `[INITIAL_ACTIVE_ROBOTS_MIN,
    INITIAL_ACTIVE_ROBOTS_MAX]`
  - [ ] New test: every `Docked` robot's `batteryLevel` is seeded (deterministic across two runs
    against the same coordinates) and not uniformly identical across the roster
  - [ ] New test: `Docked` robots have no voice reserved / melody registered
    (`AudioEngine.getVoiceForRobot`/`getRegisteredMelody` empty); `Active` robots do
  - [ ] Existing robot-ID-determinism tests (from Phase 6) still pass unmodified

  **Verification:**
  - [ ] `npx vitest run src/systems/spawnSystem.test.ts` — all passing
  - [ ] `npm run build:types` passes

  **Dependencies:** Task 12.

  **Files:** `src/systems/spawnSystem.test.ts`

  **Estimated scope:** S (1 file)

- [ ] **Task 14: Delete `src/systems/removeSystem.ts` and `removeSystem.test.ts`**

  **Description:** Its only caller (`spawnSystem.ts`'s bounce branch) is gone as of Task 12 —
  remove the dead file pair outright, per Architecture Decisions §7.4.

  **Acceptance criteria:**
  - [ ] `src/systems/removeSystem.ts` deleted
  - [ ] `src/systems/removeSystem.test.ts` deleted
  - [ ] `grep -r "removeRobotWithExit\|from '.*removeSystem'" src` returns nothing

  **Verification:**
  - [ ] `npm run build:types` — no new errors (confirms nothing still imports from the deleted file)
  - [ ] `npm run lint` clean project-wide

  **Dependencies:** Task 12.

  **Files:** `src/systems/removeSystem.ts` (deleted), `src/systems/removeSystem.test.ts` (deleted)

  **Estimated scope:** XS (deletion only)

- [ ] **Task 15: `src/systems/worldTransition.ts` — rewire locale bring-online**

  **Description:** Replace the two-`spawnRobot`-calls-plus-scheduler init sequence with
  `spawnInitialRoster` + `startRobotLifecycle`, add the initial `assignJob` loop for
  spawn-time-`Active` robots, and trim `buildLocale`'s `settings` shape to match Task 3's
  `LocaleSettings`.

  **Acceptance criteria:**
  - [ ] `initializeLocale`'s `if (locale.robots.length === 0) { spawnRobot(localeId);
    spawnRobot(localeId); }` replaced with `if (locale.robots.length === 0) {
    spawnInitialRoster(localeId); }`
  - [ ] Immediately after roster creation, every robot whose `docking === DockingState.Active` gets
    `robotSystems.ts`'s `assignJob(localeId, robot.id)` called once
  - [ ] `stopSpawnScheduler()`/`startSpawnScheduler(localeId)` calls replaced with
    `stopRobotLifecycle()`/`startRobotLifecycle(localeId)`
  - [ ] `buildLocale`'s `settings: { bpm: 60, maxRobots: 12, minRobots: 2, autoSpawn: true,
    spawnFrequency: 4 }` becomes `settings: { bpm: 60 }` (matching Task 3's trimmed
    `LocaleSettings`)
  - [ ] `constants/index.ts`'s `DEFAULT_LOCALE.settings` gets the same trim (cross-check — this
    constant lives in `constants/index.ts`, not `worldTransition.ts`, but is the same shape and
    must be updated in this task to avoid a stray compile error)

  **Verification:**
  - [ ] `npx vitest run src/systems/worldTransition.test.ts` — all passing
  - [ ] `npm run build:types` passes project-wide for every file touched so far (RobotsTab/
    RobotMetaTab remain broken until Tasks 16–17 — expected)

  **Dependencies:** Task 3, Task 12, Task 8 (needs `startRobotLifecycle`/`assignJob` to exist).

  **Files:** `src/systems/worldTransition.ts`, `src/systems/worldTransition.test.ts`,
  `src/constants/index.ts`

  **Estimated scope:** S (3 files, one of which is a one-line follow-up in an already-touched file)

### Checkpoint: Roster Creation Retirement

- [ ] `npm test` passes for `spawnSystem.test.ts`, `worldTransition.test.ts`.
- [ ] `npm run build:types` — only `RobotMetaTab.tsx`/`RobotsTab.tsx` (Phase 6) remain broken.
- [ ] Manual check: `initializeLocale` on a fresh locale produces 12 robots with the documented
  active/docked split, no stray scheduler running.

### Phase 6: UI Removal + Store Clamp

- [ ] **Task 16: `src/components/panels/screen/console/RobotMetaTab.tsx` — remove Persist**

  **Description:** Remove the Persist `Switch.Root` control and its supporting state/handlers;
  drop `persists` from the copy-robot optional-field list.

  **Acceptance criteria:**
  - [ ] `currentPersists`/`persists`/`prevPersists`/`togglePersists` state and handler removed
  - [ ] The Persist `row control-row` JSX block removed
  - [ ] `performCopyFromTarget`'s `optFields` list no longer includes `persists` (it never did per
    spec — confirm it wasn't silently relying on the removed field)
  - [ ] Name editing, Age display, and Copy Robot controls are otherwise unchanged

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/RobotMetaTab.test.tsx` — all passing
  - [ ] `npm run build:types` passes
  - [ ] Manual check: render the tab, confirm no Persist row appears, Copy Robot still works

  **Dependencies:** Task 1 (`persists` removed from the type forces this).

  **Files:** `src/components/panels/screen/console/RobotMetaTab.tsx`,
  `src/components/panels/screen/console/RobotMetaTab.test.tsx`

  **Estimated scope:** S (2 files)

- [ ] **Task 17: `src/components/panels/screen/console/RobotsTab.tsx` — remove "+ New Robot"**

  **Description:** The roster is now fixed at 12 robots created once at locale load — remove the
  manual spawn button entirely.

  **Acceptance criteria:**
  - [ ] `NEW_ROBOT_SCHEMA`, `handleNewRobot`, the `robots-tab__new-robot` wrapper div, and the
    `spawnRobot` import all removed
  - [ ] The tab renders only the robot list (name buttons navigating to `selectRobot`)

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/RobotsTab.test.tsx` — all passing
  - [ ] `npm run build:types` passes
  - [ ] Manual check: render the tab, confirm no "+ New Robot" button appears

  **Dependencies:** Task 12 (`spawnRobot`'s signature change would otherwise break this call site).

  **Files:** `src/components/panels/screen/console/RobotsTab.tsx`,
  `src/components/panels/screen/console/RobotsTab.test.tsx`

  **Estimated scope:** XS (2 files, pure removal)

- [ ] **Task 18: `src/stores/localeStore.ts` — clamp `batteryLevel`**

  **Description:** Add `batteryLevel` to `updateRobot`'s normalized-field clamp block.

  **Acceptance criteria:**
  - [ ] `normalized.batteryLevel` clamped to `0–100` when present, following the existing
    `rhythmicDensity` clamp's exact style (`Math.max(0, Math.min(100, Math.trunc(...)))`)
  - [ ] New test: `updateRobot` clamps `batteryLevel` outside `0–100`

  **Verification:**
  - [ ] `npx vitest run src/stores/localeStore.test.ts` — all passing
  - [ ] `npm run build:types` passes

  **Dependencies:** Task 1, Task 2.

  **Files:** `src/stores/localeStore.ts`, `src/stores/localeStore.test.ts`

  **Estimated scope:** XS (2 files)

### Checkpoint: Complete Implementation

- [ ] `npm test` — all tests passing project-wide.
- [ ] `npm run build:types` — zero errors project-wide (no leftover `persists`/scheduler/
  `removeRobotWithExit` reference anywhere — spot-check with `grep -rn "persists\|autoSpawn\|
  minRobots\|maxRobots\|startSpawnScheduler\|removeRobotWithExit" src`, expecting zero hits outside
  historical test-fixture noise).
- [ ] `npm run lint` — zero errors project-wide.
- [ ] `npm run build` — production bundle builds cleanly.
- [ ] Manual check (`npm run dev`): load a fresh locale, confirm exactly 12 robots exist in the
  store, 2–4 visibly `Active`/audible, the rest silent and off-screen; watch for several minutes
  and confirm at least one full `Active`→`Departing`→`Docked`→`Docking`→`Active` cycle occurs,
  matching § 5's manual-check description in the spec.
- [ ] Review with human before proceeding to docs.

### Phase 7: Docs

- [ ] **Task 19: `docs/ROBOT_LIFECYCLE.md`, `docs/UI_SHELL.md`, `CLAUDE.md`, `docs/roadmap/roadmap.md`**

  **Description:** Document shipped behavior, per the roadmap's own Docs bullets and spec §7.5 —
  written against the final API, not the plan.

  **Acceptance criteria:**
  - [ ] New `docs/ROBOT_LIFECYCLE.md`, in `docs/MELODY_SYSTEM.md`'s style, documents
    `DockingState`/`JobType`, the battery drain/recharge formula and thresholds, the
    up-to-one-measure hold, the pitch-drift mechanic, and `robotSystems.ts`'s full exported API
  - [ ] `CLAUDE.md`'s reference doc list gains `docs/ROBOT_LIFECYCLE.md`
  - [ ] `docs/UI_SHELL.md`'s `robotOptions` "Planned Replacement" point folded in; its "+ New
    Robot" reference in § Console Navigation updated to reflect the removal
  - [ ] `docs/roadmap/roadmap.md` § 7's bullets marked resolved, mirroring the strikethrough+
    pointer pattern used for prior phases, pointing at `docs/specs/ROBOT_SYSTEMS_ENGINE.md`

  **Verification:**
  - [ ] Manual proofread: every claim in `ROBOT_LIFECYCLE.md` spot-checked against the actually-
    shipped code (constants, function names, field names), not reconstructed from this plan
  - [ ] Links resolve (relative paths correct)

  **Dependencies:** Tasks 1–18.

  **Files:** `docs/ROBOT_LIFECYCLE.md` (new), `docs/UI_SHELL.md`, `CLAUDE.md`,
  `docs/roadmap/roadmap.md`

  **Estimated scope:** S (4 files, text-only)

### Checkpoint: Complete

- [ ] All acceptance criteria across Tasks 1–19 met.
- [ ] Full verification suite green (`build:types`, `lint`, `test`, `build`).
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Import cycle between `robotSystems.ts` and `spawnSystem.ts` if job assignment is called from inside `spawnInitialRoster` | Medium | Resolved structurally in Architecture Decisions: `spawnInitialRoster` never calls `assignJob`; `worldTransition.ts` (Task 15) does, after roster creation returns |
| `collisionSystem.ts`'s ticker iterating all robots (not just rendered ones) is easy to miss since it's not obvious from the component tree | High if missed | Called out explicitly in spec §1/§2 and Task 11 — the one required change to already-shipping behavior, not left implicit |
| `spawnInitialRoster`'s seeded active/docked split accidentally collides in `getSeededVal` dataId with another spawn-time field, producing correlated (not independent) rolls | Low | Task 13's tests assert the split and battery levels are varied, not just present — would catch a degenerate all-2-or-all-4 pattern |
| Deleting `removeSystem.ts` (Task 14) before confirming no other caller exists | Low | Task 14's acceptance criteria includes a repo-wide grep, not just a build-passes check |
| `robotSystems.test.ts` (Task 9) mocking `AudioEngine`/`idleSystem` incorrectly, giving false-green landing-effect tests | Medium | Task 9 explicitly lists spy/mock assertions per effect (reserveVoice called, handleRobotIdle called) rather than only asserting store state, so a no-op mock would fail loudly |

## Open Questions

None remaining — spec §7's six items are resolved above under Architecture Decisions, plus one
additional import-cycle decision surfaced during planning itself (not present in the spec, since
it only becomes visible once file-level task boundaries are drawn).
