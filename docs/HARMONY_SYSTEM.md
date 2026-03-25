# Harmony System Guide

The Harmony System provides dynamic musical palettes that change throughout the day/night cycle, creating evolving ambient textures without requiring manual composition.

## Purpose

Robots don't store literal note strings in their melodies. Instead, they store **note indices (0-7)** that map into a global 8-note palette (`availableNotes`). When the palette changes (every 4 measures = 1 "hour equivalent"), all robots automatically play the new harmony without regenerating melodies or rescheduling.

## Core Concept

```
Robot Melody: [2, 0, 5, 3, ...]  (note indices, immutable)
                ↓  ↓  ↓  ↓
Available Notes: ['C', 'G', 'E', 'D', 'B', 'C', 'E', 'G']  (note names, no octave — changes every 4 measures)
                ↓  ↓  ↓  ↓
Per-event octave: [4,  4,  4,  3,  ...]  (concrete octave stored on each MelodyEvent at spawn)
                ↓  ↓  ↓  ↓
Actual Playback: E4, C4, A3, ... (note name + event octave combined at scheduling time)
```

When the hour changes, only `availableNotes` swaps—robot melodies (indices + octaves) remain untouched.

## Data Structure

```typescript
// Exactly 8 note-name strings (no octave digit) per palette.
// Octave is determined per-robot at spawn; each MelodyEvent stores a concrete octave.
export type EighthNotes = [string, string, string, string, string, string, string, string];

// 24-hour cycle mapping (hours 0-23)
const TIME_PITCHES: Record<number, EighthNotes> = {
  0:  ['C',  'G',  'E',  'D',  'B',  'C',  'E',  'G' ],  // Midnight
  1:  ['C',  'G',  'F',  'D',  'A',  'C',  'F',  'F' ],  // 1am
  2:  ['D',  'A',  'F',  'D',  'A',  'C',  'F',  'D' ],  // 2am
  // ... (24 total palettes)
  6:  ['Bb', 'D',  'C',  'G',  'F',  'C',  'Bb', 'F' ],  // Dawn
  12: ['C',  'G',  'E',  'D',  'B',  'C',  'E',  'G' ],  // Noon
  18: ['Bb', 'D',  'C',  'G',  'F',  'C',  'Bb', 'F' ],  // Dusk
  23: ['E',  'C',  'G#', 'D',  'Bb', 'E',  'G#', 'B' ],  // Late night
};
```

## API

```typescript
// Retrieve current palette (copy, safe to iterate)
export function getAvailableNotes(): string[];

// Manually set palette (for testing or custom harmonies)
export function setAvailableNotes(notes: EightNotes): void;

// Initialize automatic palette updates (call once on app start)
export function scheduleHarmonyCycle(): void;
```

## Implementation

**File: `src/engine/harmonySystem.ts`**

```typescript
let availableNotes: EightNotes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];

export function scheduleHarmonyCycle(): void {
  // Watch currentMeasure from store
  const unsubscribe = oceanStore.subscribe(state => {
    const currentMeasure = state.currentMeasure;
    const derivedHour = Math.floor((currentMeasure % 96) / 4);  // 0..23
    
    // Check if hour changed since last update
    if (derivedHour !== lastHour) {
      lastHour = derivedHour;
      availableNotes = (TIME_PITCHES[derivedHour] ?? TIME_PITCHES[0]).slice() as EightNotes;
      console.log(`Harmony updated to hour ${derivedHour}`);
    }
  });
  
  return unsubscribe;
}
```

**Alternative: BeatClock-driven approach**
```typescript
// Update palette every 4 measures using BeatClock
BeatClock.scheduleRepeat('4m', (time) => {
  const currentMeasure = BeatClock.getCurrentMeasure().measure;
  const derivedHour = Math.floor((currentMeasure % 96) / 4);
  availableNotes = (TIME_PITCHES[derivedHour] ?? TIME_PITCHES[0]).slice() as EightNotes;
});
```

## Usage in Melody Playback

```typescript
// During 8th-note tick
BeatClock.scheduleRepeat('8n', (time) => {
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
- Use BeatClock or Transport for palette updates
- Keep melodies immutable after spawn

**❌ DON'T:**
- Store literal pitch strings in melodies
- Regenerate melodies when harmony changes
- Mutate robot melody arrays
- Use `setInterval` or `setTimeout` for palette updates
- Reschedule melody loops on harmony change

## Hour Derivation

```typescript
// 96 measures = 1 full day/night cycle
// 4 measures = 1 "hour equivalent"
const currentMeasure = BeatClock.getCurrentMeasure().measure;
const derivedHour = Math.floor((currentMeasure % 96) / 4);  // 0..23
```

**Important:** Hour is **derived** from measures, never stored in state. This keeps the system BPM-independent.

## Palette Design Guidelines

When creating custom `TIME_PITCHES`:

1. **Use 8 notes exactly** (EightNotes type enforces this)
2. **No octave digits:** All entries are bare note names (`'C'`, `'Bb'`, `'F#'`). Octave is a robot-level attribute, not a palette concern.
3. **Avoid extreme leaps:** Adjacent indices should be reasonably close in pitch character
4. **Smooth transitions:** Hour N and N+1 should share some note names for continuity
5. **Mood mapping:**
   - Midnight-Dawn (0-6): Lower, darker tones
   - Morning (6-12): Brighter, rising pitches
   - Afternoon (12-18): Sustained high energy
   - Evening (18-24): Descending, warmer tones

## Index Clamping

Always clamp note indices to avoid crashes:

```typescript
const safeIndex = Math.max(0, Math.min(7, event.noteIndex));
const note = availableNotes[safeIndex];
```

Or with fallback:
```typescript
const note = availableNotes[event.noteIndex] ?? availableNotes[0];
```

## Testing

**Manual palette override:**
```typescript
// Force specific harmony for testing
setAvailableNotes(['C4', 'E4', 'G4', 'B4', 'D5', 'F5', 'A5', 'C6']);
```

**Debug display:**
```typescript
// Show current palette in dev overlay
console.log('Current notes:', getAvailableNotes());
console.log('Derived hour:', Math.floor((currentMeasure % 96) / 4));
```

For unit testing patterns and examples, see [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md#testing) Testing section.

## Performance

- `getAvailableNotes()` returns a copy (safe, no mutation risk)
- Array copy overhead is negligible (8 strings, ~1μs)
- Palette updates happen max once per 4 measures (infrequent)
- No iteration over robot arrays on harmony change

## Integration with Melody System

Robots generate melodies at spawn. Each event stores the note index *and* a concrete octave:
```typescript
interface RobotMelodyEvent {
  id: string;
  startStep: number;                  // 1..16
  length: '16n' | '8n' | '4n' | '2n';
  noteIndex: number;                  // 0..7 ← maps into note-name palette
  octave: number;                     // concrete octave assigned at spawn time
}
```

At scheduling time, `note = availableNotes[event.noteIndex] + event.octave` (e.g. `"C" + 4 = "C4"`). This means a harmony change silently updates the pitch class while the octave register stays as the robot was born with.

At playback:
```typescript
const note = getAvailableNotes()[event.noteIndex];
AudioEngine.scheduleNote({ robotId, note, duration: event.length, time });
```

The melody event never changes—only the palette swaps.
