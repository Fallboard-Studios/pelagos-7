# Melody Generation Specification

Source of truth: [`src/engine/melodyGenerator.ts`](../src/engine/melodyGenerator.ts).

Melody generation creates procedurally generated musical patterns for each robot at spawn time, producing immutable `MelodyEvent[]` values whose note choices are index-based and later resolved by the harmony palette at playback time.

## Core Principles

1. **Spawn-time only**: melodies are generated once per robot and then registered with AudioEngine.
2. **Index-based**: each event stores a `noteIndex` (0–7), not a literal pitch string.
3. **16-subdivision grid**: onset positions are chosen across a one-measure grid of 16 subdivisions.
4. **Motif-based density**: rhythmic structure comes from a motif repetition algorithm rather than a simple random step picker.
5. **Optional variance**: the generator can bias note choices and shift timings in a controlled way for variation.

## Data Structure

```typescript
// Declared once, in types/Robot.ts — this is also the type of Robot.melody.
interface MelodyEvent {
  id: string;
  startStep: number; // 1..16 (1-indexed slot in the 16-step grid)
  length: NoteDuration; // full union is '32n'|'16n'|'8n'|'4n'|'2n'|'1n'|'2m'|'4m' (types/Robot.ts); gridUnitsToDuration() only ever produces '16n'|'8n'|'4n'|'2n'
  noteIndex: number; // 0..7, mapped into the active harmony palette
  octave: number; // concrete octave assigned at generation time
  pitchLocked?: boolean; // Pitch Repeat only — see below. undefined everywhere else, including the base cell.
}
```

`noteIndex` is resolved later by the harmony system and playback layer. `octave` stays fixed once the melody is generated.

## Current Generation API

The current generator entry point is:

```typescript
export function generateMelodyForRobot(opts: GenerateMelodyForRobotOptions): MelodyEvent[]
```

Supported options:

```typescript
interface ToggleValue {
  active: boolean;
  value: number;
}

interface GenerateMelodyForRobotOptions {
  octaveMin: number;
  octaveMax: number;
  rhythmicDensity?: number;        // 0-100 fill-rate percentage (was a 4-12 onset count)
  rhythmicMotifLength?: ToggleValue; // value: 1-8 (was a plain 1-16 number)
  subdivisions?: number;
  seed?: number;
  rand?: () => number;
  noteVariance?: ToggleValue;       // value: 1-8 (was a plain 0-8 number, 0 meaning "off")
  pitchRepeat?: number;             // 0-100, only meaningful when rhythmicMotifLength.active is true
}
```

`onsetCount` no longer exists on this interface — it was a pre-percentage legacy fallback (`rhythmicDensity ?? onsetCount`) removed once every call site moved to the percentage model.

## Generation Algorithm

The implementation uses a motif-repetition algorithm rather than the older step-selection approach.

1. `rhythmicDensity` (a 0–100% fill rate) is converted to a concrete onset count as a pre-step, before `buildMotifOnsets()` is ever called — `buildMotifOnsets()` itself still only understands a plain onset count, exactly as before this conversion existed.
2. `buildMotifOnsets()` builds a sorted list of onset positions for one measure from that onset count.
3. Each event gets:
   - a `startStep` derived from the onset grid
   - a duration chosen via `pickDurationForGap()` — not necessarily filling the whole gap to the next onset; the remainder becomes a rest
   - a `noteIndex` chosen per the Note Variance toggle (see below)
   - an `octave` selected within the provided range

### Rhythm model

Density is a percentage of either the full measure or one motif cell, gated by the Motif Length toggle:

- **Motif Length inactive** (`rhythmicMotifLength.active === false`): `rhythmicDensity`% of the full 16-step measure is filled, with onsets scattered freely (no repeating structure). Onset count = `round(density/100 * subdivisions)`, floored to a minimum of 1.
- **Motif Length active**: `rhythmicDensity`% of a `rhythmicMotifLength.value`-step cell (1–8 steps) is filled, and that identically-filled cell tiles across the measure, truncating at measure end. Per-cell onset count = `round(density/100 * value)`, floored to a minimum of 1; the total onset count passed to `buildMotifOnsets()` is `perCell * repeats` (`repeats = floor(subdivisions / value)`) so every repeat gets exactly the same fill — no remainder distributed unevenly across copies, unlike the pre-percentage model.

`buildMotifOnsets()`'s own contract is unchanged: it still takes a plain total onset count, a motif length, and `subdivisions`, and still falls back to picking unique positions directly (ignoring the motif length as a tiling boundary) if the motif length is too short relative to `subdivisions` to support repetition.

**Tail-cell fill (untruncating):** when `rhythmicMotifLength.value` (`M`) doesn't evenly divide `subdivisions` — `3`, `5`, `6`, `7` against the default 16 — the tiling loop above only ever runs `repeats = floor(subdivisions / M)` times, leaving `tailLength = subdivisions - repeats * M` steps past the last full repeat with no onset at all. `buildMotifOnsets()` appends one final partial-cell pass after its existing trim branch (both otherwise untouched): whichever base-motif positions are `< tailLength` are copied into a partial cell at offset `repeats * M`. This is a deterministic subset of the same base motif, not a fresh random draw, and is deliberately **not** counted against the requested `rhythmicDensity` — it's bonus fill from previously-dead grid space, so it can push the final onset count above what was asked for. `M` values that evenly divide `subdivisions` (`1`, `2`, `4`, `8`) have `tailLength = 0` and are unaffected.

**Playback accent:** when Motif Length is active, `AudioEngine` applies a velocity accent to the earliest event in each repeat window (the tiled cell's "downbeat") — this is a playback-layer behavior, not something `melodyGenerator.ts` produces or stores on the event. See [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md#note-resolution-pipeline)'s Note Resolution Pipeline.

## Duration Selection

Each event's duration is chosen by `pickDurationForGap(availableUnits, rand)`, not by deterministically filling the gap to the next onset:

```typescript
export function pickDurationForGap(availableUnits: number, rand?: () => number): NoteDuration
```

Candidates are every representable duration whose grid-unit length (`16n`=1, `8n`=2, `4n`=4, `2n`=8) is `<= availableUnits`, chosen with probability weighted by that unit length — so `16n` is deliberately the least likely candidate whenever a longer option is available, while remaining possible (a gap of exactly 1 unit has no other choice). When the chosen duration is shorter than the available gap, the remainder is silence — this is intentional: it creates space between notes instead of every onset's note always ringing until the instant the next one starts.

`gridUnitsToDuration(units): NoteDuration` still exists as a general-purpose deterministic quantizer (`<=1→16n`, `2-3→8n`, `4-6→4n`, `7+→2n`) but is no longer used by `generateMelodyForRobot` — it's independently tested and kept as a utility.

## Note Selection

The weighted note selection is still the core melodic bias:

```typescript
const NOTE_INDEX_WEIGHTS = [0.35, 0.2, 0.15, 0.1, 0.07, 0.06, 0.04, 0.03];
```

This makes lower indices more common than higher ones.

### Note variance controls

The `noteVariance` option is a `{ active, value }` toggle:
- `active: false` → **unweighted**, unconstrained random pick from all 8 indices (`Math.floor(rand() * 8)`). This is a deliberate behavior change from the pre-refactor `noteVariance === 0` default, which was still weighted — "off" now genuinely means no weighting at all, not just no uniqueness constraint.
- `active: true, value: 1..7` → prefer a limited set of `value` unique notes, weighted among the established set once it fills
- `active: true, value: 8` → use all eight note indices without replacement

## Pitch Repeat

`Robot.pitchRepeat` (`0-100`, lore label "Ping Repetition Allowance" in the UI) increasingly locks
a tiled motif's repeated cells to the same pitches as the base cell (repeat 0), not just the same
rhythm — closing the "half-repeats" gap Motif Length tiling leaves on its own. See
[docs/specs/PITCH_REPEAT.md](specs/PITCH_REPEAT.md) for the full spec.

**Gating:** inert whenever `rhythmicMotifLength.active === false` — no cell concept exists to lock
pitches within when tiling is off. `generateMelodyForRobot` never even calls
`computePitchLockPlan` in that case.

**Algorithm (`computePitchLockPlan`, `melodyGenerator.ts`):**
- The base cell has `K` onset positions (however many onsets actually land in `[0, motifLength)` —
  including any `R`-extra onset from the rhythm model above, if one landed in repeat 0). A seeded
  permutation of those `K` positions is drawn once — the order they lock in, not always
  position-0-first.
- `pitchRepeatPct`'s `0-100` range is divided into `K` equal-width stages, one per position in that
  order. Within a position's stage, the *count* of non-base repeats locked for that position ramps
  from `0` (stage start) to "every applicable repeat" (stage end); once a stage completes, later
  stages never unlock it — locking is monotonic as the slider rises. `pitchRepeatPct >= 100`
  short-circuits every stage's fraction to exactly `1` up front, avoiding `100/K` float-boundary
  edge cases (e.g. `K=3` repeats `33.3̄`).
- *Which* repeats lock first within a stage comes from a second seeded permutation — of non-base
  repeat indices — **shared across every position** (drawn once, not re-rolled per position). A
  position's applicable repeats exclude the tail repeat (see above) when that position falls at or
  past `tailLength` — the tail cell has no onset there to lock.
- Both permutations are drawn from the same seeded `rand` stream `generateMelodyForRobot` already
  threads through onset/pitch generation — no new `Math.random`, no new seeding utility.
- A locked `(position, repeat)` onset copies the base cell's already-chosen `noteIndex` **verbatim**
  — via a `basePositionNoteIndex` map populated as repeat-0 events are pushed — bypassing Note
  Variance entirely for that onset, and without mutating Note Variance's own `uniqueSet`/
  `withoutReplacementPool` state. Unlocked onsets, including every base-cell onset, run through
  Note Variance exactly as before, in the same iteration order — `pitchRepeat: 0` (or omitted,
  `DEFAULT_PITCH_REPEAT`) is statistically indistinguishable from generation with no Pitch Repeat
  at all.
- Locked events are stamped `pitchLocked: true`. Base-cell events and unlocked events leave the
  field `undefined` (never `false`).

**Docking re-roll:** `reRollMelodyPitches` (called from `robotSystems.ts`'s `landOnDocked`, via
`DOCKED_PITCH_DRIFT_RATIO`) excludes `pitchLocked` events from its candidate pool before picking
which events to change. The "always changes at least 1" floor only applies once the eligible
(unlocked) pool is non-empty — a fully-locked melody re-rolls zero notes on dock instead of
force-changing one. Base-cell events are **not** excluded (they're never stamped `pitchLocked`
themselves), so a re-roll can still touch a base-cell position whose locked copies then look
briefly stale until the next full regeneration — a deliberate, low-cost tradeoff (see
docs/specs/PITCH_REPEAT.md §7.1), not a bug.

**Seeding & lifecycle:** rolled per-robot at spawn (`spawnSystem.ts`, `getSeededVal(noiseMap,
'robot.pitchRepeat', spawnCount, 0, 100)`), same convention as Density/Motif Length/Note Variance;
inherited verbatim on the `shouldCopy` path; rerolls with the rest of the melody on a coordinate
change (nothing about Pitch Repeat is preserved across one, same as Density); manually edited via
`applyPitchRepeat` (`robotOptionsActions.ts`), which mirrors `applyDensity` exactly and — like the
other three fields — takes the existing unseeded `Math.random` manual-edit path, not the seeded one
above.

## Variance Helpers

The module also exposes two helpers used by playback and tests:

- `applyRhythmicVariance(melody, probability = 0.20, rand?)` — shifts 1–2 events by `[-2, -1, 1, 2]` steps with a default 20% chance.
- `applyTonalVariance(melody, probability = 0.20, rand?)` — shifts 1–2 `noteIndex` values by `[-1, 1]` with a default 20% chance.

These helpers are pure and return a new melody array when a change occurs.

## Constants of Interest

- `RHYTHMIC_DENSITY_MIN = 0`, `RHYTHMIC_DENSITY_MAX = 100` (`src/constants/index.ts`) — the shared 0-100% fill-rate range. Was `4`/`12` (an onset count) before this phase.
- `RHYTHMIC_MOTIF_LENGTH_MIN = 1`, `RHYTHMIC_MOTIF_LENGTH_MAX = 8` (`src/constants/index.ts`) — the shared `ToggleValue.value` range for Motif Length. `RHYTHMIC_MOTIF_LENGTH_MAX` was `16` before this phase.
- `NOTE_VARIANCE_MIN = 1`, `NOTE_VARIANCE_MAX = 8` (`src/constants/index.ts`) — the shared `ToggleValue.value` range for Note Variance. `NOTE_VARIANCE_MIN` was `0` before this phase (`0` meant "off"; now "off" is `active: false`, so `value` itself never needs to reach `0`).
- `DEFAULT_RHYTHMIC_DENSITY = 50` — a clean round mid-point of the new percentage range (was `8`, out of the old `4-12` range).
- `DEFAULT_RHYTHMIC_MOTIF_LENGTH = { active: true, value: 8 }` — behavior-preserving with the pre-refactor always-tiling-at-8 default (motif tiling had no off switch before this phase).
- `DEFAULT_NOTE_VARIANCE = { active: false, value: 1 }` — behavior-preserving with the pre-refactor `noteVariance === 0` default.
- `PITCH_REPEAT_MIN = 0`, `PITCH_REPEAT_MAX = 100` (`src/constants/index.ts`) — the shared 0-100% lock-strength range.
- `DEFAULT_PITCH_REPEAT = 0` — the neutral/off state (unlike the other three defaults, `0` isn't a mid-range compromise; it's what makes generation at the default statistically indistinguishable from having no Pitch Repeat).
- `DEFAULT_SUBDIVISIONS = 16`
- `OCTAVE_JUMP_CHANCE = 0.15`
- `DEFAULT_VARIANCE_PROBABILITY = 0.20`
- `DURATION_UNIT_VALUES`: `[[1,'16n'], [2,'8n'], [4,'4n'], [8,'2n']]` — grid-unit lengths used to weight `pickDurationForGap()`'s choice (weight = unit value, so `2n` is ~8x more likely than `16n` whenever both fit)

## Integration at Spawn

```typescript
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';

const melody = generateMelodyForRobot({
  octaveMin: 2,
  octaveMax: 5,
  rhythmicDensity: 60,                              // 60% fill rate
  rhythmicMotifLength: { active: true, value: 8 },  // tile an 8-step cell across the measure
  noteVariance: { active: true, value: 2 },         // weighted slice of 2 notes
});

AudioEngine.registerRobotMelody(robot.id, melody);
```

The generated melody is later consumed by AudioEngine via a step registry keyed by `startStep`.

## Playback Integration

The playback layer uses the melody events as index-based cues and applies the current harmony palette at scheduling time. The generator itself only produces the event structure; the actual pitch is resolved by the engine when the note is scheduled.

`AudioEngine`'s playback scheduler ticks on `'16n'` — 16 ticks per measure — so the 16 `startStep` slots this generator produces map 1:1 onto a single measure, exactly matching the "one measure, 16 subdivisions" model above. (This alignment was previously broken — the scheduler ticked on `'8n'`, stretching every melody's loop to 2 measures at half the tuned density — and was fixed to match this generator's model rather than the other way around.)

### Click Track (testing aid)

`AudioEngine.registerRobotMelody(robotId, melody)` — the one funnel every melody-registration call site shares (spawn, Reset Melody, a Density/Motif Length/Note Variance edit, `robotSystems.ts`'s docking pitch-drift reroll, and this file's own per-loop rhythmic/tonal variance) — ignores its `melody` argument entirely and substitutes a fixed 4-quarter-note downbeat pattern (`src/engine/clickTrack.ts`'s `buildClickTrackMelody`, noteIndex `0/1/0/2` at `startStep` `1/5/9/13`) whenever the robot's own `clickTrackActive` flag (`Robot.ts`) is true. The override is enforced at that single funnel rather than at each call site, so nothing — including automatic melody changes a user never directly triggered, like the docking reroll — can silently fall back to the real melody while the toggle still reads as on. Toggled per-robot (or broadcast per-company) from the top of the Ping Controls accordion; purely a tempo/BPM-by-ear testing aid, not part of a robot's generated melody. The toggle itself only renders behind `DEV_TUNING` (`PingControlsDrawer.tsx`) — the same dev-only gate the Skipped Notes debug counter uses (`App.tsx`) — so it's unreachable in a production build.

## Testing Notes

The current tests cover:
- deterministic generation with `seed` or `rand`
- rhythm and tonal variance behavior
- duration selection through `pickDurationForGap()` (never exceeds the available gap, weighted toward longer durations)
- duration mapping through `gridUnitsToDuration()`
- onset construction through `buildMotifOnsets()`
- the density→onset-count floor of 1 (a `rhythmicDensity` roll of `0` never produces a silent melody), in both the scatter and tiled branches
- exact rounded onset counts at representative density percentages (100/50/25%) against the full measure
- identical per-window onset counts when Motif Length tiling is active (no remainder skew across repeat copies)
- Note Variance's `active: false` branch producing genuinely unweighted selection, distinct from the old always-weighted default
- `onsetCount` being rejected at compile time (`@ts-expect-error`)
- `buildMotifOnsets()`'s tail-cell pass: `M` values `1/2/4/8` unaffected (regression guard), `M` values `3/5/6/7` gain tail onsets that are a subset of the base motif's own positions and survive the overshoot-trim branch
- `computePitchLockPlan()`: `pct: 0` → all false, `pct: 100` → full lock (float-safety guard), monotonicity across a `0-100` sweep, determinism, seed-dependent (not always position-0-first) lock order, and tail-repeat exclusion for positions `>= tailLength`
- `generateMelodyForRobot`'s Pitch Repeat wiring: gating when Motif Length is off, no `pitchLocked` events at `pitchRepeat: 0`, full-lock verbatim repetition at `pitchRepeat: 100`, and Note Variance's uniqueness cap staying unaffected by locked copies
- `reRollMelodyPitches` excluding `pitchLocked` events from its candidate pool, including the fully-locked (zero changes) and no-locks-present (regression) cases
