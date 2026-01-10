# Phase 1: AI Documentation - Detailed Steps

**Timeline:** Week 1, Days 2-3 (6-8 hours)  
**Goal:** Write comprehensive AI instruction documentation that will guide all future development and prevent architectural drift.

---

## Prerequisites

- [ ] Phase 0 complete (repository exists and is cloned locally)
- [ ] Oceanic codebase available for reference (current workspace)
- [ ] Understanding of the three pillars architecture (Audio/Animation/State)
- [ ] Decision on robot theme vs biological systems

---

## Why This Phase Matters

**AI-assisted development requires explicit rules.** Without clear documentation:
- AI will make inconsistent architectural choices
- You'll repeat the same corrections constantly
- Code quality will drift over time
- Portfolio reviewers won't understand your thinking

**Write these docs ONCE at the start**, not mid-development. They become portfolio artifacts showing architectural planning and serve as onboarding for future contributors.

---

## Step 1: Master AI Instructions (3 hours)

### 1.1 Create Copilot Instructions File

**File: `.github/copilot-instructions.md`**

This is the master document that GitHub Copilot reads automatically. It should contain:

**Structure:**
```markdown
# Pelagos-7 - GitHub Copilot Instructions

## TL;DR for Copilot
[5-line summary of critical rules]

## Absolutely Forbidden
[List of things AI must NEVER do]

## Project Overview
[Brief description, tech stack, purpose]

## Critical Architecture Rules
[The three pillars in detail]

## Tech Stack Details
[How each technology is used]

## Domain-Specific Concepts
[Robots, factories, interactions]

## Coding Conventions
[Naming, file organization, patterns]

## Common Tasks
[How to add features step-by-step]

## Anti-Patterns to Avoid
[Examples of bad code with corrections]

## Code Organization Standards
[File structure, import ordering]
```

**Content to adapt from Oceanic:**

**Section 1: TL;DR**
```markdown
## TL;DR for Copilot
- All audio = AudioEngine (singleton)
- All animation = GSAP (timelines in timelineMap, NOT state)
- All state = Zustand (serializable only)
- All timing = BeatClock/Transport (NO setTimeout/setInterval/rAF)
- NO synths in React components
- NO GSAP timelines in state
- NO main loop
```

**Section 2: Absolutely Forbidden**
Port from Oceanic, remove hunger/reproduction references:
```markdown
## Absolutely Forbidden (Copilot Read First)
- requestAnimationFrame loops (use GSAP ticker or BeatClock only)
- Local Tone.js synths (AudioEngine only)
- useEffect-triggered audio (BeatClock scheduling only)
- setTimeout/setInterval (use Transport.schedule)
- DOM manipulation without refs
- React-driven animations
- GSAP timelines stored in React/Zustand state
- JS classes (use functions unless absolutely necessary)
```

**Section 3: Project Overview**
```markdown
## Project Overview
Pelagos-7 is a browser-based ambient music generator where robot fish swim autonomously through a post-apocalyptic underwater environment. Robots interact with each other and factory actors, creating evolving musical compositions synchronized to musical beats.

## Tech Stack
- **React** with **TypeScript**
- **Zustand** for state management
- **Tone.js** for audio synthesis and scheduling
- **GSAP** for all animations and pathing
- **SVG** for all visual assets
- **Vite** as build tool
- Hosted on **GitHub Pages**
```

**Section 4: Critical Architecture Rules**

Port Audio/Animation/State separation sections from Oceanic's copilot-instructions.md, but update:
- Remove hunger system references
- Remove reproduction/courtship references
- Add factory actor spawning
- Simplify complexity notes

**Section 5: Robot-Specific Concepts**

```markdown
## Robot Design
- Robots composed of 5 swappable SVG parts: chassis, head, propeller, top antenna, bottom antenna
- SVGs grouped in `<g>` tags for CSS color class application
- Musical attributes determine visual appearance (synth shape → head shape, ADSR → colors)

## Factory Actors
- Factories spawn new robots periodically (measure-based timing)
- Factory production cooldown: configurable (default 120 measures)
- No proximity required - factory just produces on timer
- Factory type determines robot blueprint (visual + audio attributes)
```

**Section 6: Melody System Requirements**

Port the entire "Melody System Requirements" section from Oceanic copilot-instructions.md - this is critical and proven.

**Section 7: Beat-Based World Time**

Port the entire "Beat-Based World Time" section - the timing architecture is core to the project.

**Time estimate for this file:** 2-3 hours

---

### 1.2 Review and Adapt from Oceanic

**What to port directly:**
- Audio architecture patterns
- GSAP patterns
- Timeline management
- Melody generation rules
- Harmony system
- BeatClock architecture
- Code organization standards
- Import ordering rules

**What to remove:**
- Hunger/food system sections
- Reproduction/courtship sections
- Maturity points (unless you want simple version)
- Fullness/calorie mechanics

**What to adapt:**
- "Fish" → "Robot" terminology
- "Ocean" → "Environment" or "World"
- Interaction systems (keep collision, remove hunger checks)
- Actor types (add factories, keep environmental)

**Action items:**
- [ ] Copy `.github/copilot-instructions.md` from Oceanic
- [ ] Find/replace: "Fish" → "Robot", "fish" → "robot"
- [ ] Remove sections: Hunger System, Food System, Reproduction & Courtship
- [ ] Add section: Factory Actor Spawning
- [ ] Update examples to use robot terminology
- [ ] Verify all references to removed systems are gone
- [ ] Add Fallboard Studios branding in header

---

## Step 2: Architecture Documentation (1.5 hours)

### 2.1 Create Architecture Guide

**File: `docs/ARCHITECTURE.md`**

```markdown
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
- onComplete updates robot state (e.g., Idle → Swimming)
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
- [Forbidden Patterns](FORBIDDEN_PATTERNS.md)
```

**Time estimate:** 1 hour to write, 30 min to review

---

### 2.2 Create Robot Design Guide

**File: `docs/ROBOT_DESIGN.md`**

```markdown
# Robot Visual Design Guide

## Overview

Robots in Pelagos-7 are modular SVG constructs with swappable parts. Each robot's appearance is procedurally generated from its musical attributes.

## SVG Part System

### Robot Anatomy (5 Parts)

1. **Chassis** (body)
   - Main structural component
   - Contains attachment points for other parts
   - Size: ~40-60px base dimension
   - Variants: Sleek, Boxy, Organic, Industrial

2. **Head** (front module)
   - Sensor array or camera unit
   - Attached to front of chassis
   - Size: ~20-30px
   - Variants: Dome, Angular, Cylindrical, Flat

3. **Propeller** (rear propulsion)
   - Rotating element (animated)
   - Attached to rear of chassis
   - Size: ~15-25px
   - Variants: 2-blade, 3-blade, 4-blade, Turbine

4. **Top Antenna** (sensor)
   - Extends upward from chassis
   - Size: ~10-20px height
   - Variants: Rod, Dish, Array, Spiral

5. **Bottom Antenna** (stabilizer)
   - Extends downward from chassis
   - Size: ~10-20px height
   - Variants: Rod, Fin, Paddle, Wire

## SVG Structure

### File Organization
```
src/assets/robots/
├── chassis/
│   ├── ChassisSleek.tsx
│   ├── ChassisBoxey.tsx
│   └── ...
├── heads/
├── propellers/
└── antennae/
```

### Component Pattern
```typescript
interface RobotPartProps {
  color: string;
  scale?: number;
}

export function ChassisSleek({ color, scale = 1 }: RobotPartProps) {
  return (
    <g transform={`scale(${scale})`}>
      <path d="..." fill={color} />
      {/* Attachment point markers */}
      <circle cx="0" cy="0" r="2" fill="none" data-attach="center" />
      <circle cx="20" cy="0" r="2" fill="none" data-attach="head" />
      <circle cx="-20" cy="0" r="2" fill="none" data-attach="propeller" />
    </g>
  );
}
```

## Attribute Mapping

### Synth Type → Head Shape
- **AMSynth** → Dome head (smooth, rounded)
- **FMSynth** → Angular head (sharp edges)
- **PolySynth** → Cylindrical head (stacked layers)
- **MembraneSynth** → Flat head (wide, thin)

### ADSR → Color Palette
- **Fast Attack** → Bright colors (high saturation)
- **Slow Attack** → Muted colors (lower saturation)
- **Long Decay** → Cool hues (blue, cyan)
- **Short Decay** → Warm hues (red, orange)

### Pitch Range → Propeller Type
- **High Range** → Small, fast propeller (2-blade)
- **Mid Range** → Medium propeller (3-blade)
- **Low Range** → Large, slow propeller (4-blade)
- **Wide Range** → Turbine (omni-directional)

### Filter Frequency → Antenna Configuration
- **High Filter** → Long, thin antennae
- **Low Filter** → Short, thick antennae
- **No Filter** → Minimal antennae

## Color System

### Base Palette (Post-Apocalyptic Theme)
```typescript
const ROBOT_COLORS = {
  rusty: ['#8B4513', '#A0522D', '#CD853F'],
  corroded: ['#2F4F4F', '#556B2F', '#6B8E23'],
  neon: ['#00FF00', '#00FFFF', '#FF00FF'],
  industrial: ['#696969', '#808080', '#A9A9A9'],
};
```

### Color Application
- **Chassis:** Base color (from attribute)
- **Head:** Lighter shade (+20% lightness)
- **Propeller:** Darker shade (-20% lightness)
- **Antennae:** Accent color (complementary hue)

## Animation States

### Idle (Floating)
- Gentle vertical bob: ±3px, 2s cycle
- Slight rotation: ±2°, 3s cycle
- Propeller slow spin: 1 rotation/2s

### Swimming
- Propeller fast spin: 3 rotations/s
- Chassis tilt: 5-10° toward destination
- Antennae sway: ±5°, 0.5s cycle

### Interacting
- Scale pulse: 1.0 → 1.15 → 1.0, 0.4s
- Rotation burst: ±15°
- Propeller rapid spin: 5 rotations/s

### Selected
- Outline glow: 2px stroke, pulsing opacity
- Elevated z-index
- Propeller stopped (frozen)

## Procedural Generation

### Generation Algorithm
```typescript
function generateRobotParts(audioAttributes: AudioAttributes): RobotParts {
  const { synthType, adsr, pitchRange, filterFreq } = audioAttributes;
  
  return {
    chassis: selectChassis(synthType),
    head: selectHead(synthType),
    propeller: selectPropeller(pitchRange),
    topAntenna: selectAntenna(filterFreq, 'top'),
    bottomAntenna: selectAntenna(filterFreq, 'bottom'),
    colors: generateColorPalette(adsr),
  };
}
```

### Variant Weighting
```typescript
const CHASSIS_WEIGHTS = {
  sleek: 0.35,
  boxy: 0.30,
  organic: 0.20,
  industrial: 0.15,
};
```

## Size Variations

### Base Size Classes
- **Small:** 0.7x scale (high-pitched robots)
- **Medium:** 1.0x scale (default)
- **Large:** 1.3x scale (low-pitched robots)

### Size Mapping
- Pitch range < 200Hz → Large
- Pitch range 200-600Hz → Medium
- Pitch range > 600Hz → Small

## Accessibility

### Color Contrast
- Minimum contrast ratio: 3:1 (against background)
- Use luminance calculations for automatic adjustment

### Hover States
- Show subtle outline

### Selection Indicators
- Clear visual distinction from unselected state
- Non-color-dependent (use a glow effect, not just color change)

## Performance Considerations

### SVG Optimization
- Use `<use>` for repeated elements
- Minimize path complexity (< 20 points per path)
- Avoid filters on many elements (slow)

### Rendering
- Pool and reuse SVG elements when possible
- Use CSS transforms (GPU-accelerated) for motion
- Limit simultaneous propeller animations (max 12)

## Future Enhancements

- [ ] Procedural texture generation (rust, scratches)
- [ ] Dynamic part swapping (upgrade animation)
- [ ] Battle damage (visual degradation over time)
- [ ] Bioluminescent glow effects
- [ ] Particle trails (exhaust from propellers)

## Examples

### Example 1: High-Pitched Scout
```typescript
{
  chassis: 'sleek',
  head: 'dome',
  propeller: '2-blade',
  topAntenna: 'rod-long',
  bottomAntenna: 'fin-small',
  colors: {
    base: '#00FFFF',
    accent: '#FF00FF',
  },
  size: 'small',
}
```

### Example 2: Low-Frequency Hauler
```typescript
{
  chassis: 'industrial',
  head: 'flat',
  propeller: '4-blade',
  topAntenna: 'dish',
  bottomAntenna: 'paddle',
  colors: {
    base: '#8B4513',
    accent: '#CD853F',
  },
  size: 'large',
}
```

## Reference Images

[To be added: Sketch wireframes of each part type]

## SVG Template

```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g id="robot" transform="translate(50, 50)">
    <!-- Chassis -->
    <g id="chassis">
      <path d="M -20,-10 L 20,-10 L 20,10 L -20,10 Z" fill="currentColor" />
    </g>
    
    <!-- Head -->
    <g id="head" transform="translate(20, 0)">
      <circle r="8" fill="currentColor" opacity="0.9" />
    </g>
    
    <!-- Propeller (animated) -->
    <g id="propeller" transform="translate(-20, 0)">
      <line x1="-10" y1="0" x2="10" y2="0" stroke="currentColor" stroke-width="2" />
      <line x1="0" y1="-10" x2="0" y2="10" stroke="currentColor" stroke-width="2" />
    </g>
    
    <!-- Top Antenna -->
    <g id="top-antenna" transform="translate(0, -10)">
      <line x1="0" y1="0" x2="0" y2="-15" stroke="currentColor" stroke-width="1" />
      <circle cx="0" cy="-15" r="2" fill="currentColor" />
    </g>
    
    <!-- Bottom Antenna -->
    <g id="bottom-antenna" transform="translate(0, 10)">
      <path d="M 0,0 L -5,10 L 5,10 Z" fill="currentColor" opacity="0.7" />
    </g>
  </g>
</svg>
```
```

**Time estimate:** 1 hour

---

## Step 3: System-Specific Guides (2 hours)

### 3.1 Audio System Guide

**File: `docs/AUDIO_SYSTEM.md`**

Port the Tone.js best practices and melody system sections from Oceanic's copilot-instructions.md. Add:

```markdown
# Audio System Guide

## Overview
[Tone.js architecture, AudioEngine singleton pattern]

## BeatClock
[Authoritative timing, Transport integration]

## Harmony System
[8-note palettes, 4-measure cycles, TIME_PITCHES]

## Melody Generation
[16-step loops, note indices, procedural generation]

## Polyphony Management
[Voice limiting, synth pooling]

## Scheduling Patterns
[Transport.schedule, MIN_LEAD, lookahead]

## Common Patterns
[Code examples for scheduling, note playback]

## Forbidden Patterns
[What NOT to do with Tone.js]

## Troubleshooting
[Common audio issues and fixes]
```

**Time estimate:** 45 minutes (mostly porting)

---

### 3.2 Animation System Guide

**File: `docs/ANIMATION_SYSTEM.md`**

```markdown
# Animation System Guide

## Overview
All animation in Pelagos-7 uses GSAP. This document covers patterns, timeline management, and best practices.

## Timeline Management

### Timeline Map Pattern
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

### React Integration
```typescript
import { useGSAP } from '@gsap/react';

function Robot({ robot }: { robot: Robot }) {
  const ref = useRef<SVGGElement>(null);
  
  useGSAP(() => {
    if (!ref.current || !robot.destination) return;
    
    const tl = gsap.timeline({
      onComplete: () => handleArrival(robot.id)
    });
    
    tl.to(ref.current, {
      x: robot.destination.x,
      y: robot.destination.y,
      duration: 5,
      ease: 'none'
    });
    
    setTimeline(robot.id, tl);
    
    return () => killTimeline(robot.id);
  }, { dependencies: [robot.destination], scope: ref });
  
  return <g ref={ref}>{/* robot parts */}</g>;
}
```

## Common Animation Types

### Swim Animation
[Pattern for point-to-point movement]

### Idle Animation
[Looping bob/sway patterns]

### Interaction Burst
[Scale pulses, rotation bursts]

### Propeller Spin
[Continuous rotation with speed variations]

## Performance

### Best Practices
- Use CSS transforms (GPU-accelerated)
- Avoid animating many properties simultaneously
- Pool and reuse timelines where possible
- Kill timelines on cleanup

### Avoid
- Per-frame path updates (`d` attribute)
- Layout-triggering properties (width, height)
- Nested timeline complexity (>3 levels deep)

## Forbidden Patterns
[List of GSAP anti-patterns]
```

**Time estimate:** 45 minutes

---

### 3.3 Forbidden Patterns Document

**File: `docs/FORBIDDEN_PATTERNS.md`**

```markdown
# Forbidden Patterns

This document lists code patterns that MUST NOT appear in Pelagos-7. These violate the architecture and will cause issues.

## Audio Violations

### ❌ Synth in Component
```typescript
// FORBIDDEN
function Robot() {
  const synth = new Tone.Synth().toDestination();
  return <g onClick={() => synth.triggerAttackRelease('C4', '8n')} />;
}
```
**Why:** Breaks audio isolation, creates synth leak, not centralized

**Fix:** Use AudioEngine
```typescript
// CORRECT
function Robot({ id }: { id: string }) {
  return <g onClick={() => AudioEngine.scheduleNote({ robotId: id, note: 'C4' })} />;
}
```

### ❌ Direct Tone Import
```typescript
// FORBIDDEN (outside engine/)
import * as Tone from 'tone';
```
**Why:** Audio should only exist in AudioEngine

**Fix:** Only import Tone in `src/engine/`

## Animation Violations

### ❌ Timeline in State
```typescript
// FORBIDDEN
const [timeline, setTimeline] = useState<gsap.core.Timeline>();
```
**Why:** Timelines are not serializable, cause memory leaks

**Fix:** Use timeline map

### ❌ Animation with setTimeout
```typescript
// FORBIDDEN
const animate = () => {
  setPosition(pos => ({ x: pos.x + 1, y: pos.y }));
  setTimeout(animate, 16);
};
```
**Why:** Not synchronized, causes drift, performance issues

**Fix:** Use GSAP timeline

## Timing Violations

### ❌ setTimeout/setInterval for Timing
```typescript
// FORBIDDEN
setInterval(() => {
  spawnRobot();
}, 5000);
```
**Why:** Not beat-aligned, drifts from musical time

**Fix:** Use BeatClock
```typescript
// CORRECT
BeatClock.scheduleRepeat('4m', () => spawnRobot());
```

## State Violations

### ❌ Complex Objects in State
```typescript
// FORBIDDEN
interface Robot {
  synth: Tone.Synth;
  timeline: gsap.core.Timeline;
  domRef: RefObject<HTMLElement>;
}
```
**Why:** Not serializable, can't save/load, memory leaks

**Fix:** Only store serializable data

## Import Violations

### ❌ Unordered Imports
```typescript
// FORBIDDEN
import { Robot } from './types';
import React from 'react';
import type { Vec2 } from './Vec2';
```
**Why:** Hard to read, inconsistent, violates standards

**Fix:** Order imports (React → types → components → hooks → constants)

## More Examples
[Additional anti-patterns from real development]
```

**Time estimate:** 30 minutes

---

## Step 4: Contribution Guide (1 hour)

### 4.1 Create Contribution Guide

**File: `docs/CONTRIBUTION_GUIDE.md`**

Port the code standards sections from Oceanic, include:
- File structure pattern
- Import ordering rules
- Type declaration guidelines
- Commit message conventions
- PR workflow
- Branch naming

**Time estimate:** 45 minutes (mostly porting from CODE_STANDARDS_IMPLEMENTATION.md)

---

## Step 5: Create Quick Reference (30 minutes)

### 5.1 Create Cheat Sheet

**File: `docs/QUICK_REFERENCE.md`**

```markdown
# Quick Reference

## Audio
```typescript
// Schedule note
AudioEngine.scheduleNote({ robotId, note: 'C4', duration: '8n' });

// Get current harmony
const notes = getAvailableNotes();
```

## Animation
```typescript
// Create swim timeline
const tl = gsap.timeline({ onComplete: () => handleArrival(id) });
tl.to(ref.current, { x: 100, y: 200, duration: 3 });
setTimeline(id, tl);

// Kill timeline
killTimeline(id);
```

## State
```typescript
// Add robot
oceanStore.getState().addRobot(robot);

// Update robot
oceanStore.getState().updateRobot(id, { state: 'swimming' });
```

## Timing
```typescript
// Schedule on beat
BeatClock.scheduleAtBeat(beatNumber, callback);

// Schedule repeating
BeatClock.scheduleRepeat('4m', callback);
```

## Common Tasks
- [Add new robot variant](ROBOT_DESIGN.md#adding-variants)
- [Add factory actor](ARCHITECTURE.md#factory-actors)
- [Debug audio issues](AUDIO_SYSTEM.md#troubleshooting)
```

---

## Step 6: Review and Commit (30 minutes)

### 6.1 Review All Docs

Checklist:
- [ ] All terminology updated (robot not fish)
- [ ] Hunger/reproduction removed
- [ ] Factory actors mentioned
- [ ] Examples use correct imports
- [ ] Links between docs work
- [ ] Code examples compile

### 6.2 Commit Documentation

```bash
git checkout -b docs/ai-documentation

# Commit each doc separately
git add .github/copilot-instructions.md
git commit -m "docs: add comprehensive AI instructions"

git add docs/ARCHITECTURE.md
git commit -m "docs: add architecture guide (three pillars)"

git add docs/ROBOT_DESIGN.md
git commit -m "docs: add robot visual design guide"

git add docs/AUDIO_SYSTEM.md
git commit -m "docs: add audio system guide"

git add docs/ANIMATION_SYSTEM.md
git commit -m "docs: add animation system guide"

git add docs/FORBIDDEN_PATTERNS.md
git commit -m "docs: add forbidden patterns reference"

git add docs/CONTRIBUTION_GUIDE.md
git commit -m "docs: add contribution guide"

git add docs/QUICK_REFERENCE.md
git commit -m "docs: add quick reference cheat sheet"

git push origin docs/ai-documentation
```

### 6.3 Create PR

Create PR with description:
```markdown
## AI Documentation Complete

Adds comprehensive documentation for AI-assisted development:

- Master Copilot instructions (architecture rules)
- Three pillars architecture guide
- Robot visual design system
- Audio system patterns (Tone.js)
- Animation system patterns (GSAP)
- Forbidden patterns reference
- Contribution guidelines
- Quick reference cheat sheet

This documentation will guide all future development and prevent architectural drift.

**Adapted from:** Oceanic POC codebase
**Changes:** Robot terminology, removed biological systems, added factory actors

Closes #[issue number]
```

---

## Phase 1 Complete! ✅

**What You've Accomplished:**
- ✅ Comprehensive AI instruction docs
- ✅ Architecture guide with three pillars explained
- ✅ Robot design system documented
- ✅ Audio/animation system guides
- ✅ Forbidden patterns catalog
- ✅ Contribution guidelines
- ✅ Quick reference cheat sheet
- ✅ All docs committed with clean history

**What You Can Show:**
- Professional documentation structure
- Clear architectural thinking
- Thorough planning before coding
- AI-friendly development setup

**Portfolio Value:**
- Demonstrates architectural planning skills
- Shows documentation ability
- Proves systematic approach
- Ready for team collaboration

**Next Phase:** [Phase 2: GitHub Project Setup](phase-2-github-project-setup.md)

Create project board, milestones, and 30-40 tickets for all planned work.

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Copilot instructions | 3 hours | |
| Architecture guide | 1 hour | |
| Robot design guide | 1 hour | |
| Audio/animation guides | 1.5 hours | |
| Forbidden patterns | 30 min | |
| Contribution guide | 45 min | |
| Quick reference | 30 min | |
| Review & commit | 30 min | |
| **Total** | **~8 hours** | |

---

## Tips for AI Collaboration

When working with AI assistants during this phase:

**Good prompts:**
- "Port the melody system section from Oceanic copilot-instructions.md, update terminology to robots"
- "Write the Audio System Guide following the structure in the outline, include code examples"
- "Review ARCHITECTURE.md for any remaining 'fish' references and replace with 'robot'"

**Bad prompts:**
- "Write all the docs" (too vague)
- "Make it good" (no specifics)
- "Copy everything from Oceanic" (loses robot theme)

**Verification:**
After AI generates docs, manually check:
- Terminology consistency
- Code examples compile
- Links work
- No biological system references remain
