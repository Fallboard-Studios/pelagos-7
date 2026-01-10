# Phase 8: Environment (M5) - Detailed Steps

**Timeline:** Week 4, Days 1-3 (2-3 days, ~16 hours)  
**Goal:** Add environmental actors (ruins, machinery, scrap piles), camera pan/zoom system, depth layers with parallax, bubbles, and world bounds.

---

## Prerequisites

- [ ] Phase 7 complete (M4 milestone done)
- [ ] Robots interacting with note flurries
- [ ] Factory actors spawning robots
- [ ] All M5 issues created in project backlog
- [ ] Understanding of camera transforms and parallax effects

---

## Why This Phase Matters

**Visual polish and depth!** This phase transforms the flat canvas into a rich, explorable environment. Camera controls let users navigate larger worlds. Depth layers create spatial immersion. Environmental actors add thematic richness without gameplay complexity.

**What makes this impressive:**
- Camera system shows UI/UX thinking (pan/zoom with smooth performance)
- Depth layers with parallax demonstrate rendering sophistication
- Procedural generation for environmental variety
- SVG viewBox manipulation for camera (no DOM churn)
- World bounds prevent robots from swimming off-canvas

**After Phase 8:** You have a complete, explorable environment with visual depth and navigable space. Phase 9 (Polish & Launch) adds UI panels, mobile support, and deployment.

---

## Phase Overview

You'll implement 6 issues from Milestone M5:

1. **M5.1:** Camera Pan and Zoom System
2. **M5.2:** Viewport Persistence (save/restore camera position)
3. **M5.3:** Environmental Actors (decorative)
4. **M5.4:** Depth Layers with Parallax
5. **M5.5:** Bubble System (ambient particles)
6. **M5.6:** World Bounds Enforcement

**End state:** Camera pans/zooms smoothly, environmental actors add depth, parallax creates spatial immersion, bubbles float upward, robots stay within bounds.

---

## Milestone M5: Environment

---

## Issue M5.1: Camera Pan and Zoom System (3-4 hours)

### 1.1 Add Camera State to Store

**File: `src/stores/oceanStore.ts`** (update)

```typescript
interface OceanStore {
  // ... existing
  camera: {
    x: number;
    y: number;
    scale: number;
  };
  updateCamera: (updates: Partial<OceanStore['camera']>) => void;
}

// In create():
camera: {
  x: 0,
  y: 0,
  scale: 1.0,
},

updateCamera: (updates) => {
  set((state) => ({
    camera: { ...state.camera, ...updates },
  }));
},
```

### 1.2 Create Camera Hook

**File: `src/hooks/useCameraControls.ts`**

```typescript
import { useEffect } from 'react';
import { useOceanStore } from '../stores/oceanStore';

export function useCameraControls(svgRef: React.RefObject<SVGSVGElement>) {
  const camera = useOceanStore((state) => state.camera);
  const updateCamera = useOceanStore((state) => state.updateCamera);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startCameraX = 0;
    let startCameraY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      // Only pan if not clicking on a robot or UI element
      const target = e.target as HTMLElement;
      if (target.closest('[data-robot-id]') || target.closest('.ui-panel')) {
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startCameraX = camera.x;
      startCameraY = camera.y;
      svg.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = (e.clientX - startX) / camera.scale;
      const dy = (e.clientY - startY) / camera.scale;

      updateCamera({
        x: startCameraX - dx,
        y: startCameraY - dy,
      });
    };

    const handleMouseUp = () => {
      isDragging = false;
      svg.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.5, Math.min(2.0, camera.scale * delta));
      
      updateCamera({ scale: newScale });
    };

    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseup', handleMouseUp);
    svg.addEventListener('mouseleave', handleMouseUp);
    svg.addEventListener('wheel', handleWheel, { passive: false });
    svg.style.cursor = 'grab';

    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('mouseup', handleMouseUp);
      svg.removeEventListener('mouseleave', handleMouseUp);
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [camera, updateCamera, svgRef]);
}
```

### 1.3 Apply Camera to OceanScene

**File: `src/components/OceanScene.tsx`** (update)

```typescript
import { useRef } from 'react';
import { useCameraControls } from '../hooks/useCameraControls';

export function OceanScene() {
  const svgRef = useRef<SVGSVGElement>(null);
  const camera = useOceanStore((state) => state.camera);

  useCameraControls(svgRef);

  return (
    <svg
      ref={svgRef}
      viewBox={`${camera.x} ${camera.y} ${1920 / camera.scale} ${1080 / camera.scale}`}
      width="100%"
      height="100%"
      className="ocean-scene"
    >
      {/* ... existing content */}
    </svg>
  );
}
```

### 1.4 Acceptance Criteria

- [ ] Camera state in store (x, y, scale)
- [ ] Mouse drag to pan (skip if clicking robot/UI)
- [ ] Mouse wheel to zoom
- [ ] Zoom limits (0.5x to 2.0x)
- [ ] Cursor changes (grab/grabbing)
- [ ] viewBox updates with camera
- [ ] Smooth performance (no lag)

### 1.5 Commit, Push, PR

```bash
git checkout -b feature/m5-1-camera-controls
git add src/hooks/useCameraControls.ts src/stores/oceanStore.ts src/components/OceanScene.tsx
git commit -m "feat(camera): implement pan and zoom system

Implements M5.1: Camera controls

- Camera state (x, y, scale)
- Mouse drag to pan
- Mouse wheel to zoom (0.5x-2.0x)
- Cursor changes (grab/grabbing)
- Skip drag if clicking robot or UI
- SVG viewBox manipulation
- Smooth performance

Closes #29"
git push origin feature/m5-1-camera-controls
```

---

## Issue M5.2: Viewport Persistence (1-2 hours)

### 2.1 Add Viewport Persistence

**File: `src/stores/oceanStore.ts`** (update)

```typescript
// Add viewport persistence to existing persist config
persist: {
  name: 'pelagos-7-ocean',
  partialize: (state) => ({
    camera: state.camera,
    settings: state.settings,
    // ... other persistent state
  }),
},
```

### 2.2 Acceptance Criteria

- [ ] Camera position saved to localStorage
- [ ] Camera restored on page reload
- [ ] Zoom level persists
- [ ] Works across sessions

---

## Issue M5.3: Environmental Actors (3-4 hours)

### 3.1 Update Actor Type System

**File: `src/types/Actor.ts`** (update)

```typescript
export type ActorVariant = 'ruins' | 'machinery' | 'scrap' | 'rock' | 'plant';

export interface Actor {
  id: string;
  kind: 'factory' | 'environmental';
  variant?: ActorVariant; // For environmental actors
  position: Vec2;
  size: number;
  zIndex?: number; // For depth placement
  lastSpawnTime?: number; // For factory actors
}
```

### 3.2 Create Environmental SVGs

**File: `src/assets/actors/EnvironmentalSVGs.tsx`**

```typescript
import React from 'react';

interface EnvironmentalProps {
  color?: string;
}

/**
 * Ruins - broken structure
 */
export function RuinsSVG({ color = '#8b7355' }: EnvironmentalProps) {
  return (
    <g className="ruins-actor" style={{ color }}>
      {/* Broken pillar */}
      <rect x="-15" y="-40" width="30" height="80" fill="currentColor" opacity="0.8" />
      {/* Cracks */}
      <path d="M -5 -20 L 5 -10 L -3 0 L 7 10" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none" />
      {/* Broken top */}
      <polygon points="-15,-40 15,-40 20,-50 -20,-45" fill="currentColor" opacity="0.6" />
    </g>
  );
}

/**
 * Machinery - broken gears and pipes
 */
export function MachinerySVG({ color = '#607d8b' }: EnvironmentalProps) {
  return (
    <g className="machinery-actor" style={{ color }}>
      {/* Base */}
      <rect x="-30" y="10" width="60" height="20" rx="3" fill="currentColor" opacity="0.9" />
      {/* Broken gear */}
      <circle cx="0" cy="0" r="20" fill="currentColor" opacity="0.7" />
      <circle cx="0" cy="0" r="10" fill="rgba(0,0,0,0.3)" />
      {/* Pipes */}
      <rect x="-5" y="-30" width="10" height="30" fill="currentColor" opacity="0.6" />
      <rect x="10" y="-25" width="8" height="25" fill="currentColor" opacity="0.6" />
    </g>
  );
}

/**
 * Scrap pile
 */
export function ScrapSVG({ color = '#9e9e9e' }: EnvironmentalProps) {
  return (
    <g className="scrap-actor" style={{ color }}>
      {/* Pile of random shapes */}
      <polygon points="0,-20 15,-10 10,5 -10,5 -15,-10" fill="currentColor" opacity="0.8" />
      <rect x="-20" y="0" width="25" height="15" fill="currentColor" opacity="0.6" transform="rotate(-15)" />
      <circle cx="15" cy="5" r="8" fill="currentColor" opacity="0.7" />
    </g>
  );
}

/**
 * Rock - procedural (simple version)
 */
export function RockSVG({ color = '#5d4e37' }: EnvironmentalProps) {
  return (
    <g className="rock-actor" style={{ color }}>
      <ellipse cx="0" cy="10" rx="40" ry="30" fill="currentColor" opacity="0.9" />
      <ellipse cx="0" cy="0" rx="30" ry="25" fill="currentColor" />
      {/* Highlights */}
      <ellipse cx="-10" cy="-5" rx="10" ry="8" fill="rgba(255,255,255,0.1)" />
    </g>
  );
}

/**
 * Plant - swaying seaweed
 */
export function PlantSVG({ color = '#4caf50' }: EnvironmentalProps) {
  return (
    <g className="plant-actor" style={{ color }}>
      {/* Stem */}
      <path
        d="M 0 30 Q -5 15 0 0 Q 5 -15 0 -30"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        opacity="0.8"
      />
      {/* Fronds */}
      <ellipse cx="-8" cy="-10" rx="6" ry="12" fill="currentColor" opacity="0.6" transform="rotate(-30)" />
      <ellipse cx="8" cy="5" rx="6" ry="12" fill="currentColor" opacity="0.6" transform="rotate(30)" />
      <ellipse cx="-6" cy="15" rx="5" ry="10" fill="currentColor" opacity="0.6" transform="rotate(-20)" />
    </g>
  );
}
```

### 3.3 Update Actor Renderer

**File: `src/components/Actor.tsx`** (update)

```typescript
import { RuinsSVG, MachinerySVG, ScrapSVG, RockSVG, PlantSVG } from '../assets/actors/EnvironmentalSVGs';
import { createPlantIdleAnimation } from '../animation/actorIdle';

export function Actor({ actor }: ActorProps) {
  useEffect(() => {
    if (actor.kind === 'factory') {
      const tl = createFactoryIdleAnimation(actor.id);
      tl.play();
      return () => tl.kill();
    } else if (actor.kind === 'environmental' && actor.variant === 'plant') {
      const tl = createPlantIdleAnimation(actor.id);
      tl.play();
      return () => tl.kill();
    }
  }, [actor.id, actor.kind, actor.variant]);

  const renderEnvironmental = () => {
    switch (actor.variant) {
      case 'ruins': return <RuinsSVG />;
      case 'machinery': return <MachinerySVG />;
      case 'scrap': return <ScrapSVG />;
      case 'rock': return <RockSVG />;
      case 'plant': return <PlantSVG />;
      default: return null;
    }
  };

  return (
    <g
      data-actor-id={actor.id}
      transform={`translate(${actor.position.x}, ${actor.position.y}) scale(${actor.size})`}
      style={{ zIndex: actor.zIndex || 0 }}
    >
      {actor.kind === 'factory' && <FactorySVG />}
      {actor.kind === 'environmental' && renderEnvironmental()}
    </g>
  );
}
```

### 3.4 Create Plant Idle Animation

**File: `src/animation/actorIdle.ts`** (update)

```typescript
export function createPlantIdleAnimation(actorId: string): gsap.core.Timeline {
  const element = document.querySelector(`[data-actor-id="${actorId}"]`) as SVGGElement;
  if (!element) return gsap.timeline();

  const tl = gsap.timeline({ repeat: -1, yoyo: true });

  tl.to(element, {
    rotation: 3,
    duration: 2 + Math.random(),
    ease: 'sine.inOut',
    transformOrigin: '50% 100%',
  });

  return tl;
}
```

### 3.5 Spawn Initial Environmental Actors

**File: `src/app/initEngine.ts`** (update)

```typescript
export async function initEngine() {
  // ... existing factory spawn

  // Spawn environmental actors
  const environmentalActors: Actor[] = [
    {
      id: crypto.randomUUID(),
      kind: 'environmental',
      variant: 'ruins',
      position: { x: 400, y: 800 },
      size: 1.2,
      zIndex: 1,
    },
    {
      id: crypto.randomUUID(),
      kind: 'environmental',
      variant: 'machinery',
      position: { x: 1500, y: 700 },
      size: 1.0,
      zIndex: 2,
    },
    {
      id: crypto.randomUUID(),
      kind: 'environmental',
      variant: 'rock',
      position: { x: 800, y: 900 },
      size: 0.8,
      zIndex: 0,
    },
    {
      id: crypto.randomUUID(),
      kind: 'environmental',
      variant: 'plant',
      position: { x: 300, y: 850 },
      size: 1.0,
      zIndex: 1,
    },
    {
      id: crypto.randomUUID(),
      kind: 'environmental',
      variant: 'scrap',
      position: { x: 1200, y: 600 },
      size: 0.9,
      zIndex: 1,
    },
  ];

  environmentalActors.forEach((actor) => {
    useOceanStore.getState().addActor(actor);
  });

  console.log('[InitEngine] Environmental actors spawned');
}
```

### 3.6 Acceptance Criteria

- [ ] 5 environmental actor types defined
- [ ] SVG components created
- [ ] Actor renderer supports environmental variants
- [ ] Plant idle animation (gentle sway)
- [ ] Initial environmental actors spawned
- [ ] zIndex tracked for depth sorting

---

## Issue M5.4: Depth Layers with Parallax (2-3 hours)

### 4.1 Update OceanScene with Depth Layers

**File: `src/components/OceanScene.tsx`** (update)

```typescript
export function OceanScene() {
  const svgRef = useRef<SVGSVGElement>(null);
  const camera = useOceanStore((state) => state.camera);
  const robots = useOceanStore((state) => state.robots);
  const actors = useOceanStore((state) => state.actors);

  useCameraControls(svgRef);

  // Sort actors and robots by zIndex
  const backgroundActors = actors.filter((a) => (a.zIndex || 0) === 0);
  const midActors = actors.filter((a) => (a.zIndex || 0) === 1);
  const foregroundActors = actors.filter((a) => (a.zIndex || 0) === 2);

  return (
    <svg
      ref={svgRef}
      viewBox={`${camera.x} ${camera.y} ${1920 / camera.scale} ${1080 / camera.scale}`}
      width="100%"
      height="100%"
      className="ocean-scene"
    >
      {/* Background gradient */}
      <defs>
        <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a2e4a" />
          <stop offset="100%" stopColor="#05182b" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#oceanGradient)" />

      {/* Background layer (z=0) - slowest parallax */}
      <g
        id="background-layer"
        transform={`translate(${camera.x * 0.3}, ${camera.y * 0.3})`}
        filter="blur(2px)"
        opacity="0.6"
      >
        {backgroundActors.map((actor) => (
          <Actor key={actor.id} actor={actor} />
        ))}
      </g>

      {/* Mid layer (z=1) - normal parallax */}
      <g
        id="mid-layer"
        transform={`translate(${camera.x * 0.6}, ${camera.y * 0.6})`}
      >
        {midActors.map((actor) => (
          <Actor key={actor.id} actor={actor} />
        ))}
        {robots.map((robot) => (
          <Robot key={robot.id} robot={robot} />
        ))}
      </g>

      {/* Foreground layer (z=2) - faster parallax */}
      <g
        id="foreground-layer"
        transform={`translate(${camera.x * 1.2}, ${camera.y * 1.2})`}
        opacity="0.8"
      >
        {foregroundActors.map((actor) => (
          <Actor key={actor.id} actor={actor} />
        ))}
      </g>
    </svg>
  );
}
```

### 4.2 Acceptance Criteria

- [ ] 3 depth layers (background, mid, foreground)
- [ ] Parallax coefficients (0.3, 0.6, 1.2)
- [ ] Background layer blurred (2px)
- [ ] Actors sorted by zIndex
- [ ] Robots in mid layer
- [ ] Parallax visible when panning

---

## Issue M5.5: Bubble System (2-3 hours)

### 5.1 Create Bubble Component

**File: `src/components/Bubble.tsx`**

```typescript
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface BubbleProps {
  id: string;
  startX: number;
  startY: number;
  size: number;
}

export function Bubble({ id, startX, startY, size }: BubbleProps) {
  const ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const tl = gsap.timeline({
      onComplete: () => {
        // Bubble reached surface, remove it
        const event = new CustomEvent('bubble-complete', { detail: { id } });
        window.dispatchEvent(event);
      },
    });

    // Float upward with wobble
    tl.to(ref.current, {
      y: -800,
      x: `+=${(Math.random() - 0.5) * 100}`, // Drift sideways
      duration: 5 + Math.random() * 3,
      ease: 'none',
    });

    // Wobble animation
    tl.to(
      ref.current,
      {
        x: `+=${Math.sin(Date.now()) * 20}`,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      },
      0
    );

    return () => {
      tl.kill();
    };
  }, [id]);

  return (
    <circle
      ref={ref}
      cx={startX}
      cy={startY}
      r={size}
      fill="rgba(255, 255, 255, 0.3)"
      stroke="rgba(255, 255, 255, 0.5)"
      strokeWidth="1"
    />
  );
}
```

### 5.2 Create Bubble System Hook

**File: `src/hooks/useAmbientBubbles.ts`**

```typescript
import { useState, useEffect } from 'react';

interface BubbleData {
  id: string;
  startX: number;
  startY: number;
  size: number;
}

export function useAmbientBubbles() {
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);

  useEffect(() => {
    const spawnBubble = () => {
      const bubble: BubbleData = {
        id: crypto.randomUUID(),
        startX: Math.random() * 1920,
        startY: 1080 + 50, // Start below canvas
        size: 3 + Math.random() * 7, // 3-10px radius
      };

      setBubbles((prev) => [...prev, bubble]);
    };

    // Spawn bubble every 500ms
    const interval = setInterval(spawnBubble, 500);

    // Listen for bubble completion
    const handleBubbleComplete = (e: CustomEvent) => {
      setBubbles((prev) => prev.filter((b) => b.id !== e.detail.id));
    };

    window.addEventListener('bubble-complete', handleBubbleComplete as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('bubble-complete', handleBubbleComplete as EventListener);
    };
  }, []);

  return bubbles;
}
```

### 5.3 Add Bubbles to OceanScene

**File: `src/components/OceanScene.tsx`** (update)

```typescript
import { Bubble } from './Bubble';
import { useAmbientBubbles } from '../hooks/useAmbientBubbles';

export function OceanScene() {
  // ... existing code
  const bubbles = useAmbientBubbles();

  return (
    <svg {...}>
      {/* ... existing layers */}

      {/* Bubble layer (on top) */}
      <g id="bubble-layer">
        {bubbles.map((bubble) => (
          <Bubble key={bubble.id} {...bubble} />
        ))}
      </g>
    </svg>
  );
}
```

### 5.4 Acceptance Criteria

- [ ] Bubbles spawn every 500ms
- [ ] Bubbles float upward (5-8 seconds)
- [ ] Bubbles wobble side-to-side
- [ ] Bubbles removed on completion
- [ ] Size varies (3-10px radius)
- [ ] Transparent white appearance

---

## Issue M5.6: World Bounds Enforcement (1-2 hours)

### 5.1 Define World Bounds

**File: `src/constants/index.ts`** (update)

```typescript
export const WORLD_BOUNDS = {
  minX: 0,
  maxX: 1920,
  minY: 0,
  maxY: 1080,
};
```

### 5.2 Update Destination Picking

**File: `src/systems/idleSystem.ts`** (update)

```typescript
import { WORLD_BOUNDS } from '../constants';

function pickRandomDestination(currentPos: Vec2): Vec2 {
  // Keep destination within bounds
  return {
    x: Math.max(WORLD_BOUNDS.minX + 100, Math.min(WORLD_BOUNDS.maxX - 100, Math.random() * 1920)),
    y: Math.max(WORLD_BOUNDS.minY + 100, Math.min(WORLD_BOUNDS.maxY - 100, Math.random() * 1080)),
  };
}
```

### 5.3 Acceptance Criteria

- [ ] World bounds defined (0,0 to 1920,1080)
- [ ] Robots pick destinations within bounds
- [ ] 100px padding from edges
- [ ] No robots swim off-canvas

---

## Phase 8 Complete! ✅

### Final Verification

- [ ] All 6 M5 issues complete
- [ ] Camera pans/zooms smoothly
- [ ] Viewport persists across reloads
- [ ] Environmental actors render (5 types)
- [ ] Depth layers with parallax working
- [ ] Bubbles float upward continuously
- [ ] Robots stay within world bounds
- [ ] All PRs merged
- [ ] TypeScript compiles
- [ ] Lint passes

### What You've Built

**Camera & Navigation:**
- ✅ Camera pan (mouse drag)
- ✅ Camera zoom (mouse wheel, 0.5x-2.0x)
- ✅ Viewport persistence (localStorage)
- ✅ Smooth performance

**Environmental Depth:**
- ✅ 5 environmental actor types (ruins, machinery, scrap, rock, plant)
- ✅ 3 depth layers (background, mid, foreground)
- ✅ Parallax scrolling (0.3x, 0.6x, 1.2x)
- ✅ Background blur for depth

**Ambient Effects:**
- ✅ Bubble system (spawn every 500ms)
- ✅ Bubble animation (float upward 5-8 seconds)
- ✅ Wobble side-to-side
- ✅ World bounds enforcement

### Current State

**What works:**
- Robots swim and play unique melodies
- Robots interact when nearby (flurry + burst)
- Factory spawns robots automatically
- Camera pans/zooms smoothly
- Environmental actors add depth
- Parallax creates spatial immersion
- Bubbles float continuously
- Harmony changes affect all melodies
- Polyphony keeps audio clean

**What doesn't exist yet (Phase 9 - Polish & Launch):**
- No expanded UI panels (robot editor, settings)
- No save/export system
- No mobile responsiveness
- No performance optimizations
- No deployment setup

### Testing the Complete System

1. Start app, click Play
2. Drag canvas to pan around
3. Scroll to zoom in/out
4. Watch factory spawn robots
5. Wait for robot interactions
6. Verify parallax when panning (background slower than foreground)
7. Watch bubbles float continuously
8. Reload page → camera position restored
9. Verify robots stay within bounds

### Time Tracking

| Issue | Estimated | Actual |
|-------|-----------|--------|
| M5.1: Camera Controls | 3-4 hours | |
| M5.2: Viewport Persistence | 1-2 hours | |
| M5.3: Environmental Actors | 3-4 hours | |
| M5.4: Depth Layers | 2-3 hours | |
| M5.5: Bubble System | 2-3 hours | |
| M5.6: World Bounds | 1-2 hours | |
| **Total** | **~16 hours** | |

---

## Portfolio Talking Points

**Camera System:**
- "SVG viewBox manipulation for pan/zoom without DOM mutation"
- "Mouse gesture handling with state management separation"
- "Zoom limits and smooth performance with large canvases"
- "Viewport persistence demonstrates localStorage integration"

**Depth & Parallax:**
- "Multi-layer rendering with depth-based blur"
- "Parallax coefficients create sense of space (0.3x to 1.2x)"
- "Camera transform applied differently per layer"
- "z-index sorting for proper render order"

**Environmental System:**
- "5 environmental actor types with SVG templates"
- "Procedural variation for visual diversity"
- "Idle animations add life (swaying plants)"
- "No gameplay effect - purely atmospheric"

**Ambient Effects:**
- "Continuous bubble spawning with lifecycle management"
- "GSAP-driven wobble animation"
- "Event-based cleanup prevents memory leaks"
- "Transparent appearance integrates with ocean theme"

---

## Next Steps

**You're ready for Phase 9: Polish & Launch**

Phase 9 will add:
- Expanded UI panels (robot editor, world settings)
- Save/export/import system
- Mobile touch controls
- Performance profiling and optimization
- GitHub Pages deployment
- README polish and demo video

**Before continuing:**
1. Merge all M5 PRs
2. Update project board (M5 milestone complete)
3. Test complete system end-to-end
4. Take screenshots for portfolio

---

**Questions?** Review camera/parallax docs or open a discussion.

**Ready for launch prep?** Phase 9 takes the working system and makes it production-ready.
