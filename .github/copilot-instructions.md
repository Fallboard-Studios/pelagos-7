# Pelagos-7 - GitHub Copilot Instructions

## TL;DR for Copilot
- All audio = AudioEngine (singleton)
- All animation = GSAP (timelines in timelineMap, NOT state)
- All state = Zustand (serializable only)
- All timing = BeatClock/Transport (NO setTimeout/setInterval/rAF)
- NO synths in React components
- NO GSAP timelines in state
- NO main loop

## Absolutely Forbidden
- requestAnimationFrame loops (use GSAP ticker or BeatClock only)
- Local Tone.js synths (AudioEngine only)
- useEffect-triggered audio (BeatClock scheduling only)
- setTimeout/setInterval (use Transport.schedule)
- DOM manipulation without refs
- React-driven animations
- GSAP timelines stored in React/Zustand state
- JS classes (use functions unless absolutely necessary)

## Project Overview
Pelagos-7 is a browser-based ambient music generator where robots swim autonomously through a post-apocalyptic underwater environment. Robots interact with each other and factory actors, creating evolving musical compositions synchronized to musical beats.

## Critical Architecture Rules
### Audio Architecture
- **Single Global AudioEngine**: All synth instantiation and note scheduling happens in one global AudioEngine module
- **No Local Synths**: Robots and actors NEVER create their own synths - they reference a shared pool or request instances from the engine
- **GSAP Controls Animation**: GSAP controls ALL pathing and animation states
- **Tone.js for Audio Only**: Tone.js must NEVER drive animation loops directly
- **GSAP** must not trigger Tone events and timelines must not directly call audio events
- **Maximum Polyphony**: Limit concurrent tones to ~8 at once

### Animation Architecture
- **GSAP for All Motion**: All visual movement, pathing, and transforms use GSAP timelines
- **Timeline Storage**: Timelines stored in separate `timelineMap` (Map<string, gsap.core.Timeline>), NEVER in React state or Zustand
- **useGSAP Hook**: Always use the `useGSAP` hook for React component animations
- **No Animation Loops**: No `requestAnimationFrame`, `setInterval`, or `setTimeout` for animation
- **Timeline Cleanup**: Always kill timelines on component unmount or state change
- **Semantic Callbacks**: Timeline callbacks must be semantic events only (e.g., `onComplete: () => handleArrival(robotId)`), never trigger audio directly

#### Robot Pathing Pipeline
1. Robot enters Idle state
2. Robot chooses a target point
3. GSAP timeline created and stored in timeline map:
   - Movement tween to destination
   - Looping propeller animations
   - Slight rotation/tilt for natural movement
4. On arrival: timeline killed and removed from map, robot enters new Idle state
5. On interaction or selection: kill current timeline, execute handlers, pick new destination

**Important**: Timelines are imperative references only, used to drive animation. Do NOT store in React state or Zustand state.

### State Management
- **Zustand for All State**: Use Zustand as the single source of truth for all application state
- **Serializable Data Only**: Store only JSON-compatible data (strings, numbers, arrays, plain objects)
- **No Complex Objects**: Never store GSAP timelines, Tone.js synths, React refs, or DOM elements
- **Track Robots Individually**: Each robot is a separate object in the state array
- **Track Actors by Type**: Group factory actors and environmental actors appropriately
- **Version Field Required**: Include version field in all exports for forward compatibility
- **Save/Load Ready**: State designed for serialization (save/load feature planned for v1.1)

#### What Goes in State
- Robot positions, destinations, states, melodies, audio attributes
- Actor positions, types, cooldown timers
- World settings (BPM, camera viewport, world size)
- UI state (selected robot, panel visibility)

#### What Does NOT Go in State
- GSAP timelines (use timelineMap)
- Tone.js synth instances (managed by AudioEngine)
- React refs (component-local only)
- Derived/computed values (calculate on read)
- Animation frame data (GSAP handles this)

#### Example Store Structure
```typescript
interface OceanStore {
  robots: Robot[];
  actors: Actor[];
  lastSpawnTime: number;
  settings: WorldSettings;
  selectedRobotId: string | null;
}
```

## Tech Stack Details
- **React** with **TypeScript**
- **Zustand** for state management
- **Tone.js** for audio synthesis and scheduling
- **GSAP** for all animations and pathing
- **SVG** for all visual assets
- **Vite** as build tool
- Hosted on **GitHub Pages**

## Domain-Specific Concepts

### Robot Design
- Robots composed of 5 swappable SVG parts: chassis, head, propeller, top antenna, bottom antenna
- SVGs grouped in `<g>` tags for CSS color class application
- Musical attributes determine visual appearance (synth shape → head shape, ADSR → colors)

### Factory Actors
- Factories spawn new robots periodically (measure-based timing)
- Factory production cooldown: configurable (recommended 60-120 measures)
- No proximity required - factory just produces on timer
- Factory type determines robot blueprint (visual + audio attributes)

### Melody System Requirements

**Key Principles:**
- Melodies are 16-slot, 2-measure loops (8th-note grid)
- Robots store note **indices (0..7)**, NOT pitch strings
- Melody playback automatically adapts when 8-note harmony palette changes every 4 measures
- All scheduling via `AudioEngine` and `Tone.Transport` only

**Critical Rules:**
- Melody generation happens ONCE at spawn time (immutable after)
- Use step-indexed registry: `Map<stepNumber, Array<{robotId,event}>>` for O(1) lookups
- Enforce global polyphony limit (8-12 voices)
- Never use literal pitch strings in melodies
- Never regenerate melodies when harmony changes

**Data Structure:**
```typescript
interface RobotMelodyEvent {
  id: string;               // crypto.randomUUID()
  startStep: number;        // 1..16 (8th-note grid)
  length: '8n' | '4n' | '2n';
  noteIndex: number;        // 0..7 -> index into availableNotes[]
}
```

**For complete implementation details, see:**
- [AUDIO_SYSTEM.md](../docs/AUDIO_SYSTEM.md) - Overview & Tone.js best practices
- [BEAT_CLOCK.md](../docs/BEAT_CLOCK.md) - Musical timing and scheduling
- [HARMONY_SYSTEM.md](../docs/HARMONY_SYSTEM.md) - Dynamic note palettes  
- [MELODY_SYSTEM.md](../docs/MELODY_SYSTEM.md) - Procedural melody generation
- [POLYPHONY_GUIDE.md](../docs/POLYPHONY_GUIDE.md) - Voice management and synth pooling

## Out of Scope (Not Included in v1.0)

The following systems from the Oceanic prototype are explicitly **excluded** from Pelagos-7:

- ❌ **Hunger/food system** - Adds biological complexity without portfolio value
- ❌ **Reproduction/courtship** - Replaced by factory actors (simpler, thematically appropriate)
- ❌ **Maturity points** - Unnecessary complexity
- ❌ **User-placed food** - Not thematic for post-apocalyptic robot setting
- ❌ **Biological life systems** - Wrong theme; robots are manufactured, not born

**Why these are excluded:** These systems added ~900 lines of state management in the prototype without improving the core technical demonstrations. Factory-based spawning is simpler and more aligned with the robot/industrial theme.

### Beat-Based World Time

**Core Principle:** Use measure-based timing (NOT hour/minute) for all game logic.

**Key Facts:**
- **96 measures = 1 full day/night cycle** (4 measures = 1 "hour equivalent")
- **All game logic uses measures** (spawning, cooldowns, interactions)
- **Hour is derived** when needed: `Math.floor((currentMeasure % 96) / 4)` → 0..23
- **BPM-independent** - changing tempo doesn't affect game timing

**Authoritative Clock:**
- Use `Tone.Transport` as single source of truth for timing
- Fallback: lightweight `BeatClock` built on `gsap.ticker` (NOT raw rAF)
- Express all durations in beats/measures, convert to seconds only for scheduling

**Critical Rules:**
- **NEVER** use `setTimeout`/`setInterval`/`requestAnimationFrame` for musical timing
- Use `Tone.Transport.scheduleRepeat()` for beat-aligned events
- Schedule with lookahead (MIN_LEAD ~40-60ms) for audio reliability
- For non-audio events: step registry pattern `Map<beatNumber, events[]>` for O(1) lookups

**GSAP Integration:**
- Trigger GSAP timelines ON beat events (discrete animations)
- OR drive timeline `timeScale` from BPM (continuous loops)
- Never call AudioEngine/Tone methods inside GSAP callbacks

**For complete implementation details, see:**
- [BEAT_CLOCK.md](../docs/BEAT_CLOCK.md) - BeatClock API & Architecture
- [AUDIO_SYSTEM.md](../docs/AUDIO_SYSTEM.md) - Scheduling & Reliability
- Animation Integration Patterns documented in BEAT_CLOCK.md

## Coding Conventions
### Naming
- Components: PascalCase (e.g., `OceanScene`, `RobotMenu`)
- Hooks: camelCase with `use` prefix (e.g., `useRobotSpawner`)
- Stores: camelCase with `Store` suffix (e.g., `oceanStore`, `audioStore`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_ROBOTS`, `INTERACTION_DISTANCE`)

### File Organization
```javascript
src/
  components/      # React components
  stores/          # Zustand stores
  engine/          # AudioEngine module
  utils/           # Helper functions
  types/           # TypeScript types/interfaces
  hooks/           # Custom React hooks
  constants/       # App-wide constants
  assets/          # SVG files
```

### TypeScript
- Strict mode enabled
- Define interfaces for all entities (Robot, Actor, Ocean)
- Type all function parameters and return values
- Use enums for robot states, actor types, time of day, etc.

### GSAP Patterns
- Always use the useGSAP hook for React components
- Use `gsap.to()`, `gsap.timeline()` for animations
- Store timeline references for pause/play/kill
- Use `onComplete` callbacks to transition states
- Timeline for movement animations (looping propeller waves, rotation)

### Tone.js Patterns
- Initialize AudioEngine on user interaction (play button)
- Use `Tone.Transport` for global tempo sync
- Pool synth instances (don't create/destroy frequently)
- Use `Tone.now()` for scheduling, NOT `setTimeout`
- Apply effects globally (reverb, filters, etc.)
- AudioEngine.start must call Tone.start() before Transport.start()
- All audio scheduling must be routed through AudioEngine only

## Testing Conventions

### Framework
- **Vitest** for all unit tests
- Tests added in M2 (Phase 5: Robot Basics)
- Test files live alongside source: `beatClock.ts` → `beatClock.test.ts`

### What to Test
**Test these:**
- Utility functions (math, helpers)
- Core engine logic (BeatClock, harmonySystem)
- State management (store actions)
- Algorithm logic (melody generation, collision detection)

**Skip these:**
- React components (visual testing sufficient)
- GSAP timeline integration (mocking too complex)
- Tone.js audio scheduling (manual testing better)
- Simple getters/setters

### Test File Location
```
src/
  engine/
    beatClock.ts
    beatClock.test.ts       ← Test file alongside source
```

### Running Tests
```bash
npm test              # Run all tests
npm run test:ui       # Interactive UI
npm run test:coverage # Coverage report
```

### Test Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from './module';

describe('ModuleName', () => {
  it('describes expected behavior', () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });
});
```

### Store Testing
```typescript
import { beforeEach } from 'vitest';
import { useOceanStore } from './oceanStore';

beforeEach(() => {
  useOceanStore.setState({ robots: [], actors: [] });
});

it('maintains serializable state', () => {
  const state = useOceanStore.getState();
  expect(() => JSON.stringify(state)).not.toThrow();
});
```

### Mocking Guidelines
- Avoid complex mocks (if hard to test, function is doing too much)
- Simple mocks okay: `vi.spyOn(Math, 'random').mockReturnValue(0.5)`
- Skip mocking Tone.js/GSAP (integration test manually)

### Coverage Goals
- Target: ~70-80% for utilities and stores
- Don't obsess over 100%
- Focus on critical business logic

**See CONTRIBUTION_GUIDE.md for detailed testing patterns and examples.**

## Common Tasks
### Adding a New Robot Attribute
1. Update Robot type/interface
2. Add UI control in robot menu component
3. Map attribute to visual appearance (SVG selection, CSS class)
4. Map attribute to audio parameter (send to AudioEngine)
5. Ensure attribute is serializable (JSON-compatible)

#### Robot Attribute Guidance
##### Attributes like speed, curve, ADSR, and filter must be mapped in one place:
- Speed / path curve → GSAP timeline parameters
- ADSR / synth type → AudioEngine scheduling

##### AI should not invent independent motion systems or separate synths per robot.

##### Any new attribute must clearly specify:
- Visual effect (SVG or CSS)
- Audio effect (AudioEngine)
- State storage (Zustand)

### Creating a New Interactive Actor
1. Define actor type in types
2. Add SVG asset
3. Create interaction handler (what happens when robot nearby)
4. Add to spawn logic with placement parameters
5. Register with AudioEngine if it makes sound

### Adding a New Factory Type
1. Define factory variant in Actor types
2. Create factory SVG asset
3. Add robot blueprint generation logic
4. Configure production cooldown and timing
5. Add factory to spawn weights configuration

### Implementing Day/Night Cycle
1. Track elapsed measures in global state
2. Calculate current phase (morning/day/evening/night) based on derived hour
3. Apply CSS classes to ocean/environment layers for lighting changes
4. Modify lighting, bubble density, and atmospheric effects

## Anti-Patterns to Avoid
### ❌ DON'T: Create Synth in Component
```typescript
// FORBIDDEN
function Robot() {
  const synth = new Tone.Synth().toDestination();
  return <g onClick={() => synth.triggerAttackRelease('C4', '8n')} />;
}
```
**Why:** Breaks audio isolation, creates synth leak, not centralized

### ✅ DO: Use AudioEngine
```typescript
// CORRECT
function Robot({ id }: { id: string }) {
  return <g onClick={() => AudioEngine.scheduleNote({ robotId: id, note: 'C4' })} />;
}
```

---

### ❌ DON'T: Store Timeline in State
```typescript
// FORBIDDEN
const [timeline, setTimeline] = useState<gsap.core.Timeline>();
```
**Why:** Timelines are not serializable, cause memory leaks

### ✅ DO: Use Timeline Map
```typescript
// CORRECT
const tl = gsap.timeline({ onComplete: () => handleArrival(id) });
setTimeline(robot.id, tl);
```

---

### ❌ DON'T: Animate with State Updates
```typescript
// FORBIDDEN
const [x, setX] = useState(0);
useEffect(() => {
  const animate = () => {
    setX(prev => prev + 1);
    setTimeout(animate, 16);
  };
  animate();
}, []);
```
**Why:** Not synchronized, causes drift, performance issues

### ✅ DO: Use GSAP Timeline
```typescript
// CORRECT
useGSAP(() => {
  gsap.to(ref.current, { x: 100, duration: 3 });
});
```

---

### ❌ DON'T: Use setTimeout for Game Timing
```typescript
// FORBIDDEN
setInterval(() => {
  spawnRobot();
}, 5000);
```
**Why:** Not beat-aligned, drifts from musical time

### ✅ DO: Use BeatClock
```typescript
// CORRECT
BeatClock.scheduleRepeat('4m', () => spawnRobot());
```

---

### ❌ DON'T: Store Complex Objects in State
```typescript
// FORBIDDEN
interface Robot {
  synth: Tone.Synth;
  timeline: gsap.core.Timeline;
  domRef: RefObject<HTMLElement>;
}
```
**Why:** Not serializable, can't save/load, memory leaks

### ✅ DO: Store Only Serializable Data
```typescript
// CORRECT
interface Robot {
  id: string;
  position: Vec2;
  destination: Vec2 | null;
  state: RobotState;
  melody: MelodyEvent[];
}
```

---

### ❌ DON'T: Call Tone.js from GSAP Timeline
```typescript
// FORBIDDEN
timeline.call(() => AudioEngine.scheduleNote(...));
timeline.call(() => synth.triggerAttackRelease('C4', '8n'));
```
**Why:** Violates separation of concerns, creates tight coupling

### ✅ DO: Use Semantic Callbacks
```typescript
// CORRECT
timeline.to(robotRef.current, {
  x: dest.x,
  y: dest.y,
  onComplete: () => onRobotArrived(robotId), // semantic event only
});
```

---

### ❌ DON'T: Import Tone.js Outside Engine
```typescript
// FORBIDDEN (outside src/engine/)
import * as Tone from 'tone';
```
**Why:** Audio should only exist in AudioEngine

### ✅ DO: Keep Tone.js in Engine Only
```typescript
// CORRECT (src/engine/AudioEngine.ts)
import * as Tone from 'tone';
```

## Code Organization Standards

**File Structure Pattern (strict order):**
1. Imports (grouped: React/external → types → components → hooks → utils → constants → stores)
2. Types/Interfaces (declared BEFORE implementation)
3. Constants (component-specific)
4. Component/Function exports
5. Internal helpers (after exports)

**Import Ordering:**
- React & external libraries (no `type` keyword)
- Type imports (always with `type` keyword)
- Components, Hooks, Utils, Constants
- Stores (last, minimize usage)

**Type Guidelines:**
- Use `import type { }` for type-only imports
- Props interface required for components >50 lines: `[ComponentName]Props`
- Explicit return types for exported functions >10 lines
- Extract magic numbers to named constants

**Constant Extraction:**

```typescript
// ❌ Bad: Magic numbers
function spawnRobot() {
  if (robots.length >= 12) return;
  setTimeout(() => checkStatus(), 5000);
  setPosition({ x: 100, y: 200, z: 2 });
}

// ✅ Good: Named constants
const MAX_ROBOTS = 12;
const STATUS_CHECK_DELAY = 5000;
const DEFAULT_SPAWN_POSITION = { x: 100, y: 200, z: 2 };

function spawnRobot() {
  if (robots.length >= MAX_ROBOTS) return;
  setTimeout(() => checkStatus(), STATUS_CHECK_DELAY);
  setPosition(DEFAULT_SPAWN_POSITION);
}
```

**For detailed examples and patterns, see [CONTRIBUTION_GUIDE.md](../docs/CONTRIBUTION_GUIDE.md) Code Organization section.**