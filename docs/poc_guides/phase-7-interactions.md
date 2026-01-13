# Phase 7: Interactions (M4) - Detailed Steps

**Timeline:** Week 3-4, Days 4-6 (2-3 days, ~12 hours)  
**Goal:** Implement robot-robot interactions with collision detection and note flurries, add factory actors for automated spawning with periodic robot generation.

---

## Prerequisites

- [ ] Phase 6 complete (M3 milestone done)
- [ ] Robots playing melodies
- [ ] Audio system fully functional
- [ ] Polyphony management working
- [ ] All M4 issues created in project backlog
- [ ] Understanding of collision detection and spatial systems

---

## Why This Phase Matters

**The ecosystem emerges!** This phase transforms individual robots into an interactive community. Collisions trigger musical and visual events. Factory actors automate population growth, eliminating the need for manual spawning.

**What makes this impressive:**
- Collision detection demonstrates spatial algorithms
- Interactions create emergent musical patterns
- Factory actors replace biological reproduction (much simpler)
- Cooldown system prevents interaction spam
- Musical coherence maintained through harmony palette

**After Phase 7:** You have an interactive music generator with autonomous behavior, interactions, and automated spawning. Phase 8 (M5) adds environmental depth, camera controls, and visual polish.

---

## Phase Overview

You'll implement 4 issues from Milestone M4:

1. **M4.1:** Collision Detection System
2. **M4.2:** Interaction Note Flurries and Visual Bursts
3. **M4.3:** Factory Actor Implementation
4. **M4.4:** Interaction Cooldown and State Management

**End state:** Robots interact when nearby producing note flurries and visual bursts, factories spawn new robots automatically every 16 measures, cooldown system prevents spam.

---

## Milestone M4: Interactions

---

## Issue M4.1: Collision Detection System (3-4 hours)

### 1.1 Create Collision System

**File: `src/systems/collisionSystem.ts`**

```typescript
import type { Robot, Vec2 } from '../types/Robot';

const INTERACTION_DISTANCE = 100;

/**
 * Calculate distance between two points
 */
function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

/**
 * Check if two robots are within interaction distance
 */
export function areRobotsNearby(robotA: Robot, robotB: Robot): boolean {
  return distance(robotA.position, robotB.position) < INTERACTION_DISTANCE;
}

/**
 * Find all robot pairs within interaction distance
 */
export function findNearbyPairs(robots: Robot[]): Array<[Robot, Robot]> {
  const pairs: Array<[Robot, Robot]> = [];

  for (let i = 0; i < robots.length; i++) {
    for (let j = i + 1; j < robots.length; j++) {
      if (areRobotsNearby(robots[i], robots[j])) {
        pairs.push([robots[i], robots[j]]);
      }
    }
  }

  return pairs;
}

/**
 * Check if robot can interact (cooldown check)
 */
export function canInteract(robot: Robot, now: number): boolean {
  if (!robot.lastInteractionTime) return true;
  
  const COOLDOWN_MS = 5000; // 5 seconds
  return now - robot.lastInteractionTime > COOLDOWN_MS;
}
```

### 1.2 Create Collision Hook

**File: `src/hooks/useCollisionSystem.ts`**

```typescript
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { useOceanStore } from '../stores/oceanStore';
import { findNearbyPairs, canInteract } from '../systems/collisionSystem';
import { RobotState } from '../types/Robot';

/**
 * Hook to manage collision detection and interaction triggering
 */
export function useCollisionSystem() {
  const robots = useOceanStore((state) => state.robots);
  const updateRobot = useOceanStore((state) => state.updateRobot);
  const triggerInteraction = useOceanStore((state) => state.triggerInteraction);

  useEffect(() => {
    const checkCollisions = () => {
      const now = Date.now();
      const pairs = findNearbyPairs(robots);

      pairs.forEach(([robotA, robotB]) => {
        // Skip if either is selected
        if (
          robotA.state === RobotState.Selected ||
          robotB.state === RobotState.Selected
        ) {
          return;
        }

        // Check cooldowns
        if (!canInteract(robotA, now) || !canInteract(robotB, now)) {
          return;
        }

        // Trigger interaction
        triggerInteraction(robotA.id, robotB.id);

        // Update cooldowns
        updateRobot(robotA.id, { lastInteractionTime: now });
        updateRobot(robotB.id, { lastInteractionTime: now });
      });
    };

    // Check every 500ms (don't need every frame)
    gsap.ticker.add(checkCollisions);

    return () => {
      gsap.ticker.remove(checkCollisions);
    };
  }, [robots, updateRobot, triggerInteraction]);
}
```

### 1.3 Add to Store

**File: `src/stores/oceanStore.ts`** (update)

```typescript
interface OceanStore {
  // ... existing
  triggerInteraction: (robotAId: string, robotBId: string) => void;
}

// In create() function:
triggerInteraction: (robotAId: string, robotBId: string) => {
  console.log('[Store] Interaction triggered:', robotAId, robotBId);
  
  // Will implement note flurry in M4.2
  // For now, just log
},
```

### 1.4 Add lastInteractionTime to Robot Type

**File: `src/types/Robot.ts`** (update)

```typescript
export interface Robot {
  // ... existing fields
  lastInteractionTime?: number;
}
```

### 1.5 Add to OceanScene

**File: `src/components/OceanScene.tsx`** (update)

```typescript
import { useCollisionSystem } from '../hooks/useCollisionSystem';

export function OceanScene() {
  useCollisionSystem();
  
  // ... rest of component
}
```

### 1.6 Test Collisions

1. Spawn 3-4 robots
2. Wait for robots to swim near each other (<100px)
3. Check console for "[Store] Interaction triggered" logs
4. Verify cooldown prevents spam (5 sec between same-pair interactions)
5. Select a robot → verify it stops interacting

### 1.7 Acceptance Criteria

- [ ] Collision detection finds nearby pairs (distance < 100px)
- [ ] Cooldown prevents repeat interactions (5 sec)
- [ ] Selected robots skip interactions
- [ ] gsap.ticker for periodic checks (not rAF)
- [ ] triggerInteraction action in store
- [ ] lastInteractionTime tracked per robot
- [ ] Console logs confirm interactions

### 1.8 Commit, Push, PR

```bash
git checkout -b feature/m4-1-collision-system
git add src/systems/collisionSystem.ts src/hooks/useCollisionSystem.ts src/stores/oceanStore.ts src/types/Robot.ts src/components/OceanScene.tsx
git commit -m "feat(systems): implement collision detection system

Implements M4.1: Collision detection

- collisionSystem with distance checking
- findNearbyPairs finds all nearby robot pairs
- Interaction cooldown (5 seconds)
- useCollisionSystem hook with gsap.ticker
- Selected robots skip interactions
- triggerInteraction store action
- lastInteractionTime tracking

Closes #25"
git push origin feature/m4-1-collision-system
```

---

## Issue M4.2: Interaction Note Flurries (2-3 hours)

### 2.1 Create Flurry System

**File: `src/animation/interactionBursts.ts`** (create or update)

```typescript
import { gsap } from 'gsap';
import { AudioEngine } from '../engine/AudioEngine';
import { getAvailableNotes } from '../engine/harmonySystem';

/**
 * Play interaction note flurry for two robots
 */
export function playInteractionFlurry(robotAId: string, robotBId: string): void {
  const notes = getAvailableNotes();
  
  // Play 3-5 notes per robot with timing offset
  const noteCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < noteCount; i++) {
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const timeOffset = i * 0.08; // 80ms between notes
    
    // Schedule notes for both robots
    setTimeout(() => {
      AudioEngine.scheduleNote({
        robotId: robotAId,
        note: randomNote,
        duration: '16n',
        velocity: 0.7 + Math.random() * 0.3,
      });
      
      AudioEngine.scheduleNote({
        robotId: robotBId,
        note: randomNote,
        duration: '16n',
        velocity: 0.7 + Math.random() * 0.3,
      });
    }, timeOffset * 1000);
  }
  
  console.log('[InteractionBurst] Flurry played for', robotAId, robotBId);
}

/**
 * Visual burst animation at interaction point
 */
export function createVisualBurst(x: number, y: number): void {
  const svg = document.querySelector('.ocean-scene') as SVGSVGElement;
  if (!svg) {
    console.warn('[InteractionBurst] Ocean scene SVG not found');
    return;
  }
  
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'interaction-burst');
  svg.appendChild(g);
  
  // Create 8 radiating lines
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x.toString());
    line.setAttribute('y1', y.toString());
    line.setAttribute('x2', x.toString());
    line.setAttribute('y2', y.toString());
    line.setAttribute('stroke', '#ffeb3b');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('opacity', '0.8');
    g.appendChild(line);
    
    // Animate line outward
    gsap.to(line, {
      attr: {
        x2: x + Math.cos(angle) * 50,
        y2: y + Math.sin(angle) * 50,
      },
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        if (i === 7) {
          // Remove group after last line completes
          g.remove();
        }
      },
    });
  }
}
```

### 2.2 Update triggerInteraction

**File: `src/stores/oceanStore.ts`** (update)

```typescript
import { playInteractionFlurry, createVisualBurst } from '../animation/interactionBursts';

// Update triggerInteraction action
triggerInteraction: (robotAId: string, robotBId: string) => {
  const state = get();
  const robotA = state.getRobotById(robotAId);
  const robotB = state.getRobotById(robotBId);
  
  if (!robotA || !robotB) {
    console.warn('[Store] Robot not found for interaction:', robotAId, robotBId);
    return;
  }
  
  // Calculate midpoint for visual burst
  const midX = (robotA.position.x + robotB.position.x) / 2;
  const midY = (robotA.position.y + robotB.position.y) / 2;
  
  // Play audio flurry
  playInteractionFlurry(robotAId, robotBId);
  
  // Visual burst
  createVisualBurst(midX, midY);
  
  console.log('[Store] Interaction complete:', robotAId, robotBId);
},
```

### 2.3 Test Interactions

1. Spawn 4-5 robots
2. Wait for collision (watch console for triggers)
3. Verify:
   - Burst of 3-5 notes plays rapidly
   - Visual radiating yellow lines appear at midpoint
   - Both robots' notes audible
   - Lines fade outward and disappear
   - 5 second cooldown works
   - Multiple interactions can happen simultaneously

### 2.4 Acceptance Criteria

- [ ] playInteractionFlurry schedules 3-5 notes per robot
- [ ] Notes use current harmony palette
- [ ] 80ms spacing between notes
- [ ] createVisualBurst creates 8 radiating lines
- [ ] Lines animate outward (50px radius)
- [ ] Lines fade to opacity 0
- [ ] Midpoint calculation correct
- [ ] Audio and visual synchronized
- [ ] Cleanup removes burst elements
- [ ] Multiple bursts can coexist

### 2.5 Commit, Push, PR

```bash
git checkout -b feature/m4-2-interaction-flurries
git add src/animation/interactionBursts.ts src/stores/oceanStore.ts
git commit -m "feat(animation): implement interaction note flurries

Implements M4.2: Interaction flurries

- playInteractionFlurry schedules rapid note bursts
- 3-5 notes per robot with 80ms spacing
- Uses current harmony palette
- createVisualBurst with 8 radiating lines
- Lines animate outward and fade
- Midpoint positioning between robots
- GSAP-driven line animation
- Element cleanup after animation

Closes #26"
git push origin feature/m4-2-interaction-flurries
```

---

## Issue M4.3: Factory Actor Implementation (3-4 hours)

### 3.1 Define Actor Types

**File: `src/types/Actor.ts`**

```typescript
export type ActorKind = 'factory'; // Phase 8 will add 'environmental'

export interface Actor {
  id: string;
  kind: ActorKind;
  position: Vec2;
  size: number;
  lastSpawnTime?: number; // For factory actors
}

export interface Vec2 {
  x: number;
  y: number;
}
```

### 3.2 Create Factory Actor SVG

**File: `src/assets/actors/FactorySVG.tsx`**

```typescript
import React from 'react';

interface FactorySVGProps {
  color?: string;
}

/**
 * Factory actor - spinning gear that spawns robots
 */
export function FactorySVG({ color = '#ff9800' }: FactorySVGProps) {
  return (
    <g className="factory-actor" style={{ color }}>
      {/* Base platform */}
      <rect
        x="-50"
        y="20"
        width="100"
        height="30"
        rx="5"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* Main gear */}
      <g className="factory-gear">
        <circle cx="0" cy="0" r="35" fill="currentColor" />
        
        {/* Gear teeth (8 teeth) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <rect
            key={angle}
            x="-5"
            y="-40"
            width="10"
            height="10"
            fill="currentColor"
            transform={`rotate(${angle})`}
          />
        ))}
        
        {/* Center hole */}
        <circle cx="0" cy="0" r="15" fill="rgba(0,0,0,0.3)" />
      </g>
      
      {/* Smaller gear */}
      <g className="factory-gear-small" transform="translate(25, -25)">
        <circle cx="0" cy="0" r="20" fill="currentColor" opacity="0.9" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <rect
            key={angle}
            x="-3"
            y="-23"
            width="6"
            height="6"
            fill="currentColor"
            transform={`rotate(${angle})`}
          />
        ))}
      </g>
    </g>
  );
}
```

### 3.3 Create Factory Animation

**File: `src/animation/actorIdle.ts`** (create or update)

```typescript
import { gsap } from 'gsap';

/**
 * Create idle animation for factory actor
 */
export function createFactoryIdleAnimation(actorId: string): gsap.core.Timeline {
  const element = document.querySelector(`[data-actor-id="${actorId}"]`) as SVGGElement;
  if (!element) {
    console.warn('[actorIdle] Factory element not found:', actorId);
    return gsap.timeline();
  }

  const mainGear = element.querySelector('.factory-gear') as SVGGElement;
  const smallGear = element.querySelector('.factory-gear-small') as SVGGElement;

  const tl = gsap.timeline({ repeat: -1 });

  if (mainGear) {
    tl.to(mainGear, {
      rotation: 360,
      duration: 8,
      ease: 'none',
      transformOrigin: '50% 50%',
    }, 0);
  }

  if (smallGear) {
    tl.to(smallGear, {
      rotation: -360,
      duration: 5,
      ease: 'none',
      transformOrigin: '50% 50%',
    }, 0);
  }

  return tl;
}
```

### 3.4 Create Factory Spawning System

**File: `src/systems/factorySystem.ts`**

```typescript
import { useEffect } from 'react';
import { useOceanStore } from '../stores/oceanStore';
import { spawnRobotAtRandom } from './spawner';
import { BeatClock } from '../engine/beatClock';
import type { Actor } from '../types/Actor';

const SPAWN_INTERVAL_MEASURES = 16; // Spawn every 16 measures (4 hours equivalent)

/**
 * Hook to manage factory actor spawning
 */
export function useFactorySystem() {
  const actors = useOceanStore((state) => state.actors);
  const robots = useOceanStore((state) => state.robots);
  const maxRobots = useOceanStore((state) => state.settings.maxRobots);
  const addRobot = useOceanStore((state) => state.addRobot);
  const updateActor = useOceanStore((state) => state.updateActor);

  useEffect(() => {
    const checkFactories = () => {
      const currentMeasure = BeatClock.getCurrentMeasure().measure;
      
      // Check if we're at population limit
      if (robots.length >= maxRobots) return;

      actors.forEach((actor) => {
        if (actor.kind !== 'factory') return;

        // Check if enough time has passed since last spawn
        if (
          actor.lastSpawnTime !== undefined &&
          currentMeasure - actor.lastSpawnTime < SPAWN_INTERVAL_MEASURES
        ) {
          return;
        }

        // Spawn new robot
        const robot = spawnRobotAtRandom();
        addRobot(robot);

        // Update factory's last spawn time
        updateActor(actor.id, { lastSpawnTime: currentMeasure });

        console.log('[FactorySystem] Factory spawned robot:', robot.id);
      });
    };

    // Check every measure
    const interval = setInterval(checkFactories, 1000);

    return () => clearInterval(interval);
  }, [actors, robots, maxRobots, addRobot, updateActor]);
}
```

### 3.5 Add Actors to Store

**File: `src/stores/oceanStore.ts`** (update)

```typescript
import type { Actor } from '../types/Actor';

interface OceanStore {
  // ... existing
  actors: Actor[];
  addActor: (actor: Actor) => void;
  updateActor: (id: string, updates: Partial<Actor>) => void;
  removeActor: (id: string) => void;
}

// In create():
actors: [],

addActor: (actor) => {
  set((state) => ({
    actors: [...state.actors, actor],
  }));
},

updateActor: (id, updates) => {
  set((state) => ({
    actors: state.actors.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    ),
  }));
},

removeActor: (id) => {
  set((state) => ({
    actors: state.actors.filter((a) => a.id !== id),
  }));
},
```

### 3.6 Create Actor Component

**File: `src/components/Actor.tsx`**

```typescript
import React, { useEffect } from 'react';
import type { Actor } from '../types/Actor';
import { FactorySVG } from '../assets/actors/FactorySVG';
import { createFactoryIdleAnimation } from '../animation/actorIdle';

interface ActorProps {
  actor: Actor;
}

export function Actor({ actor }: ActorProps) {
  useEffect(() => {
    if (actor.kind === 'factory') {
      const tl = createFactoryIdleAnimation(actor.id);
      tl.play();

      return () => {
        tl.kill();
      };
    }
  }, [actor.id, actor.kind]);

  return (
    <g
      data-actor-id={actor.id}
      transform={`translate(${actor.position.x}, ${actor.position.y}) scale(${actor.size})`}
    >
      {actor.kind === 'factory' && <FactorySVG />}
    </g>
  );
}
```

### 3.7 Add Actors to OceanScene

**File: `src/components/OceanScene.tsx`** (update)

```typescript
import { Actor } from './Actor';
import { useFactorySystem } from '../systems/factorySystem';

export function OceanScene() {
  useCollisionSystem();
  useIdleSystem();
  useFactorySystem(); // Add factory system

  const robots = useOceanStore((state) => state.robots);
  const actors = useOceanStore((state) => state.actors);

  return (
    <svg ...>
      {/* ... background */}
      
      {/* Actor layer */}
      <g id="actor-layer">
        {actors.map((actor) => (
          <Actor key={actor.id} actor={actor} />
        ))}
      </g>

      {/* Robot layer */}
      <g id="robot-layer">
        {robots.map((robot) => (
          <Robot key={robot.id} robot={robot} />
        ))}
      </g>
      
      {/* ... rest */}
    </svg>
  );
}
```

### 3.8 Spawn Initial Factory

**File: `src/app/initEngine.ts`** (update)

```typescript
import { useOceanStore } from '../stores/oceanStore';
import type { Actor } from '../types/Actor';

export async function initEngine() {
  // ... existing AudioEngine init

  // Add initial factory actor
  const factory: Actor = {
    id: crypto.randomUUID(),
    kind: 'factory',
    position: { x: 960, y: 540 }, // Center of 1920x1080 canvas
    size: 1.0,
    lastSpawnTime: 0,
  };

  useOceanStore.getState().addActor(factory);
  console.log('[InitEngine] Initial factory spawned');
}
```

### 3.9 Test Factory System

1. Start app, click Play
2. Verify factory actor appears at center (spinning gears)
3. Wait 16 measures (~64 beats at BPM 60 = ~60 seconds)
4. Verify robot spawns automatically
5. Check console for spawn logs
6. Verify factory stops spawning at max robots

### 3.10 Acceptance Criteria

- [ ] Actor type system defined
- [ ] FactorySVG component created
- [ ] Factory idle animation (spinning gears)
- [ ] Factory system spawns robots every 16 measures
- [ ] Respects max robot limit
- [ ] lastSpawnTime tracked per factory
- [ ] Actors in store with CRUD actions
- [ ] Actor component renders factories
- [ ] Initial factory spawned on init

### 3.11 Commit, Push, PR

```bash
git checkout -b feature/m4-3-factory-actors
git add src/types/Actor.ts src/assets/actors/FactorySVG.tsx src/animation/actorIdle.ts src/systems/factorySystem.ts src/stores/oceanStore.ts src/components/Actor.tsx src/components/OceanScene.tsx src/app/initEngine.ts
git commit -m "feat(actors): implement factory actors with automated spawning

Implements M4.3: Factory actors

- Actor type system (factory, environmental)
- FactorySVG with spinning gear animation
- Factory system spawns robots every 16 measures
- Respects max robot limit
- lastSpawnTime tracking
- Actor store actions (add/update/remove)
- Actor component with animation
- Initial factory spawned on init
- BeatClock-based timing

Closes #27"
git push origin feature/m4-3-factory-actors
```

---

## Issue M4.4: Interaction Cooldown and State Management (1-2 hours)

### 4.1 Enhance Cooldown System

**File: `src/systems/collisionSystem.ts`** (update)

```typescript
// Update cooldown to use measure-based timing
import { BeatClock } from '../engine/beatClock';

const COOLDOWN_MEASURES = 5; // 5 measures = ~1.25 hours equivalent

export function canInteract(robot: Robot): boolean {
  if (!robot.lastInteractionMeasure) return true;
  
  const currentMeasure = BeatClock.getCurrentMeasure().measure;
  return currentMeasure - robot.lastInteractionMeasure >= COOLDOWN_MEASURES;
}
```

### 4.2 Update Robot Type

**File: `src/types/Robot.ts`** (update)

```typescript
export interface Robot {
  // ... existing fields
  lastInteractionMeasure?: number; // Measure when last interaction occurred
}
```

### 4.3 Update Collision System

**File: `src/hooks/useCollisionSystem.ts`** (update)

```typescript
// Update to use measure-based cooldown
const checkCollisions = () => {
  const currentMeasure = BeatClock.getCurrentMeasure().measure;
  const pairs = findNearbyPairs(robots);

  pairs.forEach(([robotA, robotB]) => {
    if (
      robotA.state === RobotState.Selected ||
      robotB.state === RobotState.Selected
    ) {
      return;
    }

    if (!canInteract(robotA) || !canInteract(robotB)) {
      return;
    }

    triggerInteraction(robotA.id, robotB.id);

    updateRobot(robotA.id, { lastInteractionMeasure: currentMeasure });
    updateRobot(robotB.id, { lastInteractionMeasure: currentMeasure });
  });
};
```

### 4.4 Add Interaction State Tracking

**File: `src/stores/oceanStore.ts`** (update)

```typescript
interface OceanStore {
  // ... existing
  interactionCount: number; // Total interactions since start
}

// In create():
interactionCount: 0,

// Update triggerInteraction:
triggerInteraction: (robotAId: string, robotBId: string) => {
  const state = get();
  const robotA = state.getRobotById(robotAId);
  const robotB = state.getRobotById(robotBId);
  
  if (!robotA || !robotB) return;
  
  const midX = (robotA.position.x + robotB.position.x) / 2;
  const midY = (robotA.position.y + robotB.position.y) / 2;
  
  playInteractionFlurry(robotAId, robotBId);
  createVisualBurst(midX, midY);
  
  set({ interactionCount: state.interactionCount + 1 });
  
  console.log('[Store] Interaction #' + (state.interactionCount + 1));
},
```

### 4.5 Acceptance Criteria

- [ ] Cooldown uses measure-based timing (5 measures)
- [ ] lastInteractionMeasure tracked per robot
- [ ] BeatClock provides current measure
- [ ] Interaction count tracked in store
- [ ] Console logs show interaction numbers
- [ ] Selected robots still skip interactions

### 4.6 Commit, Push, PR

```bash
git checkout -b feature/m4-4-cooldown-management
git add src/systems/collisionSystem.ts src/hooks/useCollisionSystem.ts src/types/Robot.ts src/stores/oceanStore.ts
git commit -m "feat(systems): implement measure-based cooldown system

Implements M4.4: Cooldown and state management

- Measure-based cooldown (5 measures)
- lastInteractionMeasure tracking per robot
- BeatClock integration for timing
- Interaction count tracking in store
- Console logging for interaction events
- Selected robots skip interactions

Closes #28"
git push origin feature/m4-4-cooldown-management
```

---

## Phase 7 Complete! ✅

### Final Verification

- [ ] All 4 M4 issues complete
- [ ] Collisions detected and interactions trigger
- [ ] Note flurries play with visual bursts
- [ ] Factory actors spawn robots automatically
- [ ] Measure-based cooldown working (5 measures)
- [ ] Interaction count tracked
- [ ] All PRs merged
- [ ] TypeScript compiles
- [ ] Lint passes

### What You've Built

**Interaction Features:**
- ✅ Collision detection system (100px radius)
- ✅ Interaction note flurries (3-5 notes per robot)
- ✅ Visual burst animations (8 radiating lines)
- ✅ Cooldown management (5 measures = ~1.25 hours)
- ✅ Measure-based timing (BeatClock integration)
- ✅ Interaction count tracking

**Actor System:**
- ✅ Factory actors (automated robot spawning every 16 measures)
- ✅ Factory idle animations (spinning gears)
- ✅ Actor type system (factory only - environmental in Phase 8)
- ✅ BeatClock-based spawning timing

### Current State

**What works:**
- Robots swim and play unique melodies
- Robots interact when nearby (flurry + burst)
- Factory spawns new robots automatically
- Cooldown system prevents interaction spam
- Harmony changes affect all melodies
- Polyphony keeps audio manageable

**What doesn't exist yet (Phase 8 - M5):**
- No environmental actors (ruins, machinery, scrap)
- No camera pan/zoom controls
- No depth layers with parallax
- No bubble system
- No world bounds enforcement

### Testing the Complete System

1. Start app, click Play
2. Watch factory spawn robots automatically (every 16 measures)
3. Wait for robots to collide → see flurries and bursts
4. Verify cooldown prevents spam (5 measures between same-pair)
5. Check console for interaction count logs
6. Spawn more robots to see interactions increase
7. Verify audio stays clean (polyphony working)
8. Select a robot → verify it stops interacting

### Time Tracking

| Issue | Estimated | Actual |
|-------|-----------|--------|
| M4.1: Collision Detection | 3-4 hours | |
| M4.2: Interaction Flurries | 2-3 hours | |
| M4.3: Factory Actors | 3-4 hours | |
| M4.4: Cooldown & State | 1-2 hours | |
| **Total** | **~12 hours** | |

---

## Portfolio Talking Points

**Collision System:**
- "Spatial algorithm finds all nearby pairs efficiently (O(n²) with early exit)"
- "Cooldown system prevents interaction spam using timestamp comparison"
- "gsap.ticker provides periodic checks without requestAnimationFrame overhead"

**Interaction Design:**
- "Emergent musical patterns from robot proximity (no scripted behavior)"
- "Visual feedback (burst) synchronized with audio (flurry) demonstrates cross-system coordination"
- "Note selection from harmony palette ensures musical coherence"

**Factory System:**
- "BeatClock-based spawning maintains musical timing (16-measure intervals)"
- "Population management respects limits and prevents memory growth"
- "Simpler than biological reproduction but thematically appropriate"

**State Management:**
- "Measure-based cooldown system integrates with BeatClock"
- "Interaction count tracking for analytics"
- "Selected state properly isolates robots from collision detection"

---

## Next Steps

**You're ready for Phase 8: M5 (Environment)**

Phase 8 will add:
- Environmental actors (ruins, machinery, scrap piles)
- Procedurally generated actors (rocks, plants)
- Camera pan/zoom system (drag to pan, scroll to zoom)
- Depth layers with parallax effect
- Bubble system (ambient particles)
- World bounds enforcement
1. Merge all M4 PRs
2. Update project board (M4 milestone complete)
3. Test complete system end-to-end
4. Take a break - you've built a complete ecosystem!

---

**Questions?** Review interaction/actor docs or open a discussion.

**Ready for polish?** Phase 8 takes the working system and makes it production-ready.
