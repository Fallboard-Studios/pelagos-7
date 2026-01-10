# Pelagos-7 Architecture

**Status:** 🚧 This document will be expanded in Phase 1 (AI Documentation)

---

## Three Pillars

Pelagos-7 follows a strict separation of concerns:

### 1. Audio (Tone.js)
- **Only** `AudioEngine` touches Tone.js
- All audio scheduling through `BeatClock`/`Transport`
- No synths instantiated outside `AudioEngine`
- No `setTimeout`/`setInterval` for audio timing

### 2. Animation (GSAP)
- **Only** GSAP timelines for movement
- Timelines stored in `timelineMap` (never in React/Zustand state)
- No `requestAnimationFrame` loops
- No animation state in components

### 3. State (Zustand)
- **Only** Zustand for application state
- Serializable data only
- No business logic in components
- State drives renders, not animations

---

## Forbidden Patterns

❌ `Tone.*` calls outside AudioEngine  
❌ GSAP timelines in React state or Zustand  
❌ `setTimeout`/`setInterval` for timing  
❌ `requestAnimationFrame` loops  
❌ Animation values in state  
❌ Audio scheduling in components  

---

## Key Systems

### AudioEngine (`src/engine/AudioEngine.ts`)
- Singleton managing all Tone.js interactions
- Synth pooling and voice management
- Note scheduling with lookahead
- Global effects (reverb, filters)

### BeatClock (`src/engine/beatClock.ts`)
- Musical timing system (beat-based, not seconds)
- Wraps `Tone.Transport`
- All timing expressed in beats/measures
- BPM-independent game logic

### Timeline Map (`src/animation/timelineMap.ts`)
- Central registry of GSAP timelines
- Functions: `setTimeline()`, `killTimeline()`, `getTimeline()`
- Timelines keyed by robot ID
- Automatic cleanup on robot removal

### OceanStore (`src/stores/oceanStore.ts`)
- Zustand store for all application state
- Robots, actors, settings, world state
- No timelines or non-serializable data

---

## Data Flow

```
User Interaction
  ↓
Component Event Handler
  ↓
Zustand Action (update state)
  ↓
[State Change]
  ↓
├─→ Component Re-renders (React)
├─→ Animation System (GSAP)
└─→ Audio System (AudioEngine)
```

---

## File Organization

```
src/
├── animation/      # GSAP timelines, no audio/state
├── engine/         # AudioEngine, BeatClock, harmony
├── components/     # React UI only, no logic
├── stores/         # Zustand stores
├── systems/        # Domain logic (collision, spawning)
├── hooks/          # React hooks (orchestration only)
├── types/          # TypeScript definitions
└── utils/          # Pure functions
```

---

**Detailed architecture documentation will be added in Phase 1.**

See phase documentation for implementation guidelines.