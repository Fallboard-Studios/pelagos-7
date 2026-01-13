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

### Movement Animation

Point-to-point movement with propeller spin and body tilt.

**Pattern:**
```typescript
function createMovementTimeline(robot: Robot, destination: Vec2): gsap.core.Timeline {
  const tl = gsap.timeline({
    onComplete: () => handleArrival(robot.id)
  });
  
  // Main movement
  tl.to(robotRef.current, {
    x: destination.x,
    y: destination.y,
    duration: 5,
    ease: 'power1.inOut'
  });
  
  // Body tilt toward destination
  const angle = Math.atan2(
    destination.y - robot.position.y,
    destination.x - robot.position.x
  ) * (180 / Math.PI);
  
  tl.to(robotRef.current, {
    rotation: angle * 0.15,  // Subtle tilt
    duration: 0.5
  }, 0);  // Start immediately
  
  // Propeller fast spin
  tl.to(propellerRef.current, {
    rotation: '+=360',
    duration: 0.3,
    repeat: -1,
    ease: 'none'
  }, 0);
  
  return tl;
}
```

**Key points:**
- Use `power1.inOut` for natural acceleration/deceleration
- Tilt robot toward destination (10-15% of angle)
- Propeller spins continuously during movement
- Timeline stored in timelineMap, NOT state

---

### Idle Animation

Looping bob and sway for stationary robots.

**Pattern:**
```typescript
function createIdleTimeline(robotRef: RefObject<SVGGElement>): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1 });
  
  // Vertical bob
  tl.to(robotRef.current, {
    y: '+=5',
    duration: 2,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut'
  }, 0);
  
  // Slight rotation
  tl.to(robotRef.current, {
    rotation: '+=3',
    duration: 3,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut'
  }, 0);
  
  // Slow propeller spin
  tl.to(propellerRef.current, {
    rotation: '+=360',
    duration: 2,
    repeat: -1,
    ease: 'none'
  }, 0);
  
  return tl;
}
```

**Key points:**
- Use `sine.inOut` for smooth, organic motion
- Small values (±3-5px, ±2-3°) for subtle effect
- All animations start simultaneously (position `0`)
- Slower propeller (2s vs 0.3s when swimming)

---

### Interaction Burst

Scale pulse and rotation for robot-robot interactions.

**Pattern:**
```typescript
function playInteractionBurst(robotRef: RefObject<SVGGElement>): void {
  gsap.timeline()
    .to(robotRef.current, {
      scale: 1.15,
      duration: 0.2,
      ease: 'back.out(2)'
    })
    .to(robotRef.current, {
      scale: 1,
      duration: 0.2,
      ease: 'back.in(2)'
    })
    .to(robotRef.current, {
      rotation: '+=15',
      duration: 0.1,
      yoyo: true,
      repeat: 1
    }, 0);  // Rotate during scale
}
```

**Key points:**
- Short duration (0.4s total)
- `back` easing for "pop" effect
- Don't store timeline (fire-and-forget)
- Rotation happens simultaneously with scale

---

### Propeller Spin

Continuous rotation with variable speed based on robot state.

**Pattern:**
```typescript
// Note: RobotState defined in src/types/Robot.ts
// Example states: 'idle' | 'moving' | 'interacting'
function updatePropellerSpeed(
  propellerRef: RefObject<SVGGElement>,
  state: RobotState
): void {
  gsap.killTweensOf(propellerRef.current);
  
  const speeds = {
    idle: 2,       // seconds per rotation
    moving: 0.3,
    interacting: 0.15
  };
  
  gsap.to(propellerRef.current, {
    rotation: '+=360',
    duration: speeds[state],
    repeat: -1,
    ease: 'none'
  });
}
```

**Key points:**
- Kill existing tweens before creating new one
- Use `ease: 'none'` for constant rotation speed
- Faster spin = more thrust (swimming/interacting)
- State-driven speed variations

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
Quick reference of animation anti-patterns and their fixes.

### 1. Timeline in State

**❌ Forbidden:**
```typescript
const [timeline, setTimeline] = useState<gsap.core.Timeline>();
```

**Why:** Timelines are not serializable, cause memory leaks, trigger unnecessary re-renders.

**✅ Fix:**
```typescript
// Use timelineMap (outside React state)
setTimeline(robotId, tl);
```

---

### 2. Animation via State Updates

**❌ Forbidden:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setPosition(pos => ({ x: pos.x + 1, y: pos.y }));
  }, 16);
  return () => clearInterval(interval);
}, []);
```

**Why:** Not GPU-accelerated, triggers re-renders, not synchronized with BeatClock.

**✅ Fix:**
```typescript
useGSAP(() => {
  gsap.to(ref.current, { x: '+=100', duration: 2, ease: 'none' });
}, { scope: ref });
```

---

### 3. GSAP Triggering Audio

**❌ Forbidden:**
```typescript
timeline.call(() => AudioEngine.scheduleNote({ robotId, note: 'C4' }));
```

**Why:** Couples animation to audio, violates separation of concerns.

**✅ Fix:** Use semantic callbacks:
```typescript
timeline.to(ref.current, {
  x: 100,
  onComplete: () => onArrival(robotId)  // semantic event
});

// Separate handler triggers audio
function onArrival(robotId: string) {
  updateRobotState(robotId, 'idle');
  AudioEngine.scheduleNote({ robotId, note: 'C4' });
}
```

---

### 4. requestAnimationFrame Loop

**❌ Forbidden:**
```typescript
function animate() {
  updatePosition();
  requestAnimationFrame(animate);
}
```

**Why:** Duplicates GSAP's internal ticker, causes performance issues.

**✅ Fix:** Use GSAP timeline or `gsap.ticker.add()` for custom logic.

---

### 5. No Timeline Cleanup

**❌ Forbidden:**
```typescript
useEffect(() => {
  gsap.to(ref.current, { x: 100, duration: 2 });
  // Missing cleanup!
}, [trigger]);
```

**Why:** Timeline continues after unmount, memory leak, stale refs.

**✅ Fix:**
```typescript
useGSAP(() => {
  const tl = gsap.to(ref.current, { x: 100, duration: 2 });
  return () => tl.kill();
}, { scope: ref });
```

---

### 6. Animating Layout Properties

**❌ Forbidden:**
```typescript
gsap.to(ref.current, { width: 200, height: 100 });
```

**Why:** Triggers layout reflow, not GPU-accelerated, poor performance.

**✅ Fix:** Use `scale` (transform):
```typescript
gsap.to(ref.current, { scale: 2 });
```

---

### 7. Per-Frame Path Updates

**❌ Forbidden:**
```typescript
gsap.ticker.add(() => {
  const newPath = computePath();
  pathRef.current.setAttribute('d', newPath);  // Every frame!
});
```

**Why:** Heavy DOM manipulation, forces layout, kills performance with many robots.

**✅ Fix:** Use CSS transforms for movement, reserve path updates for shape morphing only.

---

## Audit Checklist

Before committing animation code:

- [ ] No timelines in React/Zustand state
- [ ] No `setInterval`/`requestAnimationFrame` for animation
- [ ] No audio calls in GSAP timelines
- [ ] All timelines have cleanup (kill on unmount)
- [ ] Using transforms (`x`, `y`, `rotation`, `scale`), not layout properties
- [ ] useGSAP hook used for React components
- [ ] Timeline references stored in timelineMap
