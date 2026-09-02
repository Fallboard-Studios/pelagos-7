# Harmony System Guide

The Harmony System provides dynamic musical palettes that cycle sequentially through a fixed set of
12 palettes as `Tone.Transport` measures advance, creating evolving ambient textures without requiring
manual composition. Each palette holds for `MEASURES_PER_PALETTE_ENTRY` (2) measures before the system
advances to the next one, wrapping back to the first once it reaches the end. **This is a distinct clock
from each locale's own visual day/night cycle** (a flat, universal `DAY_DURATION_MS` real-world duration,
wall-clock-driven from that locale's own `dayStartTimestamp`, see `src/constants/time.ts`). The two are
deliberately decoupled: a locale's visual lighting always completes a day in that fixed real-world
duration regardless of tempo, while the harmony palette moves with musical measures. See "Palette
Advancement" below for the implementation detail.

## Purpose

Robots do not store literal note strings in their melodies. Instead, they store **note indices (0-7)**
that map into a global 8-note palette (`availableNotes`). The palette is re-evaluated from the beat clock
on a repeating transport callback and only swaps when the currently-active palette index changes, so
melody events stay stable while the active harmony palette evolves.

## Core Concept

```
Robot Melody: [2, 0, 5, 3, ...]  (note indices, immutable)
                ↓  ↓  ↓  ↓
Available Notes: ['C', 'G', 'E', 'D', 'B', 'C', 'E', 'G']  (note names, no octave — checked every 2 measures, value changes when the computed palette index advances)
                ↓  ↓  ↓  ↓
Per-event octave: [4,  4,  4,  3,  ...]  (concrete octave stored on each MelodyEvent at spawn)
                ↓  ↓  ↓  ↓
Actual Playback: E4, C4, A3, ... (note name + event octave combined at scheduling time)
```

When the active palette entry changes, only `availableNotes` swaps—robot melodies (indices + octaves)
remain untouched.

## Data Structure

```typescript
// Exactly 8 note-name strings (no octave digit) per palette entry.
export type EighthNotes = [string, string, string, string, string, string, string, string];

// 12 structurally-unique palettes, cycled sequentially — no hour-of-day meaning.
const HARMONY_PALETTES: EighthNotes[] = [
  ['C',  'G',  'E',  'D',  'B',  'C',  'E',  'G' ],
  ['C',  'G',  'F',  'D',  'A',  'C',  'F',  'F' ],
  ['D',  'A',  'F',  'D',  'A',  'C',  'F',  'D' ],
  ['F',  'G',  'B',  'D',  'G',  'D',  'G',  'G' ],
  ['G',  'D',  'B',  'A',  'B',  'D',  'A',  'G' ],
  ['A',  'D',  'C',  'G',  'E',  'C',  'A',  'E' ],
  ['Bb', 'D',  'C',  'G',  'F',  'C',  'Bb', 'F' ],
  ['Bb', 'Eb', 'C',  'G',  'F',  'D',  'Bb', 'Eb'],
  ['Ab', 'Eb', 'C',  'G',  'Ab', 'D',  'Ab', 'Eb'],
  ['Db', 'F',  'C',  'Ab', 'Bb', 'Db', 'Ab', 'F' ],
  ['B',  'F#', 'D#', 'C#', 'A',  'B',  'D#', 'F#'],
  ['E',  'C',  'G#', 'D',  'Bb', 'E',  'G#', 'B' ],
];
```

A plain array, not an hour-keyed map — nothing in the cycling mechanism assumes this array's length,
so a future palette set of any size works unchanged (docs/specs/HARMONY_PALETTE_SEQUENCING.md).

## API

```typescript
// Retrieve a copy of the current palette (safe to iterate)
export function getAvailableNotes(): string[];

// Reset the palette to the first entry
export function resetHarmony(): void;

// Manually set palette (for testing or custom harmonies)
export function setAvailableNotes(notes: EighthNotes): void;

// Initialize automatic palette cycling (call once after Transport starts). Takes no arguments —
// scheduling goes through beatClock.ts's own scheduleRepeat/cancelSchedule, not a transport passed
// in by the caller.
export function scheduleHarmonyCycle(): void;

// Stop the scheduled harmony cycle
export function stopHarmonyCycle(): void;
```

## Implementation

**File: `src/engine/harmonySystem.ts`**

```typescript
// The runtime keeps an internal `availableNotes` and updates it from beatClock's transport-driven
// measure count.
let availableNotes: EighthNotes = HARMONY_PALETTES[0];

export function scheduleHarmonyCycle(): void {
  // Schedules a beatClock.scheduleRepeat('2m', ...) tick and swaps the palette when the computed
  // index changes. If scheduleHarmonyCycle is called twice, the implementation warns and ignores
  // the second call.
}
```

`scheduleHarmonyCycle()` schedules a repeating callback via `beatClock.ts`'s own `scheduleRepeat`,
on an interval built from `MEASURES_PER_PALETTE_ENTRY` (`` `${MEASURES_PER_PALETTE_ENTRY}m` ``, i.e.
`'2m'` today) — the same constant the index math below reads from, so the two can't independently drift
apart. Inside that callback it computes `paletteIndex = Math.floor(getCurrentMeasure() /
MEASURES_PER_PALETTE_ENTRY) % HARMONY_PALETTES.length`, fresh on every tick — never an accumulated
counter, so a missed or errored tick can't leave the palette permanently out of sync with the transport.
The palette only reassigns if the computed index differs from the previous one, and the callback is
wrapped in `try/catch` so a failure does not break the loop. `stopHarmonyCycle()` calls `cancelSchedule()`
on the tracked schedule id and resets internal references.

## Usage in Melody Playback

```typescript
import { scheduleRepeat } from '../engine/beatClock'; // named export — no `BeatClock` object

// During 8th-note tick
scheduleRepeat('8n', (time) => {
  const currentStep = (stepCounter % 16) + 1;
  const eventsAtStep = melodyRegistry.get(currentStep) || [];
  
  eventsAtStep.forEach(({ robotId, event }) => {
    const notes = getAvailableNotes();         // note names, e.g. ['C', 'G', ...]
    const noteName = notes[event.noteIndex];   // e.g. 'C'
    const note = `${noteName}${event.octave}`; // e.g. 'C4' — octave baked in at spawn
    
    AudioEngine.scheduleNote({
      robotId,
      note,  // Automatically uses new harmony + robot's spawn-time octave
      duration: event.length,
      time: time + MIN_LEAD,
    });
  });
  
  stepCounter++;
});
```

## Critical Rules

**✅ DO:**
- Store note indices (0-7) in robot melodies
- Call `getAvailableNotes()` at playback time
- Use `scheduleHarmonyCycle`/Transport for palette updates
- Keep melodies immutable after spawn

**❌ DON'T:**
- Store literal pitch strings in melodies
- Regenerate melodies when harmony changes
- Mutate robot melody arrays
- Use `setInterval` or `setTimeout` for palette updates
- Reschedule melody loops on harmony change

## Palette Advancement

```typescript
import { getCurrentMeasure } from '../engine/beatClock'; // named export, no `BeatClock` object

// Recomputed fresh every '2m' tick — never accumulated.
const paletteIndex = Math.floor(getCurrentMeasure() / MEASURES_PER_PALETTE_ENTRY) % HARMONY_PALETTES.length;
```

**Important:** the active index is **derived** from the transport's measure count on every tick, never
stored or incremented in state — a missed/errored tick self-corrects on the next one rather than drifting.

**This is a different clock from the visual day/night cycle.** The harmony palette advances with
`Tone.Transport`'s measure position — it moves with musical tempo, not real time. Facade/window lighting
(`Factory.tsx`, `src/utils/lightingUtils.ts`) instead derives its position from real wall-clock elapsed
time (`computeLocaleHour` in `src/constants/time.ts`, scaled by a single fixed `DAY_DURATION_MS`). The
two are **not synchronized** — a BPM change shifts how quickly the harmony palette cycles but has no
effect on the visual lighting cycle, and vice versa.

## Palette Design Guidelines

When creating custom `HARMONY_PALETTES` entries:

1. **Use 8 notes exactly** (`EighthNotes` type enforces this)
2. **No octave digits:** All entries are bare note names (`'C'`, `'Bb'`, `'F#'`). Octave is a robot-level attribute, not a palette concern.
3. **Avoid extreme leaps:** Adjacent indices should be reasonably close in pitch character
4. **Smooth transitions:** Entry N and entry N+1 should share some note names for continuity
5. **Order is the only structure that matters now** — entries no longer carry a mood-to-hour mapping;
   sequencing/mood arcs are a property of the order you list entries in the array, not a fixed clock
   position.

## Index Safety

When code consumes a melody event, it is safest to guard the palette lookup against out-of-range values:

```typescript
const safeIndex = Math.max(0, Math.min(7, event.noteIndex));
const note = availableNotes[safeIndex] ?? availableNotes[0];
```

## Testing

**Manual palette override:**
```typescript
// Force a specific harmony for testing using note names only
setAvailableNotes(['C', 'E', 'G', 'B', 'D', 'F', 'A', 'C']);
```

**Debug display:**
```typescript
import { getCurrentMeasure } from '../engine/beatClock';
console.log('Current notes:', getAvailableNotes());
console.log('Current measure:', getCurrentMeasure());
```

## Performance

- `getAvailableNotes()` returns a copy (safe, no mutation risk)
- Array copy overhead is negligible (8 strings, ~1μs)
- The palette check runs every `MEASURES_PER_PALETTE_ENTRY` measures (2 today,
  `scheduleHarmonyCycle`'s own schedule interval); the palette *value* only reassigns when the computed
  index actually differs from last time — in practice that means every tick, since the index and the
  check interval move in lockstep
- No iteration over robot arrays on harmony change

## Integration with Melody System

Robots generate melodies at spawn. Each event stores the note index *and* a concrete octave:
```typescript
// Declared once, in types/Robot.ts.
interface MelodyEvent {
  id: string;
  startStep: number;   // 1..16
  length: NoteDuration; // '32n'|'16n'|'8n'|'4n'|'2n'|'1n'|'2m'|'4m' (types/Robot.ts) — melody generation only ever produces '16n'|'8n'|'4n'|'2n', but the field's type is the full union
  noteIndex: number;   // 0..7 ← maps into note-name palette
  octave: number;      // concrete octave assigned at spawn time
}
```

At scheduling time, `note = availableNotes[event.noteIndex] + event.octave` (e.g. `"C" + 4 = "C4"`). This
means a harmony change silently updates the pitch class while the octave register stays as the robot was
born with.

At playback:
```typescript
const note = getAvailableNotes()[event.noteIndex];
AudioEngine.scheduleNote({ robotId, note, duration: event.length, time });
```

The melody event never changes—only the palette swaps.
