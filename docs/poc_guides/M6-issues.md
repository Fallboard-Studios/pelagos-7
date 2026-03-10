# M6: Audio Depth Issues

**Milestone:** M6 - Audio Depth  
**Timeline:** Week 6  
**Goal:** Each robot has a distinct sonic identity with per-robot synths, volume, timing, and panning

---

## M6.1: Per-Robot Synth Instances with Individual ADSR

**Title:** [M6.1] Wire per-robot synth type and ADSR to AudioEngine playback

**Labels:** feature, system: audio, size: M

### Feature Description
Currently all notes play through the same `synthPool.default` PolySynth with shared options. Each robot already carries a `synthType` and `adsr` in its `audioAttributes`. This ticket wires those fields into note scheduling so each robot is heard as a distinct timbre.

### Implementation Details
- Update `triggerWithCap()` in `src/engine/AudioEngine.ts` to accept a full `NoteParams` (or extend it) that includes `adsr` and `synthType`
- When scheduling a note, select the synth pool entry matching the robot's `synthType` (`default` → PolySynth, `fm`, `am`, `membrane`)
- Apply the robot's `adsr` envelope options to the chosen synth before triggering — use `synth.set({ envelope: adsr })` (PolySynth) or the equivalent for FM/AM
- In `startMelodyPlayback()`, look up the robot from the store at tick time to pass its `audioAttributes` through to `triggerWithCap()`
- Synth pool entries remain shared objects; `set()` is cheap and runs per-note, so no new allocations needed
- Do not create per-robot Tone.js instances — the pool is intentional to cap polyphony

**Updated NoteParams:**
```typescript
export interface NoteParams {
  robotId: string;
  note: string;
  duration: NoteDuration;
  time?: number;
  velocity?: number;
  synthType?: SynthType;
  adsr?: ADSREnvelope;
}
```

**Synth selection in triggerWithCap:**
```typescript
const synth = selectSynth(synthType); // returns pool entry
if (adsr) synth.set({ envelope: adsr });
synth.triggerAttackRelease(note, duration, scheduleTime, velocity ?? 0.8);
```

### Acceptance Criteria
- [ ] Each robot's `synthType` routes to the correct pool entry
- [ ] Each robot's `adsr` is applied before note trigger
- [ ] Multiple robots playing simultaneously sound tonally distinct
- [ ] No new Tone.js synth instances created at runtime
- [ ] Polyphony cap still enforced
- [ ] No regressions in existing melody playback tests

### Reference
- `src/engine/AudioEngine.ts` — `triggerWithCap()`, `loadInstruments()`
- `src/types/Robot.ts` — `AudioAttributes`, `ADSREnvelope`, `SynthType`

---

## M6.2: Octave Offset Attribute

**Title:** [M6.2] Add octave offset attribute to robots, subtract from scheduled notes

**Labels:** feature, system: audio, size: S

### Feature Description
Robots should have an `octaveOffset` that lowers their pitch range by 0, 1, or 2 octaves. This creates bass, mid, and treble robots without additional melody complexity. A value of 2 should be uncommon so the soundscape stays bright by default.

### Implementation Details
- Add `octaveOffset: 0 | 1 | 2` to the `Robot` interface in `src/types/Robot.ts`
- Assign at spawn time in `src/systems/spawnSystem.ts` using a weighted random pick:
  - `0` → ~65% probability
  - `1` → ~28% probability  
  - `2` → ~7% probability
- When scheduling a note in `AudioEngine.ts`, transpose the resolved pitch string down by `octaveOffset` octaves before passing to `triggerAttackRelease`
- Pitch transposition helper: parse the octave digit from the Tone.js pitch string (e.g. `"C4"`) and subtract `octaveOffset`, clamping to a minimum of octave `1`

**Spawn-time assignment:**
```typescript
function pickOctaveOffset(): 0 | 1 | 2 {
  const r = Math.random();
  if (r < 0.65) return 0;
  if (r < 0.93) return 1;
  return 2;
}
```

**Note transposition:**
```typescript
function applyOctaveOffset(note: string, offset: number): string {
  if (offset === 0) return note;
  const octave = parseInt(note.slice(-1), 10);
  const newOctave = Math.max(1, octave - offset);
  return note.slice(0, -1) + newOctave;
}
```

### Acceptance Criteria
- [ ] `octaveOffset` field present on `Robot` type and initialised at spawn
- [ ] Distribution: roughly 65/28/7 across a large sample
- [ ] Notes transposed correctly at scheduling time (not stored as pitch strings)
- [ ] Octave never goes below 1
- [ ] `oceanStore` state serialises without errors after change
- [ ] Unit test for `applyOctaveOffset()` edge cases (offset 0, offset 2, minimum clamp)

### Reference
- `src/types/Robot.ts` — `Robot` interface
- `src/systems/spawnSystem.ts` — robot initialisation
- `src/engine/AudioEngine.ts` — note scheduling

---

## M6.3: Per-Robot Master Volume with Per-Note Variance

**Title:** [M6.3] Add master volume attribute with slight per-note velocity variance

**Labels:** feature, system: audio, size: S

### Feature Description
Each robot should have a `masterVolume` (0–1) that sets its average note velocity. To add organic expressiveness, each individual note is allowed to deviate up to ±15% from that base, so the melody breathes instead of playing at a rigid flat level.

### Implementation Details
- Add `masterVolume: number` (0–1) to the `Robot` interface
- Assign at spawn time in `src/systems/spawnSystem.ts` — recommended range `0.5–0.85` to keep robots below full saturation
- When scheduling a note, compute the effective velocity:
  ```typescript
  const variance = (Math.random() * 0.3) - 0.15; // -0.15 to +0.15
  const velocity = Math.min(1, Math.max(0.05, robot.masterVolume + variance));
  ```
- Pass `velocity` into `triggerWithCap()` / `NoteParams`
- Do not store per-note velocities in state — they are ephemeral, generated at scheduling time only

### Acceptance Criteria
- [ ] `masterVolume` field on `Robot` type and initialised at spawn
- [ ] Effective velocity is `masterVolume ± ≤15%`, clamped 0.05–1.0
- [ ] Variance calculated fresh at each note trigger (not precomputed)
- [ ] `oceanStore` state serialises without errors
- [ ] Unit test: 1000 sample velocities stay within bounds for a given `masterVolume`

### Reference
- `src/types/Robot.ts` — `Robot` interface
- `src/systems/spawnSystem.ts` — robot initialisation
- `src/engine/AudioEngine.ts` — `triggerWithCap()`

---

## M6.4: Rhythmic Variance in Robot Melodies

**Title:** [M6.4] Apply occasional rhythmic step shifts to robot melody events

**Labels:** feature, system: audio, size: S

### Feature Description
Melodies are 16-step loops generated at spawn. To prevent mechanical repetition, a small number of notes per loop should have their `startStep` nudged forward or back by one 8th note (±1 step) or one quarter note (±2 steps). This is applied rarely and at most to 1–2 events per loop.

### Implementation Details
- Add a `applyRhythmicVariance()` utility in `src/engine/melodyGenerator.ts` (or a new `src/utils/melodyVariance.ts`)
- On each full 16-step loop completion in `AudioEngine.ts`, decide whether to apply variance this pass (recommended: ~20% chance per loop)
- If applying: pick 1–2 random events, shift `startStep` by a random delta from `{-2, -1, +1, +2}`, clamp to `1..16`, wrap if needed
- Store the varied melody back on the robot via `updateRobot()` — this keeps state serialisable and the next loop plays the shifted version
- Do NOT regenerate the entire melody; only mutate the `startStep` of the chosen events

**Variance application:**
```typescript
export function applyRhythmicVariance(melody: MelodyEvent[]): MelodyEvent[] {
  const SHIFT_OPTIONS = [-2, -1, 1, 2];
  const numToShift = Math.random() < 0.5 ? 1 : 2;
  const indices = pickRandom(melody, numToShift);
  
  return melody.map((event, i) => {
    if (!indices.includes(i)) return event;
    const delta = SHIFT_OPTIONS[Math.floor(Math.random() * SHIFT_OPTIONS.length)];
    const newStep = Math.min(16, Math.max(1, event.startStep + delta));
    return { ...event, startStep: newStep };
  });
}
```

### Acceptance Criteria
- [ ] Rhythmic variance applied at most once per 16-step loop completion
- [ ] At most 2 events shifted per application
- [ ] `startStep` stays within 1–16 after shift
- [ ] Varied melody stored back in Zustand state (serialisable)
- [ ] Original note indices (`noteIndex`) are unchanged
- [ ] Unit tests for clamp edge cases and no-mutation of other fields

### Reference
- `src/engine/melodyGenerator.ts` — melody generation patterns
- `src/engine/AudioEngine.ts` — loop completion point (`stepCounter % 16 === 0`)
- `src/types/Robot.ts` — `MelodyEvent`

---

## M6.5: Tonal Variance in Robot Melodies

**Title:** [M6.5] Apply occasional note index shifts to robot melody events

**Labels:** feature, system: audio, size: S

### Feature Description
Complementing rhythmic variance, tonal variance shifts the `noteIndex` of 1–2 melody events by ±1 position within the available harmony palette. Because melodies use indices rather than pitch strings, the shift automatically respects whatever chord is currently active — no out-of-key notes are possible.

### Implementation Details
- Add `applyTonalVariance()` alongside `applyRhythmicVariance()` in the same utility file
- Apply independently of rhythmic variance — separate ~20% chance per loop, so both can fire, one, or neither on any given pass
- Shift `noteIndex` by `{-1, +1}`, clamped to `0..7` (the 8 available harmony palette slots)
- Store the varied melody back on the robot via `updateRobot()`

**Variance application:**
```typescript
export function applyTonalVariance(melody: MelodyEvent[]): MelodyEvent[] {
  const numToShift = Math.random() < 0.5 ? 1 : 2;
  const indices = pickRandom(melody, numToShift);
  
  return melody.map((event, i) => {
    if (!indices.includes(i)) return event;
    const delta = Math.random() < 0.5 ? -1 : 1;
    const newIndex = Math.min(7, Math.max(0, event.noteIndex + delta));
    return { ...event, noteIndex: newIndex };
  });
}
```

### Acceptance Criteria
- [ ] Tonal variance fires independently from rhythmic variance
- [ ] At most 2 events shifted per application
- [ ] `noteIndex` stays within 0–7 after shift
- [ ] Varied melody stored back in Zustand state
- [ ] `startStep` and `length` are unchanged by this function
- [ ] Unit tests for boundary clamp (index 0 shifting down stays at 0, index 7 up stays at 7)

### Reference
- `src/engine/melodyGenerator.ts` — `noteIndex` generation
- `src/engine/harmonySystem.ts` — 8-note palette size
- `src/types/Robot.ts` — `MelodyEvent`

---

## M6.6: Position-Based Note Panning

**Title:** [M6.6] Pan each scheduled note based on the robot's current X position

**Labels:** feature, system: audio, size: S

### Feature Description
When a robot's note is scheduled, look up the robot's current X position in the store and derive a stereo pan value. Robots on the left edge of the world pan left; robots on the right edge pan right. This grounds each voice spatially and makes the soundscape feel like it occupies the full stereo field.

### Implementation Details
- In `AudioEngine.ts`, inside `startMelodyPlayback()` at note-trigger time, read `robot.position.x` from the store
- Map X to pan: `pan = (x / WORLD_WIDTH) * 2 - 1`, where `WORLD_WIDTH = 1920`; result is `−1..+1`
- Create a per-trigger `Tone.Panner` or use a module-level panner node that is adjusted before each `triggerAttackRelease` call
  - **Preferred approach**: a single shared `Tone.Panner` inserted between each synth pool entry and the compressor; update `panner.pan.value` immediately before each trigger
  - The panner update is synchronous and cheap; no additional Tone nodes needed per note
- Do NOT store the pan value in robot state — compute it fresh at scheduling time from `position.x`
- `WORLD_WIDTH` should be imported from `src/constants`

**Pan calculation:**
```typescript
const pan = (robot.position.x / WORLD_WIDTH) * 2 - 1; // -1 (left) to +1 (right)
panner.pan.value = pan;
synth.triggerAttackRelease(note, duration, scheduleTime, velocity);
```

### Acceptance Criteria
- [ ] Pan value derived from `robot.position.x` at scheduling time, not stored in state
- [ ] Pan range is `−1..+1`, correctly mapped from `0..WORLD_WIDTH`
- [ ] Robots near x=0 pan left; robots near x=1920 pan right
- [ ] `WORLD_WIDTH` sourced from constants (not a magic number)
- [ ] No new Tone.Panner allocated per note trigger
- [ ] Panning change is inaudible for robots near centre (pan ≈ 0)

### Reference
- `src/engine/AudioEngine.ts` — `startMelodyPlayback()`, `triggerWithCap()`
- `src/constants/index.ts` — `WORLD_WIDTH`
- `src/types/Robot.ts` — `Robot.position`
