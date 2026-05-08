# M2: Robot Basics Issues

**Milestone:** M2 - Robot Basics  
**Timeline:** Week 2  
**Goal:** Robots spawn, swim autonomously, and can be selected

---

## M2.0: Setup Vitest Testing Infrastructure

**Title:** [M2.0] Setup Vitest testing infrastructure

**Labels:** testing, chore, size: S, priority: high

### Feature Description
Set up Vitest testing framework and create initial test suite for M1 utilities (BeatClock, harmony system, store).

### Implementation Details
- Install Vitest and testing dependencies
- Create `vitest.config.ts`
- Add test scripts to package.json
- Create `src/engine/beatClock.test.ts` (first test file)
- Create `src/engine/harmonySystem.test.ts`
- Create `src/stores/oceanStore.test.ts`
- Write basic tests for existing utilities

**Test patterns:**
```typescript
describe('BeatClock', () => {
  it('getCurrentBeat returns number', () => {
    const beat = getCurrentBeat();
    expect(typeof beat).toBe('number');
  });
});
```

### Acceptance Criteria
- [ ] Vitest installed and configured
- [ ] `npm test` runs successfully
- [ ] Test files created for BeatClock, harmonySystem, oceanStore
- [ ] At least 3-5 tests passing
- [ ] Tests run in CI (if applicable)
- [ ] Test coverage report available

### Reference
- Vitest docs: https://vitest.dev/
- Docs: `docs/CONTRIBUTION_GUIDE.md#testing`

---

## M2.1: Create Robot SVG Components

**Title:** [M2.1] Create Robot SVG components (unified shapes)

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Create unified robot SVG components where each represents a complete robot with a distinct visual style determined by audio attributes.

### Implementation Details
 - Create `src/components/robot/RobotSleek.tsx` (waveform-driven: smooth, flowing)
 - Create `src/components/robot/RobotAngular.tsx` (waveform-driven: sharp, geometric)
 - Create `src/components/robot/RobotOrganic.tsx` (waveform-driven: rounded, biological)
 - Create `src/components/robot/RobotIndustrial.tsx` (waveform-driven: boxy, mechanical)
- Each receives colors, scale, and detailLevel props
- Propeller element marked for GSAP rotation animation
- Use CSS custom properties for dynamic coloring

**Component pattern:**
```tsx
interface RobotSVGProps {
  colors: { primary: string; secondary: string; accent: string };
  scale: number;
  detailLevel: number; // 0-1, controls decoration complexity
}

export function RobotSleek({ colors, scale, detailLevel }: RobotSVGProps) {
  return (
    <g transform={`scale(${scale})`}>
      <g className="robot-body">
        {/* Main body shape */}
        <ellipse fill={colors.primary} />
        {/* Propeller (animated) */}
        <g className="propeller">
          <ellipse fill={colors.secondary} />
        </g>
        {/* Conditional details based on detailLevel */}
        {detailLevel > 0.5 && <circle fill={colors.accent} />}
      </g>
    </g>
  );
}
```

### Acceptance Criteria
- [ ] 4 robot shape components created (Sleek, Angular, Organic, Industrial)
- [ ] Each represents complete unified robot
- [ ] Props for colors, scale, detailLevel
- [ ] Propeller element identifiable for animation
- [ ] Conditional details based on detailLevel
- [ ] Components render without errors

### Reference
- Docs: `docs/ROBOT_DESIGN.md`

---

## M2.2: Create RobotBody Component

**Title:** [M2.2] Create RobotBody component that selects shape variant

**Labels:** feature, system: ui, size: S, priority: high

### Feature Description
Create a component that selects the appropriate robot shape variant based on audio attributes and calculates visual properties.

### Implementation Details
- Create `src/components/robot/RobotBody.tsx`
- Accept `robot: Robot` prop
- Calculate visual properties from `robot.audioAttributes`:
  - Shape variant from `layeredWave.base` / `waveform` (do not use `synthType`)
  - Colors from ADSR envelope
  - Scale from pitchRange
  - Detail level from filterFreq
- Render appropriate SVG component (RobotSleek, RobotAngular, etc.)
- Use refs for GSAP animation targets
- Create src/components/robot/robotVisualHelpers.test.ts (or whatever file name is appropriate)

**Structure:**
```tsx
export function RobotBody({ robot }: { robot: Robot }) {
  const visual = useMemo(() => {
    const { layeredWave, waveform, adsr, pitchRange, filterFreq } = robot.audioAttributes;
    const base = layeredWave?.base ?? waveform;
    return {
      Component: selectRobotShape(base),  // Returns RobotSleek, etc.
      colors: generateColors(adsr),
      scale: calculateScale(pitchRange),
      detailLevel: calculateDetailLevel(filterFreq),
    };
  }, [robot.audioAttributes]);
  
  const { Component, colors, scale, detailLevel } = visual;
  
  return (
    <Component 
      colors={colors} 
      scale={scale} 
      detailLevel={detailLevel} 
    />
  );
}
```

### Acceptance Criteria
- [ ] RobotBody component created
- [ ] Calculates visuals from audioAttributes
- [ ] Selects correct shape variant (Sleek/Angular/Organic/Industrial)
- [ ] Applies calculated colors, scale, detail level
- [ ] Component renders complete robot
- [ ] Visual properties memoized for performance
- [ ] Unit tests for visual mapping helpers (selectRobotShape, generateColors, calculateScale, calculateDetailLevel)

### Reference
- Docs: `docs/ROBOT_DESIGN.md`

---

## M2.3: Create Robot Component

**Title:** [M2] Create Robot component with position and selection

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Create the main Robot component that handles positioning, selection state, and click interactions.

### Implementation Details
- Create `src/components/robot/Robot.tsx`
- Accept `robot: Robot` prop
- Apply transform for position (robot.position)
- Handle click for selection (dispatch to store)
- Apply visual feedback for selected state (outline, glow)
- Create ref for GSAP animations
- Store ref in refs utility

**Component:**
```tsx
export function Robot({ robot }: { robot: Robot }) {
  const ref = useRef<SVGGElement>(null);
  const selectedId = useOceanStore(s => s.selectedRobotId);
  const isSelected = selectedId === robot.id;
  
  useEffect(() => {
    if (ref.current) {
      setRef(`robot-${robot.id}`, ref.current);
    }
  }, [robot.id]);
  
  return (
    <g 
      ref={ref}
      transform={`translate(${robot.position.x}, ${robot.position.y})`}
      className={isSelected ? 'robot selected' : 'robot'}
      onClick={() => handleSelect(robot.id)}
    >
      <RobotBody robot={robot} />
    </g>
  );
}
```

### Acceptance Criteria
- [ ] Robot component created
- [ ] Positioned using transform
- [ ] Click selects robot (updates store)
- [ ] Visual feedback for selection
- [ ] Ref stored for GSAP access
- [ ] No console errors on click

### Reference
- Oceanic: `src/components/fish/Fish.tsx`

---

## M2.4: Implement Robot Spawning System

**Title:** [M2] Implement robot spawning system

**Labels:** feature, system: state, size: L, priority: high

### Feature Description
Create the spawning system that generates new robots with randomized attributes and adds them to the scene.

### Implementation Details
- Create `src/systems/spawnSystem.ts`
- Implement `spawnRobot()` function
- Generate random position (near edges)
- Generate random SVG parts (variants)
- Generate random audio attributes (synth type, ADSR, pitch range)
- Generate melody using melodyGenerator
- Add to oceanStore
- Enforce MAX_ROBOTS limit
- Create src/systems/spawnSystem.test.ts for attribute generation and limit enforcement

**Spawning logic:**
```typescript
export function spawnRobot(): void {
  const { robots, maxRobots } = useOceanStore.getState();
  if (robots.length >= maxRobots) return;
  
  const robot: Robot = {
    id: crypto.randomUUID(),
    state: 'idle',
    position: generateSpawnPosition(),
    destination: null,
    melody: generateMelodyForRobot(),
    audioAttributes: generateAudioAttributes(),
    svgParts: generateSVGParts(),
  };
  
  useOceanStore.getState().addRobot(robot);
  AudioEngine.registerRobotMelody(robot.id, robot.melody);
}
```

### Acceptance Criteria
- [ ] spawnRobot() function implemented
- [ ] Generates complete Robot object
- [ ] Random attribute generation
- [ ] Adds to store correctly
- [ ] Registers melody with AudioEngine
- [ ] Respects MAX_ROBOTS limit
- [ ] Can spawn multiple robots
- [ ] Unit tests for generateSpawnPosition, generateAudioAttributes, and MAX_ROBOTS limit

### Reference
- Oceanic: `src/systems/spawnSystem.ts`

---

## M2.5: Implement GSAP Swim Animation

**Title:** [M2] Implement GSAP swim animation (point-to-point)

**Labels:** feature, system: animation, size: L, priority: high

### Feature Description
Create GSAP-based swim animation that moves robots from current position to destination with natural motion.

### Implementation Details
- Create `src/animation/swimAnimation.ts`
- Implement `createSwimTimeline(robot: Robot, destination: Vec2)` function
- Use GSAP timeline with multiple tweens
- Movement tween (position change with ease)
- Propeller rotation (continuous loop)
- Slight body tilt during movement
- Kill old timeline before creating new one
- Store timeline in timelineMap

**Animation pattern:**
```typescript
export function createSwimTimeline(robot: Robot, destination: Vec2): gsap.core.Timeline {
  const ref = getRef(`robot-${robot.id}`);
  if (!ref) return gsap.timeline();
  
  // Kill existing timeline
  killTimeline(`swim-${robot.id}`);
  
  const duration = calculateDuration(robot.position, destination);
  const tl = gsap.timeline({
    onComplete: () => handleArrival(robot.id),
  });
  
  tl.to(ref, {
    x: destination.x,
    y: destination.y,
    duration,
    ease: 'sine.inOut',
  });
  
  tl.to(ref, {
    rotation: '+=360',
    duration: 2,
    repeat: -1,
    ease: 'none',
  }, 0); // Propeller loop
  
  setTimeline(`swim-${robot.id}`, tl);
  return tl;
}
```

### Acceptance Criteria
- [ ] createSwimTimeline() function works
- [ ] Robots move smoothly to destination
- [ ] Propeller rotates during movement
- [ ] Natural easing applied
- [ ] Timeline stored in timelineMap
- [ ] Old timeline killed before new one
- [ ] onComplete triggers arrival handler

### Reference
- Oceanic: `src/animation/swimAnimation.ts`
- Docs: `docs/ANIMATION_SYSTEM.md`

---

## M2.6: Implement Idle State and Destination Picking

**Title:** [M2] Implement idle state and destination picking

**Labels:** feature, system: state, size: M, priority: high

### Feature Description
Implement the idle behavior system where robots pick random destinations and swim to them autonomously.

### Implementation Details
- Create `src/systems/idleSystem.ts`
- Implement `pickDestination(robot: Robot)` function
- Generate random point within world bounds
- Update robot state to 'swimming'
- Update destination in store
- Trigger swim animation
- On arrival: return to idle, pick new destination after delay

**Idle loop:**
```typescript
export function handleRobotIdle(robotId: string): void {
  const robot = useOceanStore.getState().getRobotById(robotId);
  if (!robot || robot.state !== 'idle') return;
  
  const destination = pickRandomDestination();
  
  useOceanStore.getState().updateRobot(robotId, {
    state: 'swimming',
    destination,
  });
  
  createSwimTimeline(robot, destination);
}

export function handleRobotArrival(robotId: string): void {
  useOceanStore.getState().updateRobot(robotId, {
    state: 'idle',
    destination: null,
  });
  
  // Pick new destination after short delay — use GSAP delayedCall (stored so it can be cancelled)
  // Example runtime uses `IDLE_DELAY` and stores the tween in `pendingIdleDelays`.
  const delayTween = gsap.delayedCall(IDLE_DELAY, () => handleRobotIdle(robotId));
  pendingIdleDelays.set(robotId, delayTween);
}
```

### Acceptance Criteria
- [ ] pickDestination() generates valid points
- [ ] Robots enter swimming state
- [ ] Swim animation triggered
- [ ] Arrival transitions back to idle
- [ ] New destination picked after delay
- [ ] Robots move autonomously
- [ ] No infinite loops or errors
- [ ] Unit test for pickDestination (validates within world bounds)

### Reference
- Oceanic: `src/systems/idleSystem.ts`

---

## M2.7: Integrate Robots into OceanScene

**Title:** [M2] Integrate robots into OceanScene component

**Labels:** feature, system: ui, size: S, priority: medium

### Feature Description
Render all robots from store in the OceanScene component.

### Implementation Details
- Update `src/components/OceanScene.tsx`
- Subscribe to oceanStore robots array
- Map over robots and render Robot components
- Place in robot-layer group
- Add initial spawn on mount (2-3 robots)

**Rendering:**
```tsx
export function OceanScene() {
  const robots = useOceanStore(s => s.robots);
  
  useEffect(() => {
    // Spawn initial robots
    spawnRobot();
    spawnRobot();
  }, []);
  
  return (
    <svg viewBox="0 0 1920 1080" className="ocean-scene">
      <rect fill="#0a1128" width="1920" height="1080" />
      <g id="background-layer" />
      <g id="robot-layer">
        {robots.map(robot => (
          <Robot key={robot.id} robot={robot} />
        ))}
      </g>
      <g id="foreground-layer" />
      <g id="ui-layer" />
    </svg>
  );
}
```

### Acceptance Criteria
- [ ] Robots rendered from store
- [ ] Initial robots spawn on mount
- [ ] Robots appear in correct layer
- [ ] Robots update when store changes
- [ ] No duplicate keys warning
- [ ] Scene renders all robots

### Reference
- Oceanic: `src/components/OceanScene.tsx`
