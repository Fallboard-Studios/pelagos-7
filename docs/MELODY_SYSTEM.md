# Melody Generation Guide

Melody generation creates unique, procedurally-generated musical patterns for each robot at spawn time. Melodies are **immutable** after creation and consist of note indices that map into the current harmony palette.

## Core Principles

1. **Spawn-Time Only**: Melodies are generated once when robot spawns, never regenerated
2. **Index-Based**: Store note indices (0-7), not literal pitches
3. **16-Step Grid**: 2-measure loop quantized to 8th notes (16 possible positions)
4. **Weighted Distribution**: Lower indices (0-2) more common than higher (6-7)
5. **Syncopation Control**: Balance between on-beat and off-beat events

## Data Structure

```typescript
interface RobotMelodyEvent {
  id: string;               // Unique identifier (e.g., "mel-abc123")
  startStep: number;        // 1..16 (8th-note position in 2-measure loop)
  length: '8n' | '4n' | '2n'; // Note duration
  noteIndex: number;        // 0..7 (maps into availableNotes palette)
}

interface Robot {
  // ... other fields
  melody: RobotMelodyEvent[];  // 4-12 events per robot
}
```

## Generation Algorithm

**File: `src/engine/melodyGenerator.ts`**

```typescript
export function generateMelodyForRobot(opts?: {
  events?: number;           // Number of notes (default: 4-12)
  rand?: () => number;       // RNG for testing (default: Math.random)
  syncopationBias?: number;  // 0-1, off-beat preference (default: 0.4)
}): RobotMelodyEvent[] {
  const eventsCount = opts?.events ?? (4 + Math.floor(Math.random() * 9));
  const melody: RobotMelodyEvent[] = [];
  const usedSlots = new Set<number>();
  
  for (let i = 0; i < eventsCount; i++) {
    // 1. Pick step position
    const useOffBeat = Math.random() < (opts?.syncopationBias ?? 0.4);
    const candidateSteps = useOffBeat 
      ? [2, 4, 6, 8, 10, 12, 14, 16]   // Even steps (off-beat)
      : [1, 3, 5, 7, 9, 11, 13, 15];   // Odd steps (on-beat)
    
    let startStep = candidateSteps[Math.floor(Math.random() * candidateSteps.length)];
    
    // Avoid duplicate slots (with retry limit)
    let attempts = 0;
    while (usedSlots.has(startStep) && attempts < 8) {
      startStep = candidateSteps[Math.floor(Math.random() * candidateSteps.length)];
      attempts++;
    }
    usedSlots.add(startStep);
    
    // 2. Pick note index (weighted)
    const noteIndex = pickWeightedIndex();
    
    // 3. Pick duration (biased toward shorter)
    const length = pickLength();
    
    melody.push({
      id: crypto.randomUUID(),
      startStep,
      length,
      noteIndex,
    });
  }
  
  return melody;
}
```

## Weighted Index Selection

The `pickWeightedIndex()` function creates a natural melodic distribution favoring lower indices (which typically map to lower, more fundamental pitches in the palette).

```typescript
export function pickWeightedIndex(rand = Math.random): number {
  const weights = [0.35, 0.20, 0.15, 0.10, 0.07, 0.06, 0.04, 0.03];
  const r = rand();
  let acc = 0;
  
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return i;
  }
  
  return weights.length - 1;  // Fallback to last index
}
```

**Distribution:**
- Index 0: **35%** (most common, typically root/tonic)
- Index 1: **20%** (second most common)
- Index 2: **15%**
- Index 3: **10%**
- Index 4: **7%**
- Index 5: **6%**
- Index 6: **4%**
- Index 7: **3%** (rarest, typically highest pitch)

## Duration Selection

```typescript
function pickLength(rand = Math.random): '8n' | '4n' | '2n' {
  const weights = [0.6, 0.3, 0.1];  // Bias toward shorter notes
  const r = rand();
  let acc = 0;
  
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return ['8n', '4n', '2n'][i];
  }
  
  return '8n';
}
```

**Distribution:**
- `8n` (eighth note): **60%** (shortest, most rhythmic)
- `4n` (quarter note): **30%** (medium)
- `2n` (half note): **10%** (longest, sustained)

## Syncopation Control

```typescript
const syncopationBias = 0.4;  // 40% off-beat preference

// On-beat positions (odd steps): 1, 3, 5, 7, 9, 11, 13, 15
// Off-beat positions (even steps): 2, 4, 6, 8, 10, 12, 14, 16

const useOffBeat = Math.random() < syncopationBias;
```

**Effect:**
- Lower bias (0.0-0.3): More predictable, "square" rhythms
- Medium bias (0.4-0.6): Balanced, natural syncopation
- Higher bias (0.7-1.0): Heavily syncopated, jazzy feel

## Integration at Spawn

```typescript
// In robot spawner
function spawnRobot(): Robot {
  const melody = generateMelodyForRobot({
    events: 6,               // This robot gets 6 notes
    syncopationBias: 0.5,    // Moderately syncopated
  });
  
  return {
    id: crypto.randomUUID(),
    position: { x: 100, y: 200, z: 2 },
    state: 'idle',
    melody,  // Immutable from this point forward
    // ... other fields
  };
}
```

## Melody Registration

After spawning, register melody with AudioEngine for scheduling:

```typescript
AudioEngine.registerRobotMelody(robot.id, robot.melody);
```

This creates a step registry for O(1) lookup:

```typescript
// Internal AudioEngine structure
const stepRegistry = new Map<number, Array<{ robotId: string; event: RobotMelodyEvent }>>();

// Registration populates registry
robot.melody.forEach(event => {
  const entries = stepRegistry.get(event.startStep) || [];
  entries.push({ robotId: robot.id, event });
  stepRegistry.set(event.startStep, entries);
});
```

## Playback Integration

```typescript
// AudioEngine schedules 8n tick
BeatClock.scheduleRepeat('8n', (time) => {
  const currentStep = (stepCounter % 16) + 1;  // 1..16
  const events = stepRegistry.get(currentStep) || [];
  const notes = getAvailableNotes();
  
  events.forEach(({ robotId, event }) => {
    const note = notes[event.noteIndex];  // Map index → pitch
    
    scheduleNote({
      robotId,
      note,
      duration: event.length,
      time: time + MIN_LEAD,
    });
  });
  
  stepCounter++;
});
```

## Melody Removal

When robot is removed, unregister melody:

```typescript
AudioEngine.unregisterRobotMelody(robot.id);

// Cleanup step registry
stepRegistry.forEach((entries, step) => {
  const filtered = entries.filter(e => e.robotId !== robot.id);
  if (filtered.length > 0) {
    stepRegistry.set(step, filtered);
  } else {
    stepRegistry.delete(step);
  }
});
```

## Configuration & Tuning

**Configurable parameters:**
```typescript
interface MelodyConfig {
  minEvents: number;           // Default: 4
  maxEvents: number;           // Default: 12
  syncopationBias: number;     // Default: 0.4 (0-1)
  durationWeights: [number, number, number];  // Default: [0.6, 0.3, 0.1]
  noteIndexWeights: number[];  // Default: [0.35, 0.20, 0.15, ...]
}
```

**Per-robot variation:**
```typescript
// Vary melody complexity by robot attributes
const eventCount = robot.audio.pitchRangeMax > 600 
  ? 8   // High-pitched robots: more notes
  : 5;  // Low-pitched robots: fewer notes

const melody = generateMelodyForRobot({ events: eventCount });
```

## Testing

**Unit test examples** (see [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md#testing) for full patterns):

```typescript
describe('pickWeightedIndex', () => {
  it('should favor lower indices', () => {
    const results = Array(1000).fill(0).map(() => pickWeightedIndex());
    const zeros = results.filter(x => x === 0).length;
    expect(zeros).toBeGreaterThan(300);  // ~35% should be index 0
  });
});

describe('generateMelodyForRobot', () => {
  it('should respect event count', () => {
    const melody = generateMelodyForRobot({ events: 7 });
    expect(melody).toHaveLength(7);
  });
  
  it('should use deterministic RNG', () => {
    let seed = 42;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    
    const melody1 = generateMelodyForRobot({ rand });
    seed = 42;
    const melody2 = generateMelodyForRobot({ rand });
    
    expect(melody1).toEqual(melody2);
  });
});
```

## Debugging

**Dev overlay display:**
```typescript
// Show melody for selected robot
if (selectedRobot) {
  console.log('Melody Events:', selectedRobot.melody);
  console.log('Step distribution:', countSteps(selectedRobot.melody));
  console.log('Index distribution:', countIndices(selectedRobot.melody));
}
```

**Visual timeline:**
```
Step: [1] [2] [3] [4] [5] [6] [7] [8] [9] [10] [11] [12] [13] [14] [15] [16]
Note:  ●       ●   ●       ●           ●             ●            ●
Index: 2       0   4       1           3             2            0
```

## Performance Notes

- Generation time: < 1ms per melody (negligible at spawn)
- Step registry lookup: O(1) per tick
- No per-frame allocations during playback
- Melody immutability allows safe sharing/cloning
