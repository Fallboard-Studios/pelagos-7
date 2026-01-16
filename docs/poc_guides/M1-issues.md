# M1: Core Architecture Issues

**Milestone:** M1 - Core Architecture  
**Timeline:** Week 1 (Days 3-5)  
**Goal:** Three Pillars operational (Audio / Animation / State)

---

## M1.1: Implement Harmony System

**Title:** [M1.1] Implement harmony system with 8-note palettes

**Labels:** feature, system: audio, size: L, priority: high

### Feature Description
Create the harmony system that provides 8-note palettes that change every 4 measures.

### Implementation Details
- Create `src/engine/harmonySystem.ts`
- Port `TIME_PITCHES` object (24 hours → 24 palettes)
- Implement `getAvailableNotes()` returns current 8 notes
- Implement `scheduleHarmonyCycle()` updates palette every 4 measures
- Use BeatClock to track when to change harmony
- Store current palette in module state (not Zustand)

**Key exports:**
```typescript
export function getAvailableNotes(): string[]
export function scheduleHarmonyCycle(): void
export const TIME_PITCHES: Record<number, [string, string, ...]>
```

### Acceptance Criteria
- [ ] TIME_PITCHES defined (24 entries, 8 notes each)
- [ ] getAvailableNotes() returns current palette
- [ ] Harmony changes every 4 measures
- [ ] Changes synchronized to Transport
- [ ] No setTimeout/setInterval used
- [ ] Console log shows palette changes (debug)

### Reference
- Oceanic: `src/engine/harmonySystem.ts` (port directly)
- Docs: `docs/HARMONY_SYSTEM.md`

---

## M1.2: Implement Melody Generator

**Title:** [M1.2] Implement melody generator with weighted note selection

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Create melody generation algorithm that produces 16-step, 2-measure loops with weighted note selection.

### Implementation Details
- Create `src/engine/melodyGenerator.ts`
- Implement `generateMelodyForRobot()` function
- Implement `pickWeightedIndex()` helper (note index 0-7)
- Generate 4-12 events per melody
- Events have: startStep (1-16), length ('8n'|'4n'|'2n'), noteIndex (0-7)

**Algorithm:**
- Random number of events (4-12)
- Weighted note selection (lower indices more likely)
- Random start steps (1-16)
- Prefer shorter durations (8n > 4n > 2n)

### Acceptance Criteria
- [ ] generateMelodyForRobot() returns MelodyEvent[]
- [ ] Events have valid startStep (1-16)
- [ ] noteIndex weighted toward lower values
- [ ] Length distribution favors '8n'
- [ ] Each melody is unique (seeded randomness)
- [ ] No literal pitch strings (indices only)

### Reference
- Oceanic: `src/engine/melodyGenerator.ts` (port algorithm exactly)
- Docs: `docs/MELODY_SYSTEM.md`

---

## M1.3: Implement AudioEngine Note Scheduling

**Title:** [M1.3] Implement AudioEngine note scheduling with melody playback

**Labels:** feature, system: audio, size: L, priority: high

### Feature Description
Complete AudioEngine with actual note playback, melody scheduling, and polyphony management.

### Implementation Details
- Extend AudioEngine with melody scheduling
- Implement `scheduleNote()` (actually triggers synth)
- Implement `registerRobotMelody()` (stores melody in registry)
- Create step registry Map<stepNumber, events[]>
- Schedule Transport.scheduleRepeat('8n') callback
- Enforce polyphony limit with skip-based limiting (8-12 max voices)

**Registry pattern:**
```typescript
const stepRegistry = new Map<number, Array<{ robotId: string, event: MelodyEvent }>>();
```

### Acceptance Criteria
- [ ] scheduleNote() triggers actual sound
- [ ] Melody registry tracks all robot melodies
- [ ] 8n callback plays scheduled events
- [ ] Note indices mapped to harmony palette
- [ ] Polyphony limit enforced (skip notes when limit exceeded)
- [ ] No timing drift (synchronized to Transport)

### Reference
- Oceanic: `src/engine/AudioEngine.ts` (melody scheduling sections)
- Docs: `docs/AUDIO_SYSTEM.md#scheduling-patterns`
- Docs: `docs/POLYPHONY_GUIDE.md`

---

## M1.4: Implement Timeline Management System

**Title:** [M1] Implement timeline management (timelineMap utilities)

**Labels:** feature, system: animation, size: S, priority: high

### Feature Description
Create utilities for managing GSAP timelines outside of React state.

### Implementation Details
- Create `src/animation/timelineMap.ts`
- Export `timelineMap` as Map<string, gsap.core.Timeline>
- Export `setTimeline(id, timeline)` function
- Export `getTimeline(id)` function
- Export `killTimeline(id)` function (kills and removes)
- Export `killAllTimelines()` function

**Pattern:**
```typescript
export const timelineMap = new Map<string, gsap.core.Timeline>();

export function killTimeline(id: string): void {
  const tl = timelineMap.get(id);
  if (tl) {
    tl.kill();
    timelineMap.delete(id);
  }
}
```

### Acceptance Criteria
- [ ] timelineMap created
- [ ] All utility functions exported
- [ ] killTimeline properly kills and removes
- [ ] No memory leaks (old timelines cleaned)
- [ ] TypeScript types correct
- [ ] Can be used from components

### Reference
- Oceanic: `src/animation/timelineMap.ts`
- Docs: `docs/ANIMATION_SYSTEM.md#timeline-management`

---

## M1.5: Add Robot Type Definition

**Title:** [M1] Add Robot type and related type definitions

**Labels:** feature, system: state, size: S, priority: high

### Feature Description
Define TypeScript types for Robot, RobotState, AudioAttributes, and related types.

### Implementation Details
- Create `src/types/Robot.ts`
- Define `Robot` interface (id, position, state, destination, melody, audioAttributes, svgParts)
- Define `RobotState` enum (idle, swimming, interacting, selected, leaving)
- Define `AudioAttributes` (synthType, adsr, pitchRange, filterFreq, reverb)
- Define `MelodyEvent` (id, startStep, length, noteIndex)
- Define `RobotSVGParts` (chassis, head, propeller, topAntenna, bottomAntenna)

**Key structure:**
```typescript
interface Robot {
  id: string;
  state: RobotState;
  position: Vec2;
  destination: Vec2 | null;
  melody: MelodyEvent[];
  audioAttributes: AudioAttributes;
  svgParts: RobotSVGParts;
}
```

### Acceptance Criteria
- [ ] Robot type defined with all fields
- [ ] RobotState enum created
- [ ] AudioAttributes type defined
- [ ] MelodyEvent type defined
- [ ] All types exported
- [ ] Used in oceanStore

### Reference
- Oceanic: `src/types/Fish.ts` → adapt to Robot
- Docs: `docs/ROBOT_DESIGN.md`

---

## M1.6: Complete Zustand Store Actions

**Title:** [M1] Complete Zustand store with all robot actions

**Labels:** feature, system: state, size: M, priority: high

### Feature Description
Implement all robot management actions in oceanStore with proper logic.

### Implementation Details
- Extend `src/stores/oceanStore.ts`
- Implement `addRobot()` with actual logic (add to array)
- Implement `removeRobot()` (filter out, cleanup timeline)
- Implement `updateRobot()` (immutable update pattern)
- Implement `getRobotById()` selector
- Add `settings` sub-store (bpm, maxRobots)

**Action signatures:**
```typescript
addRobot: (robot: Robot) => void
removeRobot: (id: string) => void
updateRobot: (id: string, updates: Partial<Robot>) => void
getRobotById: (id: string) => Robot | undefined
```

### Acceptance Criteria
- [ ] All actions implemented
- [ ] Immutable state updates
- [ ] Timeline cleanup on removeRobot
- [ ] Proper TypeScript types
- [ ] Store usable from components
- [ ] No side effects (pure actions)

### Reference
- Oceanic: `src/stores/oceanStore.ts`
- Zustand docs (immutable updates)
