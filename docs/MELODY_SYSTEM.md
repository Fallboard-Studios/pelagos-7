# Melody Generation Specification

Source of truth: [`src/engine/melodyGenerator.ts`](../src/engine/melodyGenerator.ts).

Melody generation creates procedurally generated musical patterns for each robot at spawn time, producing immutable `RobotMelodyEvent[]` values whose note choices are index-based and later resolved by the harmony palette at playback time.

## Core Principles

1. **Spawn-time only**: melodies are generated once per robot and then registered with AudioEngine.
2. **Index-based**: each event stores a `noteIndex` (0–7), not a literal pitch string.
3. **16-subdivision grid**: onset positions are chosen across a one-measure grid of 16 subdivisions.
4. **Motif-based density**: rhythmic structure comes from a motif repetition algorithm rather than a simple random step picker.
5. **Optional variance**: the generator can bias note choices and shift timings in a controlled way for variation.

## Data Structure

```typescript
interface RobotMelodyEvent {
  id: string;
  startStep: number; // 1..16 (1-indexed slot in the 16-step grid)
  length: NoteDuration; // full union is '32n'|'16n'|'8n'|'4n'|'2n'|'1n'|'2m'|'4m' (types/Robot.ts); gridUnitsToDuration() only ever produces '16n'|'8n'|'4n'|'2n'
  noteIndex: number; // 0..7, mapped into the active harmony palette
  octave: number; // concrete octave assigned at generation time
}
```

`noteIndex` is resolved later by the harmony system and playback layer. `octave` stays fixed once the melody is generated.

## Current Generation API

The current generator entry point is:

```typescript
export function generateMelodyForRobot(opts: GenerateMelodyForRobotOptions): RobotMelodyEvent[]
```

Supported options:

```typescript
interface GenerateMelodyForRobotOptions {
  onsetCount: number;
  octaveMin: number;
  octaveMax: number;
  rhythmicDensity?: number;
  rhythmicMotifLength?: number;
  subdivisions?: number;
  seed?: number;
  rand?: () => number;
  noteVariance?: number;
}
```

## Generation Algorithm

The implementation uses a motif-repetition algorithm rather than the older step-selection approach.

1. `buildMotifOnsets()` builds a sorted list of onset positions for one measure.
2. The density is clamped to the range 4–12 events.
3. Each event gets:
   - a `startStep` derived from the onset grid
   - a duration chosen via `pickDurationForGap()` — not necessarily filling the whole gap to the next onset; the remainder becomes a rest
   - a `noteIndex` chosen with weighted probabilities
   - an `octave` selected within the provided range

### Rhythm model

The rhythmic pattern is driven by:
- `rhythmicDensity` (target onsets per measure)
- `rhythmicMotifLength` (motif length in subdivision units)
- `subdivisions` (default `16`)

The algorithm repeats a base motif across the measure and spreads extra onsets to the first copies of that motif. If the motif length is too short to support repetition, it falls back to picking unique positions directly.

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

The `noteVariance` option constrains how many unique note indices are used:
- `0` → no constraint; use weighted selection normally
- `1..7` → prefer a limited set of unique notes
- `8` → use all eight note indices without replacement

## Variance Helpers

The module also exposes two helpers used by playback and tests:

- `applyRhythmicVariance(melody, probability = 0.20, rand?)` — shifts 1–2 events by `[-2, -1, 1, 2]` steps with a default 20% chance.
- `applyTonalVariance(melody, probability = 0.20, rand?)` — shifts 1–2 `noteIndex` values by `[-1, 1]` with a default 20% chance.

These helpers are pure and return a new melody array when a change occurs.

## Constants of Interest

- `MIN_EVENTS = 4`
- `MAX_EVENTS = 12`
- `DEFAULT_RHYTHMIC_DENSITY = 8`
- `DEFAULT_RHYTHMIC_MOTIF_LENGTH = 8`
- `DEFAULT_SUBDIVISIONS = 16`
- `OCTAVE_JUMP_CHANCE = 0.15`
- `DEFAULT_VARIANCE_PROBABILITY = 0.20`
- `DURATION_UNIT_VALUES`: `[[1,'16n'], [2,'8n'], [4,'4n'], [8,'2n']]` — grid-unit lengths used to weight `pickDurationForGap()`'s choice (weight = unit value, so `2n` is ~8x more likely than `16n` whenever both fit)

## Integration at Spawn

```typescript
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';

const melody = generateMelodyForRobot({
  onsetCount: 6,
  octaveMin: 2,
  octaveMax: 5,
  rhythmicDensity: 6,
  rhythmicMotifLength: 8,
  noteVariance: 2,
});

AudioEngine.registerRobotMelody(robot.id, melody);
```

The generated melody is later consumed by AudioEngine via a step registry keyed by `startStep`.

## Playback Integration

The playback layer uses the melody events as index-based cues and applies the current harmony palette at scheduling time. The generator itself only produces the event structure; the actual pitch is resolved by the engine when the note is scheduled.

`AudioEngine`'s playback scheduler ticks on `'16n'` — 16 ticks per measure — so the 16 `startStep` slots this generator produces map 1:1 onto a single measure, exactly matching the "one measure, 16 subdivisions" model above. (This alignment was previously broken — the scheduler ticked on `'8n'`, stretching every melody's loop to 2 measures at half the tuned density — and was fixed to match this generator's model rather than the other way around.)

## Testing Notes

The current tests cover:
- deterministic generation with `seed` or `rand`
- rhythm and tonal variance behavior
- duration selection through `pickDurationForGap()` (never exceeds the available gap, weighted toward longer durations)
- duration mapping through `gridUnitsToDuration()`
- onset construction through `buildMotifOnsets()`
