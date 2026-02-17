---
name: how-animate
description: Learn how to animate robot movement correctly in this codebase
agent: ask
tools:
  - read_file
  - grep_search
---

What's the correct way to animate a robot ${input:action:moving to a new position} while ${input:audioAction:playing a melody}?

Show me the separation between GSAP animation and audio scheduling based on our architecture.

## Architecture Overview

Pelagos-7 enforces strict separation:
- **GSAP**: ALL visual animation and motion
- **AudioEngine**: ALL audio scheduling
- **BeatClock**: Musical timing for both (but they don't call each other)
- **Zustand**: State is data only (no timelines, no synths)

Reference [copilot-instructions.md](../../.github/copilot-instructions.md) animation section.

## Correct Pattern: Robot Movement

```typescript
import { useGSAP } from '@gsap/react';
import type { Robot } from '../types/Robot';

function RobotComponent({ robot }: { robot: Robot }) {
  const ref = useRef<SVGGElement>(null);
  
  // Animation (GSAP)
  useGSAP(() => {
    const tl = gsap.timeline({
      onComplete: () => onArrivalAt(robot.id, destination), // Semantic event only
    });
    
    tl.to(ref.current, {
      x: destination.x,
      y: destination.y,
      duration: 3,
      ease: 'power2.inOut',
    });
    
    // Store timeline (for pause/kill later)
    setTimeline(robot.id, tl);
    
    return () => {
      tl.kill(); // Cleanup
      removeTimeline(robot.id);
    };
  }, [robot.destination]);
  
  return <g ref={ref}>{/* robot SVG */}</g>;
}

// Separate handler (not in GSAP callback)
function onArrivalAt(robotId: string, position: Vec2) {
  // Update state
  updateRobotState(robotId, 'idle');
  
  // Trigger audio (separate system)
  AudioEngine.scheduleNote({
    robotId,
    note: 'C4',
    duration: '8n',
  });
}
```

## Key Points

1. **GSAP timeline controls animation** (position, rotation, scale)
2. **Timeline stored in timelineMap**, NOT state
3. **Use useGSAP hook** for React components
4. **Callbacks are semantic events only** (arrival, collision, interaction)
5. **Audio scheduled separately** via AudioEngine
6. **No audio calls inside timeline** (no `timeline.call(() => AudioEngine...))`)

## What NOT To Do

```typescript
// ❌ WRONG: Timeline in state
const [timeline, setTimeline] = useState<Timeline>();

// ❌ WRONG: Audio in GSAP callback
timeline.call(() => AudioEngine.scheduleNote(...));

// ❌ WRONG: Position in state
const [x, setX] = useState(0);
gsap.to(x, { duration: 1, onUpdate: () => setX(...) }); // NO!

// ❌ WRONG: Animation loop
useEffect(() => {
  function animate() {
    setPosition(prev => ({ x: prev.x + 1, y: prev.y }));
    requestAnimationFrame(animate);
  }
  animate();
}, []);
```

## Examples from Codebase

Search for existing patterns:
- Robot movement timelines
- Propeller animation loops
- Interaction animations

Show relevant code examples from #file:src/components/ and explain the correct approach.
