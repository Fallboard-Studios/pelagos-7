# Phase 4: Core Architecture (M1) - Detailed Steps

**Timeline:** Week 2, Days 1-4 (3-4 days, ~20 hours)  
**Goal:** Implement the three pillars fully: Audio scheduling with Transport, GSAP timeline management, and complete state system. This is the technical heart of the project.

---

## Prerequisites

- [ ] Phase 3 complete (M0 milestone done)
- [ ] App runs with Play button → empty canvas flow
- [ ] AudioEngine, BeatClock, and oceanStore exist (stubs)
- [ ] All M1 issues created and in project backlog
- [ ] Understanding of beat-based timing concept

---

## Why This Phase Matters

**This IS the portfolio piece.** Audio/animation separation, beat-based timing, timeline management outside React state - these are the hard architectural problems that demonstrate senior-level thinking.

**What makes this impressive:**
- Musical timing system (not just `setTimeout`)
- Separation of concerns (Audio never touches Animation)
- GSAP timelines managed imperatively (not in React state)
- Harmony system that adapts melodies automatically
- Polyphony management and voice stealing

**After Phase 4:** The architecture is proven. Everything else (robots, visuals, interactions) builds on this foundation without changing it.

---

## Phase Overview

You'll implement 6 issues from Milestone M1:

1. **M1.1:** Harmony System (8-note palettes, 4-measure cycles)
2. **M1.2:** Melody Generator (16-step loops, weighted note selection)
3. **M1.3:** AudioEngine Note Scheduling (actual sound playback)
4. **M1.4:** Timeline Management (timelineMap utilities)
5. **M1.5:** Robot Type Definition (complete type system)
6. **M1.6:** Complete Store Actions (full CRUD + selectors)

**End state:** Console logs show beat tracking, harmony changes, and note scheduling. No visuals yet, but the engine works.

---

## Issue M1.1: Implement Harmony System (3-4 hours)

### 1.1 Port TIME_PITCHES from Oceanic

**File: `src/engine/harmonySystem.ts`**

```typescript
/**
 * Harmony System
 * 
 * Provides 8-note palettes that change every 4 measures.
 * Robots reference note indices (0-7) which map to current palette.
 */

type EightNotes = readonly [string, string, string, string, string, string, string, string];

/**
 * 24-hour palette mapping (hour 0-23 → 8 notes each)
 * Derived from measures: hour = floor(currentMeasure % 96 / 4)
 */
export const TIME_PITCHES: Record<number, EightNotes> = {
  0: ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4'],
  1: ['C3', 'Eb3', 'F3', 'G3', 'Bb3', 'C4', 'Eb4', 'F4'],
  2: ['D3', 'E3', 'F#3', 'A3', 'B3', 'D4', 'E4', 'F#4'],
  3: ['Eb3', 'F3', 'G3', 'Bb3', 'C4', 'Eb4', 'F4', 'G4'],
  4: ['E3', 'F#3', 'G#3', 'B3', 'C#4', 'E4', 'F#4', 'G#4'],
  5: ['F3', 'G3', 'A3', 'C4', 'D4', 'F4', 'G4', 'A4'],
  6: ['F#3', 'G#3', 'A#3', 'C#4', 'D#4', 'F#4', 'G#4', 'A#4'],
  7: ['G3', 'A3', 'B3', 'D4', 'E4', 'G4', 'A4', 'B4'],
  8: ['G#3', 'A#3', 'C4', 'D#4', 'F4', 'G#4', 'A#4', 'C5'],
  9: ['A3', 'B3', 'C#4', 'E4', 'F#4', 'A4', 'B4', 'C#5'],
  10: ['Bb3', 'C4', 'D4', 'F4', 'G4', 'Bb4', 'C5', 'D5'],
  11: ['B3', 'C#4', 'D#4', 'F#4', 'G#4', 'B4', 'C#5', 'D#5'],
  12: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'],
  13: ['C#4', 'D#4', 'F4', 'G#4', 'A#4', 'C#5', 'D#5', 'F5'],
  14: ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5'],
  15: ['Eb4', 'F4', 'G4', 'Bb4', 'C5', 'Eb5', 'F5', 'G5'],
  16: ['E4', 'F#4', 'G#4', 'B4', 'C#5', 'E5', 'F#5', 'G#5'],
  17: ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5'],
  18: ['F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'],
  19: ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5'],
  20: ['G#4', 'A#4', 'C5', 'D#5', 'F5', 'G#5', 'A#5', 'C6'],
  21: ['A4', 'B4', 'C#5', 'E5', 'F#5', 'A5', 'B5', 'C#6'],
  22: ['Bb4', 'C5', 'D5', 'F5', 'G5', 'Bb5', 'C6', 'D6'],
  23: ['B4', 'C#5', 'D#5', 'F#5', 'G#5', 'B5', 'C#6', 'D#6'],
};

// Current active palette (mutable module state)
let availableNotes: string[] = [...TIME_PITCHES[0]];
let lastHour = 0;

/**
 * Get current 8-note palette.
 * Returns a copy to prevent external mutation.
 */
export function getAvailableNotes(): string[] {
  return [...availableNotes];
}

/**
 * Set palette directly (for testing or manual control).
 */
export function setAvailableNotes(notes: EightNotes): void {
  if (notes.length !== 8) {
    console.warn('[harmonySystem] Expected 8 notes, got', notes.length);
    return;
  }
  availableNotes = [...notes];
  console.log('[harmonySystem] Palette updated:', availableNotes);
}

/**
 * Calculate current hour from measures (96 measures = 24 hours).
 */
function getCurrentHour(currentMeasure: number): number {
  // 96 measures = full day, 4 measures = 1 hour
  return Math.floor((currentMeasure % 96) / 4);
}

/**
 * Initialize harmony cycle (call from AudioEngine.start).
 * Checks for hour changes every measure and updates palette.
 */
export function scheduleHarmonyCycle(): void {
  const { Tone } = require('tone');
  
  // Check for hour change every measure
  Tone.Transport.scheduleRepeat((time: number) => {
    const { getCurrentMeasure } = require('./beatClock');
    const currentMeasure = getCurrentMeasure();
    const hour = getCurrentHour(currentMeasure);
    
    if (hour !== lastHour) {
      lastHour = hour;
      const newPalette = TIME_PITCHES[hour];
      setAvailableNotes(newPalette);
      console.log(`[harmonySystem] Hour ${hour}: ${newPalette.join(', ')}`);
    }
  }, '1m'); // Check every measure
  
  console.log('[harmonySystem] Harmony cycle scheduled');
}

/**
 * Reset to hour 0 (for testing).
 */
export function resetHarmony(): void {
  lastHour = 0;
  setAvailableNotes(TIME_PITCHES[0]);
}
```

### 1.2 Integrate with AudioEngine

**File: `src/engine/AudioEngine.ts`**

Add import at top:
```typescript
import { scheduleHarmonyCycle } from './harmonySystem';
```

In `start()` method, after `initBeatClock()`:
```typescript
// Initialize harmony system
scheduleHarmonyCycle();
```

### 1.3 Test Harmony Changes

**Create test file: `src/debug/testHarmony.ts`**

```typescript
import { AudioEngine } from '../engine/AudioEngine';
import { getAvailableNotes } from '../engine/harmonySystem';
import { getCurrentMeasure } from '../engine/beatClock';

/**
 * Test harmony system changes.
 * Run this after clicking Play button.
 */
export async function testHarmonySystem() {
  console.log('=== Harmony System Test ===');
  
  // Show initial palette
  console.log('Initial notes:', getAvailableNotes());
  
  // Log current measure and palette every 2 seconds
  const interval = setInterval(() => {
    const measure = getCurrentMeasure();
    const notes = getAvailableNotes();
    console.log(`Measure ${measure}: ${notes.join(', ')}`);
  }, 2000);
  
  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
    console.log('=== Test Complete ===');
  }, 30000);
}

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).testHarmony = testHarmonySystem;
}
```

**Add to main.tsx for debugging:**
```typescript
import './debug/testHarmony';
```

**Manual test:**
1. Start app, click Play
2. Open console
3. Run: `testHarmony()`
4. Watch console for 30 seconds
5. Verify palette changes every 4 measures (at 60 BPM, 4 measures = ~16 seconds)

### 1.4 Acceptance Criteria

- [ ] TIME_PITCHES defined with 24 entries
- [ ] Each entry has exactly 8 notes
- [ ] getAvailableNotes() returns current palette
- [ ] scheduleHarmonyCycle() uses Transport.scheduleRepeat
- [ ] Palette updates every 4 measures
- [ ] Hour derived from measures (not stored)
- [ ] Console logs show palette changes
- [ ] No setTimeout/setInterval used

### 1.5 Commit, Push, PR

```bash
git checkout -b feature/m1-1-harmony-system
git add src/engine/harmonySystem.ts src/engine/AudioEngine.ts src/debug/testHarmony.ts src/main.tsx
git commit -m "feat(audio): implement harmony system with 8-note palettes

Implements M1.1: Harmony system

- TIME_PITCHES with 24 hourly palettes (8 notes each)
- getAvailableNotes() returns current active palette
- scheduleHarmonyCycle() checks for hour changes every measure
- Hour derived from measures (96 measures = 24 hours)
- Palette updates automatically via Transport.scheduleRepeat
- Test utility for debugging palette changes

Closes #7"
git push origin feature/m1-1-harmony-system
```

---

## Issue M1.2: Implement Melody Generator (2-3 hours)

### 2.1 Create Melody Types

**File: `src/types/Melody.ts`**

```typescript
/**
 * Melody event for 16-step loop (2 measures at 4/4).
 */
export interface MelodyEvent {
  id: string;
  startStep: number;    // 1-16 (8th note grid)
  length: '8n' | '4n' | '2n';
  noteIndex: number;    // 0-7 (maps to harmony palette)
}
```

### 2.2 Create Generator

**File: `src/engine/melodyGenerator.ts`**

```typescript
import type { MelodyEvent } from '../types/Melody';

/**
 * Melody Generator
 * 
 * Creates 16-step melody loops with weighted note selection.
 * Notes are stored as indices (0-7) that map to harmony palette.
 */

/**
 * Pick a weighted note index (0-7).
 * Lower indices more likely (0 = 35%, 7 = 3%).
 */
export function pickWeightedIndex(rand = Math.random): number {
  const weights = [0.35, 0.20, 0.15, 0.10, 0.07, 0.06, 0.04, 0.03];
  const r = rand();
  let acc = 0;
  
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r <= acc) return i;
  }
  
  return weights.length - 1; // fallback to last index
}

/**
 * Pick a random duration with bias toward shorter notes.
 */
function pickDuration(rand = Math.random): '8n' | '4n' | '2n' {
  const r = rand();
  if (r < 0.6) return '8n';      // 60% eighth notes
  if (r < 0.9) return '4n';      // 30% quarter notes
  return '2n';                    // 10% half notes
}

/**
 * Generate a melody for a robot.
 * Returns 4-12 events across 16 steps (2 measures).
 */
export function generateMelodyForRobot(): MelodyEvent[] {
  const eventCount = 4 + Math.floor(Math.random() * 9); // 4-12 events
  const events: MelodyEvent[] = [];
  
  for (let i = 0; i < eventCount; i++) {
    const event: MelodyEvent = {
      id: crypto.randomUUID(),
      startStep: 1 + Math.floor(Math.random() * 16), // 1-16
      length: pickDuration(),
      noteIndex: pickWeightedIndex(),
    };
    events.push(event);
  }
  
  // Sort by startStep for cleaner display
  events.sort((a, b) => a.startStep - b.startStep);
  
  return events;
}

/**
 * Generate melody from parent melodies (for factory spawning later).
 * Blends characteristics of parent melodies.
 */
export function generateMelodyFromParents(
  parentA: MelodyEvent[],
  parentB: MelodyEvent[]
): MelodyEvent[] {
  // For now, just generate fresh melody
  // In M4, implement actual inheritance logic
  return generateMelodyForRobot();
}
```

### 2.3 Add Melody to Robot Type (preparation for M1.5)

We'll update the Robot type later in M1.5, but for now create the melody field definition.

**File: `src/types/Robot.ts`** (update)

Add import at top:
```typescript
import type { MelodyEvent } from './Melody';
```

Add to Robot interface:
```typescript
export interface Robot {
  id: string;
  state: RobotState;
  position: Vec2;
  destination: Vec2 | null;
  melody: MelodyEvent[];  // NEW: 16-step loop
}
```

### 2.4 Test Melody Generator

**Create test file: `src/debug/testMelody.ts`**

```typescript
import { generateMelodyForRobot, pickWeightedIndex } from '../engine/melodyGenerator';

/**
 * Test melody generation.
 */
export function testMelodyGenerator() {
  console.log('=== Melody Generator Test ===');
  
  // Test weighted index distribution
  const indexCounts = Array(8).fill(0);
  for (let i = 0; i < 1000; i++) {
    const idx = pickWeightedIndex();
    indexCounts[idx]++;
  }
  console.log('Index distribution (1000 samples):', indexCounts);
  console.log('Expected: ~[350, 200, 150, 100, 70, 60, 40, 30]');
  
  // Generate sample melodies
  console.log('\n=== Sample Melodies ===');
  for (let i = 0; i < 3; i++) {
    const melody = generateMelodyForRobot();
    console.log(`\nMelody ${i + 1} (${melody.length} events):`);
    melody.forEach(e => {
      console.log(`  Step ${e.startStep.toString().padStart(2)}: Note ${e.noteIndex} (${e.length})`);
    });
  }
  
  console.log('\n=== Test Complete ===');
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).testMelody = testMelodyGenerator;
}
```

Add to `src/main.tsx`:
```typescript
import './debug/testMelody';
```

**Manual test:**
1. Open console
2. Run: `testMelody()`
3. Verify:
   - Index distribution roughly matches expected weights
   - Melodies have 4-12 events
   - startStep values are 1-16
   - noteIndex values are 0-7
   - Lengths are '8n', '4n', or '2n'

### 2.5 Acceptance Criteria

- [ ] MelodyEvent type defined
- [ ] generateMelodyForRobot() creates 4-12 events
- [ ] Events have startStep (1-16)
- [ ] Events have noteIndex (0-7)
- [ ] pickWeightedIndex() biases toward lower indices
- [ ] Duration selection biases toward shorter notes
- [ ] No literal pitch strings in melodies
- [ ] Melodies are unique on each generation

### 2.6 Commit, Push, PR

```bash
git checkout -b feature/m1-2-melody-generator
git add src/types/Melody.ts src/engine/melodyGenerator.ts src/types/Robot.ts src/debug/testMelody.ts src/main.tsx
git commit -m "feat(audio): implement melody generator with weighted selection

Implements M1.2: Melody generator

- MelodyEvent type (startStep, length, noteIndex)
- generateMelodyForRobot() creates 16-step loops
- pickWeightedIndex() with 35%/20%/15%/10%/7%/6%/4%/3% distribution
- Duration selection biased toward 8n (60%)
- No literal pitches (index-based for harmony adaptation)
- Test utility for distribution verification

Closes #8"
git push origin feature/m1-2-melody-generator
```

---

## Issue M1.3: Implement AudioEngine Note Scheduling (4-5 hours)

### 3.1 Extend AudioEngine with Melody Playback

**File: `src/engine/AudioEngine.ts`** (major update)

```typescript
import { Tone } from 'tone';
import { initBeatClock } from './beatClock';
import { scheduleHarmonyCycle, getAvailableNotes } from './harmonySystem';
import type { MelodyEvent } from '../types/Melody';

/**
 * Note scheduling parameters
 */
interface NoteParams {
  robotId: string;
  note: string;
  duration?: string;
  velocity?: number;
}

/**
 * Step registry entry
 */
interface StepEvent {
  robotId: string;
  event: MelodyEvent;
}

class AudioEngineImpl {
  private initialized = false;
  private polySynth: Tone.PolySynth | null = null;
  
  // Melody registry: robotId → melody
  private melodyRegistry = new Map<string, MelodyEvent[]>();
  
  // Step registry: step (1-16) → events scheduled for that step
  private stepRegistry = new Map<number, StepEvent[]>();
  
  // Polyphony tracking
  private readonly MAX_VOICES = 8;
  private activeVoices = 0;
  
  // Current step (1-16)
  private currentStep = 1;

  async start(): Promise<void> {
    if (this.initialized) {
      console.warn('AudioEngine already initialized');
      return;
    }

    try {
      await Tone.start();
      console.log('Tone.js audio context started');

      Tone.Transport.bpm.value = 60;
      
      // Create synth with more interesting sound
      this.polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 0.8,
        },
      }).toDestination();

      Tone.Transport.start();
      initBeatClock();
      scheduleHarmonyCycle();
      
      // Start melody loop
      this.scheduleMelodyLoop();

      this.initialized = true;
      console.log('AudioEngine initialized successfully');
    } catch (error) {
      console.error('AudioEngine failed to start:', error);
      throw error;
    }
  }

  stop(): void {
    if (!this.initialized) return;

    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear all scheduled events
    this.polySynth?.dispose();
    this.polySynth = null;
    this.melodyRegistry.clear();
    this.stepRegistry.clear();
    this.initialized = false;

    console.log('AudioEngine stopped');
  }

  /**
   * Schedule the 16-step melody loop.
   * Runs on every 8th note.
   */
  private scheduleMelodyLoop(): void {
    Tone.Transport.scheduleRepeat((time) => {
      // Advance step (1-16, wrapping)
      this.currentStep = (this.currentStep % 16) + 1;
      
      // Get events for this step
      const events = this.stepRegistry.get(this.currentStep) || [];
      
      // Schedule each event (with polyphony limit)
      for (const stepEvent of events) {
        if (this.activeVoices < this.MAX_VOICES) {
          this.playMelodyEvent(stepEvent, time);
        } else {
          // Voice stealing: skip this note (could implement priority later)
          console.log('[AudioEngine] Voice limit reached, skipping note');
        }
      }
    }, '8n');
    
    console.log('[AudioEngine] Melody loop scheduled (16-step)');
  }

  /**
   * Play a single melody event.
   */
  private playMelodyEvent(stepEvent: StepEvent, time: number): void {
    const { event } = stepEvent;
    
    // Map noteIndex to current harmony palette
    const palette = getAvailableNotes();
    const note = palette[event.noteIndex] || palette[0]; // fallback to first note
    
    // Schedule note with lookahead
    const MIN_LEAD = 0.05; // 50ms lookahead
    const scheduleTime = time + MIN_LEAD;
    
    this.activeVoices++;
    
    this.polySynth?.triggerAttackRelease(
      note,
      event.length,
      scheduleTime,
      0.5 // velocity
    );
    
    // Decrement voice count after note duration
    const duration = Tone.Time(event.length).toSeconds();
    setTimeout(() => {
      this.activeVoices--;
    }, (duration + MIN_LEAD) * 1000);
  }

  /**
   * Register a robot's melody for playback.
   */
  registerRobotMelody(robotId: string, melody: MelodyEvent[]): void {
    // Store melody
    this.melodyRegistry.set(robotId, melody);
    
    // Add to step registry
    for (const event of melody) {
      const step = event.startStep;
      const existing = this.stepRegistry.get(step) || [];
      existing.push({ robotId, event });
      this.stepRegistry.set(step, existing);
    }
    
    console.log(`[AudioEngine] Registered melody for ${robotId} (${melody.length} events)`);
  }

  /**
   * Unregister a robot's melody (when robot is removed).
   */
  unregisterRobotMelody(robotId: string): void {
    this.melodyRegistry.delete(robotId);
    
    // Remove from step registry
    for (const [step, events] of this.stepRegistry.entries()) {
      const filtered = events.filter(e => e.robotId !== robotId);
      if (filtered.length > 0) {
        this.stepRegistry.set(step, filtered);
      } else {
        this.stepRegistry.delete(step);
      }
    }
    
    console.log(`[AudioEngine] Unregistered melody for ${robotId}`);
  }

  /**
   * Schedule a single note (for interactions, not melodies).
   */
  scheduleNote(params: NoteParams): void {
    if (!this.initialized || !this.polySynth) {
      console.warn('[AudioEngine] Not initialized, cannot schedule note');
      return;
    }
    
    const { note, duration = '8n', velocity = 0.5 } = params;
    
    this.polySynth.triggerAttackRelease(
      note,
      duration,
      Tone.now() + 0.05,
      velocity
    );
  }

  isReady(): boolean {
    return this.initialized;
  }
  
  /**
   * Get current step (for debugging).
   */
  getCurrentStep(): number {
    return this.currentStep;
  }
  
  /**
   * Get active voice count (for debugging).
   */
  getActiveVoices(): number {
    return this.activeVoices;
  }
}

export const AudioEngine = new AudioEngineImpl();
```

### 3.2 Create Test Utility

**File: `src/debug/testAudioScheduling.ts`**

```typescript
import { AudioEngine } from '../engine/AudioEngine';
import { generateMelodyForRobot } from '../engine/melodyGenerator';

/**
 * Test audio scheduling with sample melodies.
 */
export function testAudioScheduling() {
  console.log('=== Audio Scheduling Test ===');
  
  // Generate and register 3 test melodies
  for (let i = 1; i <= 3; i++) {
    const melody = generateMelodyForRobot();
    const robotId = `test-robot-${i}`;
    AudioEngine.registerRobotMelody(robotId, melody);
    
    console.log(`Registered ${robotId}:`);
    melody.forEach(e => {
      console.log(`  Step ${e.startStep}: Note ${e.noteIndex} (${e.length})`);
    });
  }
  
  // Log current step every second
  const interval = setInterval(() => {
    const step = AudioEngine.getCurrentStep();
    const voices = AudioEngine.getActiveVoices();
    console.log(`Step ${step.toString().padStart(2)} | Active voices: ${voices}`);
  }, 1000);
  
  // Stop after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
    
    // Unregister test melodies
    for (let i = 1; i <= 3; i++) {
      AudioEngine.unregisterRobotMelody(`test-robot-${i}`);
    }
    
    console.log('=== Test Complete ===');
  }, 30000);
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).testAudio = testAudioScheduling;
}
```

Add to `src/main.tsx`:
```typescript
import './debug/testAudioScheduling';
```

### 3.3 Test Audio Playback

1. Start app, click Play
2. Open console
3. Run: `testAudio()`
4. **Listen for sound** - you should hear notes playing in patterns
5. Watch console logs showing step progression and voice count
6. Verify:
   - Notes play at regular intervals (8th notes)
   - Step counter cycles 1-16
   - Active voices stay under 8
   - Different melodies create overlapping patterns

### 3.4 Acceptance Criteria

- [ ] scheduleNote() triggers actual sound
- [ ] registerRobotMelody() stores melody in registry
- [ ] Step registry created (Map<step, events[]>)
- [ ] 8n callback plays scheduled events
- [ ] Note indices map to harmony palette
- [ ] Polyphony limit enforced (MAX_VOICES = 8)
- [ ] Voice counting works
- [ ] unregisterRobotMelody() cleans up properly
- [ ] No timing drift (synchronized to Transport)
- [ ] Audible sound output confirmed

### 3.5 Commit, Push, PR

```bash
git checkout -b feature/m1-3-audio-scheduling
git add src/engine/AudioEngine.ts src/debug/testAudioScheduling.ts src/main.tsx
git commit -m "feat(audio): implement melody playback with step registry

Implements M1.3: AudioEngine note scheduling

- Step registry for O(1) event lookup
- 16-step loop via Transport.scheduleRepeat('8n')
- Melody registration/unregistration
- Polyphony limiting (8 voices max)
- Voice counting and management
- Note index → harmony palette mapping
- MIN_LEAD lookahead for reliable scheduling
- Test utility with 3 sample melodies

Closes #9"
git push origin feature/m1-3-audio-scheduling
```

---

## Issue M1.4: Implement Timeline Management (1-2 hours)

### 4.1 Create Timeline Map Utilities

**File: `src/animation/timelineMap.ts`**

```typescript
import { gsap } from 'gsap';

/**
 * Timeline Management
 * 
 * GSAP timelines must NOT be stored in React state or Zustand.
 * This module provides imperative timeline management.
 */

// Global timeline registry
export const timelineMap = new Map<string, gsap.core.Timeline>();

/**
 * Store a timeline reference.
 */
export function setTimeline(id: string, timeline: gsap.core.Timeline): void {
  // Kill existing timeline if present
  killTimeline(id);
  
  timelineMap.set(id, timeline);
  console.log(`[timelineMap] Stored timeline: ${id}`);
}

/**
 * Get a timeline reference.
 */
export function getTimeline(id: string): gsap.core.Timeline | undefined {
  return timelineMap.get(id);
}

/**
 * Kill and remove a timeline.
 */
export function killTimeline(id: string): void {
  const tl = timelineMap.get(id);
  if (tl) {
    tl.kill();
    timelineMap.delete(id);
    console.log(`[timelineMap] Killed timeline: ${id}`);
  }
}

/**
 * Kill all timelines (for cleanup).
 */
export function killAllTimelines(): void {
  console.log(`[timelineMap] Killing all timelines (${timelineMap.size} total)`);
  
  for (const [id, tl] of timelineMap.entries()) {
    tl.kill();
  }
  
  timelineMap.clear();
}

/**
 * Check if timeline exists.
 */
export function hasTimeline(id: string): boolean {
  return timelineMap.has(id);
}

/**
 * Get all timeline IDs (for debugging).
 */
export function getAllTimelineIds(): string[] {
  return Array.from(timelineMap.keys());
}

/**
 * Get timeline count (for debugging).
 */
export function getTimelineCount(): number {
  return timelineMap.size;
}
```

### 4.2 Add Cleanup to Store

**File: `src/stores/oceanStore.ts`** (update)

Add import at top:
```typescript
import { killTimeline } from '../animation/timelineMap';
```

Update `removeRobot` action:
```typescript
removeRobot: (id) => {
  // Kill timeline before removing from state
  killTimeline(id);
  
  set((state) => ({
    robots: state.robots.filter((r) => r.id !== id),
  }));
  
  console.log('[oceanStore] Robot removed:', id);
},
```

### 4.3 Create Test Utility

**File: `src/debug/testTimelines.ts`**

```typescript
import { gsap } from 'gsap';
import {
  setTimeline,
  getTimeline,
  killTimeline,
  getAllTimelineIds,
  getTimelineCount,
} from '../animation/timelineMap';

/**
 * Test timeline management.
 */
export function testTimelineManagement() {
  console.log('=== Timeline Management Test ===');
  
  // Create some test timelines
  console.log('\nCreating 3 test timelines...');
  for (let i = 1; i <= 3; i++) {
    const id = `test-timeline-${i}`;
    const tl = gsap.timeline();
    
    // Add dummy animation
    tl.to({}, { duration: 10 });
    
    setTimeline(id, tl);
  }
  
  console.log(`Timeline count: ${getTimelineCount()}`);
  console.log('Timeline IDs:', getAllTimelineIds());
  
  // Test retrieval
  console.log('\nTesting getTimeline...');
  const tl = getTimeline('test-timeline-2');
  console.log('Retrieved timeline-2:', tl ? 'exists' : 'not found');
  
  // Test killing individual timeline
  console.log('\nKilling timeline-1...');
  killTimeline('test-timeline-1');
  console.log(`Timeline count: ${getTimelineCount()}`);
  console.log('Timeline IDs:', getAllTimelineIds());
  
  // Test replacing timeline (should kill old one)
  console.log('\nReplacing timeline-2...');
  const newTl = gsap.timeline();
  newTl.to({}, { duration: 5 });
  setTimeline('test-timeline-2', newTl);
  console.log(`Timeline count: ${getTimelineCount()}`);
  
  // Clean up
  console.log('\nKilling remaining timelines...');
  killTimeline('test-timeline-2');
  killTimeline('test-timeline-3');
  
  console.log(`Final timeline count: ${getTimelineCount()}`);
  console.log('=== Test Complete ===');
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).testTimelines = testTimelineManagement;
}
```

Add to `src/main.tsx`:
```typescript
import './debug/testTimelines';
```

### 4.4 Test Timeline Management

1. Open console
2. Run: `testTimelines()`
3. Verify:
   - Timelines can be stored and retrieved
   - killTimeline removes and cleans up
   - Replacing a timeline kills the old one
   - No memory leaks (all timelines cleaned)

### 4.5 Acceptance Criteria

- [ ] timelineMap created as Map
- [ ] setTimeline() stores timeline
- [ ] getTimeline() retrieves timeline
- [ ] killTimeline() kills and removes
- [ ] killAllTimelines() cleans everything
- [ ] Timeline cleanup integrated with oceanStore.removeRobot
- [ ] No timelines stored in React/Zustand state
- [ ] Helper functions for debugging

### 4.6 Commit, Push, PR

```bash
git checkout -b feature/m1-4-timeline-management
git add src/animation/timelineMap.ts src/stores/oceanStore.ts src/debug/testTimelines.ts src/main.tsx
git commit -m "feat(animation): implement timeline management system

Implements M1.4: Timeline utilities

- timelineMap as separate Map<string, Timeline>
- setTimeline/getTimeline/killTimeline utilities
- killAllTimelines for cleanup
- Integration with oceanStore.removeRobot
- Prevents timeline storage in React state
- Debug utilities for timeline tracking

Closes #10"
git push origin feature/m1-4-timeline-management
```

---

## Issue M1.5: Add Robot Type Definition (1 hour)

### 5.1 Complete Robot Type

**File: `src/types/Robot.ts`** (complete rewrite)

```typescript
import type { MelodyEvent } from './Melody';

/**
 * Robot state enum
 */
export enum RobotState {
  Idle = 'idle',
  Swimming = 'swimming',
  Interacting = 'interacting',
  Selected = 'selected',
  Leaving = 'leaving',
}

/**
 * 2D position vector
 */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Audio synthesis attributes
 */
export interface AudioAttributes {
  synthType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  attack: number;    // 0.01 - 0.5
  decay: number;     // 0.1 - 1.0
  sustain: number;   // 0.0 - 1.0
  release: number;   // 0.1 - 3.0
  filterFreq: number; // 100 - 5000
  reverb: number;    // 0.0 - 1.0 (wetness)
}

/**
 * SVG part identifiers
 */
export interface RobotSVGParts {
  chassis: string;      // 'boxy' | 'rounded' | 'angular'
  head: string;         // 'dome' | 'square' | 'antenna'
  propeller: string;    // 'dual' | 'single' | 'fan'
  topAntenna: string;   // 'spiral' | 'straight' | 'dish'
  bottomAntenna: string;// 'claw' | 'sensor' | 'light'
}

/**
 * Complete robot entity
 */
export interface Robot {
  id: string;
  state: RobotState;
  position: Vec2;
  destination: Vec2 | null;
  
  // Audio
  melody: MelodyEvent[];
  audioAttributes: AudioAttributes;
  
  // Visual
  svgParts: RobotSVGParts;
  size: number; // 0.5 - 1.5 (scale multiplier)
  
  // Behavior
  speed: number; // 0.5 - 2.0 (affects swim duration)
  lastInteractionTime: number; // timestamp (Tone.now())
}

/**
 * Factory function to create default audio attributes
 */
export function createDefaultAudioAttributes(): AudioAttributes {
  return {
    synthType: 'sine',
    attack: 0.02,
    decay: 0.1,
    sustain: 0.3,
    release: 0.8,
    filterFreq: 1000,
    reverb: 0.2,
  };
}

/**
 * Factory function to create default SVG parts
 */
export function createDefaultSVGParts(): RobotSVGParts {
  return {
    chassis: 'boxy',
    head: 'dome',
    propeller: 'dual',
    topAntenna: 'straight',
    bottomAntenna: 'sensor',
  };
}

/**
 * Factory function to create a complete robot
 */
export function createRobot(overrides?: Partial<Robot>): Robot {
  return {
    id: crypto.randomUUID(),
    state: RobotState.Idle,
    position: { x: 960, y: 540 },
    destination: null,
    melody: [],
    audioAttributes: createDefaultAudioAttributes(),
    svgParts: createDefaultSVGParts(),
    size: 1.0,
    speed: 1.0,
    lastInteractionTime: 0,
    ...overrides,
  };
}
```

### 5.2 Update Store to Use Complete Type

**File: `src/stores/oceanStore.ts`** (update imports)

```typescript
import type { Robot, RobotState } from '../types/Robot';
```

Store is already using the Robot type, so no other changes needed.

### 5.3 Create Test Utility

**File: `src/debug/testRobotType.ts`**

```typescript
import { createRobot, createDefaultAudioAttributes, createDefaultSVGParts } from '../types/Robot';
import { generateMelodyForRobot } from '../engine/melodyGenerator';

/**
 * Test robot type and factory functions.
 */
export function testRobotType() {
  console.log('=== Robot Type Test ===');
  
  // Test default factory functions
  console.log('\nDefault audio attributes:');
  console.log(createDefaultAudioAttributes());
  
  console.log('\nDefault SVG parts:');
  console.log(createDefaultSVGParts());
  
  // Create sample robots
  console.log('\n=== Sample Robots ===');
  for (let i = 1; i <= 3; i++) {
    const robot = createRobot({
      position: { x: 100 * i, y: 200 * i },
      melody: generateMelodyForRobot(),
      size: 0.5 + Math.random(),
      speed: 0.8 + Math.random() * 0.4,
    });
    
    console.log(`\nRobot ${i}:`);
    console.log(`  ID: ${robot.id}`);
    console.log(`  Position: (${robot.position.x}, ${robot.position.y})`);
    console.log(`  Size: ${robot.size.toFixed(2)}`);
    console.log(`  Speed: ${robot.speed.toFixed(2)}`);
    console.log(`  Melody events: ${robot.melody.length}`);
    console.log(`  Audio: ${robot.audioAttributes.synthType}, attack ${robot.audioAttributes.attack}`);
    console.log(`  Chassis: ${robot.svgParts.chassis}, head: ${robot.svgParts.head}`);
  }
  
  console.log('\n=== Test Complete ===');
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).testRobotType = testRobotType;
}
```

Add to `src/main.tsx`:
```typescript
import './debug/testRobotType';
```

### 5.4 Test Robot Type

1. Open console
2. Run: `testRobotType()`
3. Verify all fields are present and have expected types
4. Check factory functions work

### 5.5 Acceptance Criteria

- [ ] Complete Robot interface defined
- [ ] RobotState enum with 5 states
- [ ] AudioAttributes type defined
- [ ] RobotSVGParts type defined
- [ ] Factory functions for defaults
- [ ] createRobot() factory with overrides
- [ ] All fields properly typed
- [ ] Used in oceanStore

### 5.6 Commit, Push, PR

```bash
git checkout -b feature/m1-5-robot-type
git add src/types/Robot.ts src/debug/testRobotType.ts src/main.tsx
git commit -m "feat(types): complete Robot type definition

Implements M1.5: Robot type system

- Complete Robot interface with all fields
- AudioAttributes (synth, ADSR, filter, reverb)
- RobotSVGParts (5 swappable components)
- Factory functions for defaults
- createRobot() with overrides support
- Size and speed attributes
- Interaction timestamp tracking

Closes #11"
git push origin feature/m1-5-robot-type
```

---

## Issue M1.6: Complete Zustand Store Actions (1-2 hours)

### 6.1 Extend Store with Full CRUD

**File: `src/stores/oceanStore.ts`** (complete rewrite)

```typescript
import { create } from 'zustand';
import type { Robot } from '../types/Robot';
import { killTimeline } from '../animation/timelineMap';
import { AudioEngine } from '../engine/AudioEngine';

/**
 * Ocean store state shape
 */
interface OceanStore {
  // State
  robots: Robot[];
  selectedRobotId: string | null;
  settings: {
    bpm: number;
    volume: number;
    maxRobots: number;
    showDebug: boolean;
  };
  
  // Actions
  addRobot: (robot: Robot) => void;
  removeRobot: (id: string) => void;
  updateRobot: (id: string, updates: Partial<Robot>) => void;
  
  // Selectors
  getRobotById: (id: string) => Robot | undefined;
  getSelectedRobot: () => Robot | undefined;
  
  // Selection
  selectRobot: (id: string | null) => void;
  
  // Settings
  updateSettings: (updates: Partial<OceanStore['settings']>) => void;
}

/**
 * Main ocean state store
 */
export const useOceanStore = create<OceanStore>((set, get) => ({
  // Initial state
  robots: [],
  selectedRobotId: null,
  settings: {
    bpm: 60,
    volume: 0.7,
    maxRobots: 12,
    showDebug: false,
  },

  // Actions
  addRobot: (robot) => {
    set((state) => ({
      robots: [...state.robots, robot],
    }));
    
    // Register melody with AudioEngine
    if (robot.melody.length > 0) {
      AudioEngine.registerRobotMelody(robot.id, robot.melody);
    }
    
    console.log('[oceanStore] Robot added:', robot.id);
  },

  removeRobot: (id) => {
    // Cleanup timeline
    killTimeline(id);
    
    // Unregister melody
    AudioEngine.unregisterRobotMelody(id);
    
    // Remove from state
    set((state) => ({
      robots: state.robots.filter((r) => r.id !== id),
      // Clear selection if removing selected robot
      selectedRobotId: state.selectedRobotId === id ? null : state.selectedRobotId,
    }));
    
    console.log('[oceanStore] Robot removed:', id);
  },

  updateRobot: (id, updates) => {
    set((state) => ({
      robots: state.robots.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  // Selectors
  getRobotById: (id) => {
    return get().robots.find((r) => r.id === id);
  },

  getSelectedRobot: () => {
    const { robots, selectedRobotId } = get();
    if (!selectedRobotId) return undefined;
    return robots.find((r) => r.id === selectedRobotId);
  },

  // Selection
  selectRobot: (id) => {
    set({ selectedRobotId: id });
    console.log('[oceanStore] Robot selected:', id || 'none');
  },

  // Settings
  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
    
    // Apply BPM change to Transport
    if (updates.bpm !== undefined) {
      const { Tone } = require('tone');
      Tone.Transport.bpm.value = updates.bpm;
      console.log('[oceanStore] BPM updated:', updates.bpm);
    }
  },
}));
```

### 6.2 Create Test Utility

**File: `src/debug/testOceanStore.ts`**

```typescript
import { useOceanStore } from '../stores/oceanStore';
import { createRobot } from '../types/Robot';
import { generateMelodyForRobot } from '../engine/melodyGenerator';

/**
 * Test oceanStore actions and selectors.
 */
export function testOceanStore() {
  console.log('=== Ocean Store Test ===');
  
  const store = useOceanStore.getState();
  
  // Test addRobot
  console.log('\nAdding 3 robots...');
  for (let i = 1; i <= 3; i++) {
    const robot = createRobot({
      position: { x: 100 * i, y: 200 + i * 50 },
      melody: generateMelodyForRobot(),
    });
    store.addRobot(robot);
  }
  
  console.log(`Robot count: ${store.robots.length}`);
  
  // Test getRobotById
  console.log('\nTesting getRobotById...');
  const firstRobot = store.robots[0];
  const retrieved = store.getRobotById(firstRobot.id);
  console.log('Retrieved robot:', retrieved?.id === firstRobot.id ? 'match' : 'no match');
  
  // Test selection
  console.log('\nTesting selection...');
  store.selectRobot(firstRobot.id);
  const selected = store.getSelectedRobot();
  console.log('Selected robot:', selected?.id === firstRobot.id ? 'match' : 'no match');
  
  // Test updateRobot
  console.log('\nTesting updateRobot...');
  store.updateRobot(firstRobot.id, { size: 1.5, speed: 0.75 });
  const updated = store.getRobotById(firstRobot.id);
  console.log('Updated size:', updated?.size);
  console.log('Updated speed:', updated?.speed);
  
  // Test settings
  console.log('\nTesting settings...');
  store.updateSettings({ bpm: 90, showDebug: true });
  console.log('Settings:', store.settings);
  
  // Test removeRobot
  console.log('\nRemoving 2 robots...');
  store.removeRobot(store.robots[1].id);
  store.removeRobot(store.robots[1].id); // Remove what's now at index 1
  console.log(`Robot count: ${store.robots.length}`);
  
  // Clean up remaining robot
  console.log('\nCleaning up...');
  store.removeRobot(store.robots[0].id);
  console.log(`Final robot count: ${store.robots.length}`);
  
  // Reset settings
  store.updateSettings({ bpm: 60, showDebug: false });
  
  console.log('\n=== Test Complete ===');
}

// Expose to window
if (typeof window !== 'undefined') {
  (window as any).testStore = testOceanStore;
}
```

Add to `src/main.tsx`:
```typescript
import './debug/testOceanStore';
```

### 6.3 Test Store Actions

1. Open console
2. Run: `testStore()`
3. Verify:
   - Robots can be added and removed
   - Selection works
   - Updates are immutable
   - Selectors return correct data
   - Settings updates work
   - BPM changes apply to Transport
   - Melody registration/unregistration happens

### 6.4 Acceptance Criteria

- [ ] All CRUD actions implemented
- [ ] getRobotById selector works
- [ ] getSelectedRobot selector works
- [ ] selectRobot manages selection state
- [ ] updateSettings with BPM sync to Transport
- [ ] Immutable state updates
- [ ] Timeline cleanup on remove
- [ ] Melody cleanup on remove
- [ ] Selection cleared when removing selected robot

### 6.5 Commit, Push, PR

```bash
git checkout -b feature/m1-6-complete-store
git add src/stores/oceanStore.ts src/debug/testOceanStore.ts src/main.tsx
git commit -m "feat(state): complete oceanStore with full CRUD and selectors

Implements M1.6: Complete store actions

- Full CRUD (add/remove/update)
- Selectors (getRobotById, getSelectedRobot)
- Selection management
- Settings with BPM Transport sync
- Melody registration/unregistration on add/remove
- Timeline cleanup on remove
- Immutable state updates
- Test utility for all actions

Closes #12"
git push origin feature/m1-6-complete-store
```

---

## Phase 4 Complete! ✅

### Final Verification Checklist

- [ ] All 6 M1 issues completed and closed
- [ ] All PRs merged to main
- [ ] Feature branches deleted
- [ ] Project board shows M1 milestone complete
- [ ] App runs without errors
- [ ] Audio plays (run `testAudio()` in console)
- [ ] Console logs show:
  - Beat/measure tracking
  - Harmony palette changes
  - Melody playback (step progression)
  - Voice counting
- [ ] TypeScript compiles
- [ ] Lint passes

### What You've Built

**Functional:**
- ✅ Harmony system (24 palettes, 4-measure cycles)
- ✅ Melody generator (weighted selection, 16-step loops)
- ✅ Audio scheduling (actual sound playback)
- ✅ Timeline management (separate from React state)
- ✅ Complete Robot type system
- ✅ Full Zustand store (CRUD + selectors)

**Architecture Proven:**
- ✅ Beat-based timing (Transport-driven)
- ✅ Audio/Animation separation (no overlap)
- ✅ Imperative timeline management
- ✅ Index-based melodies (harmony adaptation)
- ✅ Polyphony limiting
- ✅ Voice management

**Technical Depth:**
- Musical timing system
- Step registry pattern (O(1) lookup)
- Weighted randomization
- Transport scheduling
- Timeline lifecycle management
- State-timeline separation

### Current State

**What works:**
- BeatClock tracks beats and measures
- Harmony palette changes every 4 measures
- Melody generator creates varied patterns
- AudioEngine plays melodies with polyphony limiting
- Timeline utilities manage GSAP references
- Store manages robot state with proper cleanup

**What doesn't exist yet:**
- No robots visible (M2)
- No GSAP swim animation (M2)
- No interactions (M4)
- No visual actors (M4)
- No UI panels (M5)

### Testing Commands

Open console and run these to verify systems:

```javascript
testHarmony()    // Watch palette changes for 30 seconds
testMelody()     // Check distribution and generation
testAudio()      // Hear 3 overlapping melodies for 30 seconds
testTimelines()  // Verify timeline management
testRobotType()  // Check type system and factories
testStore()      // Verify all store actions
```

### Time Tracking

| Issue | Estimated | Actual |
|-------|-----------|--------|
| M1.1: Harmony | 3-4 hours | |
| M1.2: Melody | 2-3 hours | |
| M1.3: Scheduling | 4-5 hours | |
| M1.4: Timelines | 1-2 hours | |
| M1.5: Robot Type | 1 hour | |
| M1.6: Store | 1-2 hours | |
| **Total** | **~20 hours** | |

---

## Common Issues & Solutions

### Issue: No sound plays

**Symptoms:** `testAudio()` runs but silent

**Solutions:**
- Verify AudioEngine.start() was called (click Play button first)
- Check browser volume and mute settings
- Open browser audio indicator - is site producing sound?
- Check console for "User gesture required" errors
- Try `AudioEngine.scheduleNote({ robotId: 'test', note: 'C4' })` manually

### Issue: Harmony never changes

**Symptoms:** getAvailableNotes() always returns same palette

**Solutions:**
- Wait full 4 measures (at 60 BPM = ~16 seconds)
- Check getCurrentMeasure() is incrementing
- Verify scheduleHarmonyCycle() was called
- Check console for harmony system logs

### Issue: Active voices always 0

**Symptoms:** Voice counting doesn't work

**Solutions:**
- Melody must be registered: `AudioEngine.registerRobotMelody(id, melody)`
- Check step registry has events: look for logs during playback
- Verify polySynth was created in AudioEngine.start()

### Issue: Timeline cleanup doesn't work

**Symptoms:** Memory grows, timelines leak

**Solutions:**
- Verify killTimeline() is called before removing robot
- Check timelineMap.size in console
- Ensure removeRobot action calls killTimeline()
- Test with: `getAllTimelineIds()` - should be empty if no robots

---

## Portfolio Talking Points

**Architecture decisions:**
- "Built a musical timing system using Transport instead of Date.now() for frame-perfect sync"
- "Index-based melodies allow harmony to change without regenerating patterns"
- "Step registry pattern gives O(1) event lookup - scales to hundreds of robots"
- "Timeline management separate from React prevents re-render churn"
- "Polyphony limiting with voice counting prevents audio overload"

**Technical challenges solved:**
- "Harmony changes don't break melodies - they automatically adapt"
- "Transport lookahead (50ms) ensures reliable note triggering"
- "Weighted randomization creates musical bias toward consonant intervals"
- "Timeline lifecycle tied to entity lifecycle prevents memory leaks"

**Patterns established:**
- Audio scheduling through single engine
- State updates trigger side effects (melody registration)
- Immutable updates with proper cleanup
- Separation of serializable vs. imperative state

---

## Next Steps

**You're ready for Phase 5: Robot Basics (M2)**

Phase 5 will implement:
- Robot SVG components (chassis, head, propeller, antennae)
- RobotBody component (assembles parts)
- Robot spawning system
- GSAP swim animation (point-to-point)
- Idle state and destination picking
- Selection system

**Before starting Phase 5:**
1. Merge all M1 PRs
2. Update project board (M1 → Done)
3. Test all systems one more time
4. Read `docs/phase-5-robot-basics.md` (to be created)
5. Celebrate! The hard part is done.

---

**Questions?** Review docs or open a discussion.

**Ready to see robots?** Move to Phase 5: Robot Basics (M2)
