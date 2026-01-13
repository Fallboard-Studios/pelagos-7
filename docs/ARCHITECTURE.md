# Pelagos-7 Architecture Guide

## Overview

Pelagos-7 uses a strict separation-of-concerns architecture to maintain code quality and enable AI-assisted development.

## The Three Pillars

### 1. Audio (Tone.js)
**Responsibility:** All sound generation, scheduling, and synthesis  
**Location:** `src/engine/AudioEngine.ts`, `src/engine/harmonySystem.ts`, `src/engine/melodyGenerator.ts`

**Rules:**
- Only AudioEngine touches Tone.js
- All scheduling uses `Tone.Transport` or `BeatClock`
- Components request audio via AudioEngine methods
- No synths created outside AudioEngine

**Forbidden:**
- ❌ `new Tone.Synth()` in components
- ❌ `synth.triggerAttackRelease()` anywhere but AudioEngine
- ❌ Importing Tone.js outside engine/

**Example:**
```typescript
// ✅ Correct
AudioEngine.scheduleNote({ robotId, note: 'C4', duration: '8n' });

// ❌ Wrong
const synth = new Tone.Synth().toDestination();
synth.triggerAttackRelease('C4', '8n');
```

### 2. Animation (GSAP)
**Responsibility:** All visual movement, transforms, and motion  
**Location:** `src/animation/`, hooks using `useGSAP`

**Rules:**
- All animation via GSAP timelines
- Timelines stored in `timelineMap` (Map), never in state
- Components only hold refs to DOM elements
- Timeline cleanup required on unmount

**Forbidden:**
- ❌ Timelines in React state or Zustand
- ❌ Animation values in state
- ❌ `requestAnimationFrame` loops
- ❌ Direct DOM manipulation without refs

**Example:**
```typescript
// ✅ Correct
const tl = gsap.timeline({ onComplete: () => handleArrival(robot.id) });
tl.to(ref.current, { x: 100, y: 200, duration: 3 });
setTimeline(robot.id, tl);

// ❌ Wrong
const [position, setPosition] = useState({ x: 0, y: 0 });
useEffect(() => {
  const animate = () => {
    setPosition({ x: position.x + 1, y: position.y });
    requestAnimationFrame(animate);
  };
  animate();
}, []);
```

**Timeline Management Implementation:**

```typescript
// src/animation/timelineMap.ts
const timelineMap = new Map<string, gsap.core.Timeline>();

export function setTimeline(id: string, timeline: gsap.core.Timeline): void {
  killTimeline(id); // Clean up old timeline
  timelineMap.set(id, timeline);
}

export function getTimeline(id: string): gsap.core.Timeline | undefined {
  return timelineMap.get(id);
}

export function killTimeline(id: string): void {
  const tl = timelineMap.get(id);
  if (tl) {
    tl.kill();
    timelineMap.delete(id);
  }
}
```

### 3. State (Zustand)
**Responsibility:** All serializable data and business logic  
**Location:** `src/stores/`

**Rules:**
- Only serializable data (JSON-compatible)
- No functions, timelines, or DOM refs
- No complex objects (Tone.Synth, gsap.core.Timeline)
- Actions for all state mutations

**Forbidden:**
- ❌ Storing GSAP timelines
- ❌ Storing Tone.js instances
- ❌ Storing React refs
- ❌ Animation state (position updates)

**Example:**
```typescript
// ✅ Correct
interface Robot {
  id: string;
  position: Vec2;  // current logical position
  destination: Vec2 | null;
  state: RobotState;
  melody: MelodyEvent[];
}

// ❌ Wrong
interface Robot {
  id: string;
  timeline: gsap.core.Timeline;  // not serializable!
  synth: Tone.PolySynth;         // not serializable!
  animate: () => void;            // not serializable!
}
```

## Communication Between Pillars

**State → Animation:**
- State change triggers GSAP timeline creation
- Timeline reads initial values from state
- Timeline does NOT write back to state during animation
- Timeline completion triggers state update

**State → Audio:**
- State change triggers AudioEngine scheduling
- AudioEngine reads robot attributes from state
- AudioEngine schedules notes via Transport
- No direct coupling between animation and audio

**Animation → State:**
- Timeline completion callbacks trigger state actions
- onComplete updates robot state (e.g., Idle → Moving)
- NO state updates during animation

## Timing Architecture

**Single Source of Truth:** `BeatClock` wrapping `Tone.Transport`

**All timing uses beats/measures:**
- 1 beat = quarter note at current BPM
- 1 measure = 4 beats (4/4 time)
- 96 measures = 1 full day/night cycle
- 4 measures = 1 "hour equivalent"

**Scheduling:**
- Use `BeatClock.scheduleAtBeat()` or `Transport.schedule()`
- NO `setTimeout` or `setInterval`
- NO `requestAnimationFrame` for timing

## Data Flow

```
User Interaction
    ↓
State Update (Zustand action)
    ↓
    ├→ Animation System (GSAP timeline created)
    └→ Audio System (note scheduled via Transport)
    ↓
Timeline completes → State update → New cycle
```

## File Organization

```
src/
├── engine/          # Audio (Tone.js only)
│   ├── AudioEngine.ts
│   ├── beatClock.ts
│   ├── harmonySystem.ts
│   └── melodyGenerator.ts
├── animation/       # Animation (GSAP only)
│   ├── robotAnimation.ts
│   ├── timelineMap.ts
│   └── interactionBursts.ts
├── stores/          # State (Zustand only)
│   └── oceanStore.ts
├── components/      # React (UI only, no logic)
│   └── Robot.tsx
├── hooks/           # React hooks (orchestration)
│   └── useRobotAnimation.ts
└── systems/         # Domain logic
    └── collisionSystem.ts
```

## Testing the Architecture

**Audit checks:**
```bash
npm run audit:patterns
```

**Manual verification:**
- [ ] No Tone.js imports outside `src/engine/`
- [ ] No `timeline` fields in Zustand state
- [ ] No `setTimeout`/`setInterval` in src/ (except beatClock)
- [ ] No `requestAnimationFrame` loops (except GSAP ticker)
- [ ] All timing uses BeatClock/Transport

## Common Violations & Fixes

**Violation:** Component creates synth
```typescript
// ❌ Wrong
const synth = new Tone.Synth();
synth.triggerAttackRelease('C4', '8n');
```
**Fix:** Use AudioEngine
```typescript
// ✅ Correct
AudioEngine.scheduleNote({ robotId, note: 'C4', duration: '8n' });
```

**Violation:** Timeline stored in state
```typescript
// ❌ Wrong
const [timeline, setTimeline] = useState<gsap.core.Timeline | null>(null);
```
**Fix:** Use timeline map
```typescript
// ✅ Correct
const tl = gsap.timeline();
setTimeline(robot.id, tl);
```

**Violation:** Animation loop with setTimeout
```typescript
// ❌ Wrong
const swim = () => {
  updatePosition();
  setTimeout(swim, 16);
};
```
**Fix:** Use GSAP timeline
```typescript
// ✅ Correct
gsap.to(ref.current, { x: target.x, duration: 3 });
```

## Further Reading

- [Audio System Guide](AUDIO_SYSTEM.md)
- [Animation System Guide](ANIMATION_SYSTEM.md)