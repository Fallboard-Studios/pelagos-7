# Robot Lifecycle Specification

Source of truth: [`src/systems/robotSystems.ts`](../src/systems/robotSystems.ts).

Robot Lifecycle (Roadmap Phase 7) replaces the dynamic spawn/despawn/persistence machinery that
existed through Phases 4–6 as test scaffolding. A locale's roster is now created once, in full, at
locale load — every robot cycles between `Docked` and `Active` for the rest of the session, driven
purely by its own battery level. Nothing is ever removed from the roster.

## Core Principles

1. **Fixed roster, created once**: every locale spawns exactly `MAX_ROBOTS` (12) robots at load — no dynamic spawn scheduler, no manual spawn action, no removal.
2. **Battery-driven, not job-driven**: the `Docked ↔ Active` cycle is governed purely by battery level. Job assignment happens as a side effect of going `Active`, not a precondition for it.
3. **Measure-quantized transitions**: every state change is evaluated once per measure via BeatClock — never `setTimeout`/`setInterval`.
4. **Orthogonal to `RobotState`**: `Robot.docking` is a second state machine, independent of the existing `Robot.state` (`Idle`/`Moving`/`Selected`/`Interacting`/`Leaving`), which continues to govern in-world wandering/interaction behavior for whichever robots are currently `Active`.
5. **Off-screen and muted while Docked**: a `Docked` robot has no reserved `AudioEngine` voice, no registered melody, and sits at a position outside the world bounds — reusing the same off-viewBox placement `spawnSystem.ts`'s `generateSpawnPosition` already used for spawn/entrance.

## Data Structures

```typescript
// src/types/Robot.ts
const DockingState = {
  Docked: 'docked',
  Docking: 'docking',
  Departing: 'departing',
  Active: 'active',
} as const;
type DockingState = (typeof DockingState)[keyof typeof DockingState];

const JobType = {
  VentExtraction: 'ventExtraction',
  AcousticSurvey: 'acousticSurvey',
  StructuralInspection: 'structuralInspection',
  FluidMonitoring: 'fluidMonitoring',
} as const;
type JobType = (typeof JobType)[keyof typeof JobType];
```

Fields added to `Robot`:

```typescript
docking: DockingState;
/** Measure at which a Docking/Departing hold ends. Undefined when docking is Docked or Active. */
dockingHoldUntilMeasure?: number;
/** 0-100. Drains while Active, recharges while Docked. Seeded at spawn. */
batteryLevel: number;
/** Assigned automatically when a robot lands on Active. Undefined while Docked/Docking/Departing. */
job?: { type: JobType; assignedAtMeasure: number };
```

`Robot.persists` — the old power-cycle-survival flag — is gone. Every robot survives a power cycle
now; there is nothing left for a robot to "persist" against.

## The Docking State Machine

```
        battery ≥ 100%                    battery ≤ 10%
Docked ─────────────────▶ Docking ──────────────────────▶ (nothing — Docking only exits forward)
  ▲                          │
  │                          │ hold elapses (up to 1 measure)
  │                          ▼
  └────────── Departing ◀── Active
       hold elapses            battery ≤ 10%
       (up to 1 measure)
```

- **`Docked` → `Docking`**: triggered the measure a `Docked` robot's battery reaches
  `BATTERY_FULL_THRESHOLD` (100). Not an immediate jump to `Active` — `Docking` is a real held
  state.
- **`Active` → `Departing`**: triggered the measure an `Active` robot's battery reaches
  `BATTERY_CRITICAL_THRESHOLD` (10) or below.
- **The hold**: `dockingHoldUntilMeasure` is set to `measure + 1` at the moment of triggering. The
  robot lands (`Docking` → `Active`, `Departing` → `Docked`) the first measure tick at or after
  that value — "up to one measure," not always a full one: a threshold crossed right after a
  measure boundary waits nearly a full measure, one crossed right before it lands almost
  immediately.
- **Landing effects** (`landOnActive`/`landOnDocked` in `robotSystems.ts`) are the only place
  audio/position/job actually change — nothing perceptible happens during the hold itself.

## Battery

Evaluated once per measure by `tickRobotLifecycle(localeId, measure)`, called from a
`subscribeToMeasure` callback registered by `startRobotLifecycle`/`stopRobotLifecycle`:

| State | Per-measure change |
|---|---|
| `Active`, no job | `-BATTERY_DRAIN_BASE` (2%) |
| `Active`, with job | `-(BATTERY_DRAIN_BASE + JOB_BATTERY_DRAIN_SURCHARGE[job.type])` |
| `Docked` | `+BATTERY_RECHARGE_RATE` (5%), capped at 100 |

```typescript
// src/constants/index.ts
BATTERY_DRAIN_BASE = 2;
JOB_BATTERY_DRAIN_SURCHARGE = {
  ventExtraction: 1,        // 3% total while Active
  acousticSurvey: 3,        // 5% total
  structuralInspection: 5,  // 7% total
  fluidMonitoring: 7,       // 9% total
};
BATTERY_RECHARGE_RATE = 5;
BATTERY_CRITICAL_THRESHOLD = 10;
BATTERY_FULL_THRESHOLD = 100;
```

Battery never goes below 0 or above 100 (clamped both in the tick math and again at the
`localeStore.ts` `updateRobot` boundary, matching every other clamped robot field).

## Landing Effects

**`landOnActive(localeId, robotId)`** — called when a `Docking` robot's hold elapses:
1. Sets `docking: Active`, clears `dockingHoldUntilMeasure`.
2. Reserves an `AudioEngine` voice and registers the robot's melody (same calls
   `spawnSystem.ts`'s `spawnRobot` makes — no new `AudioEngine` capability).
3. Calls `assignJob` (see below).
4. Calls `handleRobotIdle` to restart wandering — `Robot.tsx` only calls this once, on mount, so a
   robot that was idle-guarded while `Docked` (see below) needs this explicit restart.

**`landOnDocked(localeId, robotId)`** — called when a `Departing` robot's hold elapses:
1. Sets `docking: Docked`, clears `dockingHoldUntilMeasure`.
2. Repositions off-screen via `generateSpawnPosition`, seeded by a per-robot `dockCycleCounters`
   counter (module state in `robotSystems.ts`, mirroring `idleSystem.ts`'s `idleMoveCounters` and
   `spawnSystem.ts`'s `spawnCounters`) so successive dock cycles sample different noise-map rows.
3. Re-rolls pitch drift (see below).
4. Releases the `AudioEngine` voice and unregisters the melody.

## Pitch Drift

Every time a robot lands on `Docked`, `DOCKED_PITCH_DRIFT_RATIO` (25%) of its melody events get a
seeded `noteIndex` re-roll via `melodyGenerator.ts`'s `reRollMelodyPitches`:

```typescript
export function reRollMelodyPitches(
  melody: RobotMelodyEvent[],
  ratio: number,
  opts: { noteVariance?: ToggleValue; rand: () => number },
): RobotMelodyEvent[]
```

`startStep`, `length`, and `octave` are never touched — only pitch drifts, never rhythm. The
number of events changed is `Math.max(1, Math.round(melody.length * ratio))` — floored at 1, so a
short melody always changes at least one note. Reuses `melodyGenerator.ts`'s existing
`pickRandomIndices` (which events change) and `pickWeightedIndex` (the new pitch, when the
robot's `noteVariance` is active) — no new selection logic. This is recurring, not a one-time
spawn effect: a robot's pitch identity drifts gradually over many dock cycles across a session.

## Job Assignment

`scoreJobAffinities(robot): Record<JobType, number>` is a pure, deterministic function over a
robot's already-seeded melodic attributes — no new randomness, since the *inputs* were seeded at
spawn and the scoring itself is plain arithmetic:

| Job | Favors |
|---|---|
| **Vent Extraction** | low register, dense rhythm, short/tight motif, low note variance |
| **Acoustic Survey** | high register, sparse rhythm, long/scattered motif, high/unrestricted variance |
| **Structural Inspection** | wide octave span, mid-length motif (4–8), balanced density |
| **Fluid Monitoring** | mid register, density and variance near their defaults |

`assignJob(localeId, robotId)` sorts the four types by score for the deploying robot, skips any
type already at `JOB_MAX_ROBOTS_PER_TYPE` (3) active assignments in that locale, and writes the
first available type plus `assignedAtMeasure: getCurrentMeasure()`. At the fixed 12-robot roster,
4 types × cap 3 = 12, so the cap only matters transiently — never permanently starves a profile.
Job is pure data: no world position, no per-job visual behavior, no factory/depth-layer coupling.

## Roster Creation

`spawnInitialRoster(localeId)` (`spawnSystem.ts`) creates exactly `MAX_ROBOTS` robots once, at
locale load:

- A seeded count within `[INITIAL_ACTIVE_ROBOTS_MIN, INITIAL_ACTIVE_ROBOTS_MAX]` (2–4) start
  `Active` at full battery.
- The rest start `Docked`, each with an independently seeded, varied starting battery (0–99) so
  they don't all finish recharging in lockstep.
- Does **not** assign jobs — `worldTransition.ts`'s `initializeLocale` does that for the
  initially-`Active` robots immediately after, to avoid an import cycle: `robotSystems.ts` already
  imports `generateSpawnPosition` from `spawnSystem.ts`, so `spawnSystem.ts` never imports back
  from `robotSystems.ts`.
- `spawnRobot(localeId, { docking, batteryLevel })`'s `AudioEngine.reserveVoice`/
  `registerRobotMelody` calls are conditional on `docking === Active` — a robot created `Docked`
  gets no voice/melody until it actually lands on `Active` for the first time.

## Existing-System Guards

Two already-shipping systems needed a `docking === Active` guard added, since neither was
originally docking-aware:

- **`idleSystem.ts`'s `handleRobotIdle`**: early-returns for a non-`Active` robot, so a `Docked`
  robot never wanders off its off-screen position.
- **`collisionSystem.ts`'s `canInteract`**: excludes non-`Active` robots. The collision ticker
  iterates every robot in the store regardless of what's rendered — without this guard, a `Docked`
  (muted) robot could still be flagged into an audible `triggerInteraction`.

## Power Cycle Integration

`startRobotLifecycle(localeId)`/`stopRobotLifecycle()` are a module-singleton pair (one active
`subscribeToMeasure` unsubscribe function at a time), mirroring the retired
`startSpawnScheduler`/`stopSpawnScheduler`'s exact pattern. `worldTransition.ts`'s
`initializeLocale` calls `stopRobotLifecycle(); startRobotLifecycle(localeId);` unconditionally on
every call — this is what makes a power cycle work, not just a locale swap:
`AudioEngine.killAll()` (called on power-off, via `powerController.ts`) triggers `resetBeatClock()`
internally, which silently clears every `subscribeToMeasure` listener. Without
`stopRobotLifecycle()` running first to null out the module's `lifecycleUnsubscribe` reference, a
later `startRobotLifecycle()` would see it as "already running" and never resubscribe — permanently
killing the tick after the first power cycle.

`powerController.ts`'s `start()` calls `spawnSystem.ts`'s `reRegisterAllRobotsAudio(localeId)` on
power-on, which now filters by `docking === Active` (not the retired `persists`) — every robot
survives a power cycle, but only `Active` robots had a voice to lose when `killAll()` ran, so only
they need re-registering.

## Testing Notes

The current tests (`robotSystems.test.ts`, plus updated coverage in `idleSystem.test.ts`,
`collisionSystem.test.ts`, `spawnSystem.test.ts`, `worldTransition.test.ts`) cover:
- battery drain math for all four job types plus the no-job case, and recharge math, both clamped
- threshold-triggered `Docking`/`Departing` entry with the hold, not an immediate landing
- hold-elapsed landing on `Active`/`Docked`
- `landOnActive`/`landOnDocked`'s AudioEngine, position, job, and idle-restart side effects
- `scoreJobAffinities` determinism and each profile scoring highest for a robot matching its description
- `assignJob` respecting `JOB_MAX_ROBOTS_PER_TYPE`
- `startRobotLifecycle`/`stopRobotLifecycle` idempotency
- the `idleSystem.ts`/`collisionSystem.ts` docking guards
- `spawnInitialRoster`'s active/docked split and seeded battery variation, and its determinism across identical coordinates
