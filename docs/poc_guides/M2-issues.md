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

**Title:** [M2.1] Create Robot SVG components (chassis, head, propeller, antennae)

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Create individual SVG components for robot parts that can be composed into complete robots.

### Implementation Details
- Create `src/components/robot/RobotChassis.tsx`
- Create `src/components/robot/RobotHead.tsx`
- Create `src/components/robot/RobotPropeller.tsx`
- Create `src/components/robot/RobotAntenna.tsx` (top and bottom variants)
- Each component receives color/style props
- Use `<g>` tags for CSS class application
- Create 2-3 variants per part for visual variety

**Component pattern:**
```tsx
interface RobotChassisProps {
  variant: 'box' | 'cylinder' | 'sphere';
  colorClass?: string;
}

export function RobotChassis({ variant, colorClass }: RobotChassisProps) {
  return <g className={colorClass}>{/* SVG paths */}</g>;
}
```

### Acceptance Criteria
- [ ] 5 component files created (chassis, head, propeller, 2 antennae)
- [ ] Each component has 2-3 variants
- [ ] Props for variant selection and color classes
- [ ] SVGs properly grouped in `<g>` tags
- [ ] No hardcoded colors (use CSS classes)
- [ ] Components render without errors

### Reference
- Oceanic: `src/components/fish/` (adapt fish parts to robot aesthetic)
- Docs: `docs/ROBOT_DESIGN.md`

---

## M2.2: Create RobotBody Component

**Title:** [M2.2] Create RobotBody component that assembles parts

**Labels:** feature, system: ui, size: S, priority: high

### Feature Description
Create a component that assembles individual robot parts into a complete robot based on Robot data.

### Implementation Details
- Create `src/components/robot/RobotBody.tsx`
- Accept `robot: Robot` prop
- Read `robot.svgParts` to determine which variants to render
- Position parts relative to each other (propeller behind chassis, head on top, etc.)
- Apply color classes based on `robot.audioAttributes`
- Use refs for GSAP animation targets

**Structure:**
```tsx
export function RobotBody({ robot }: { robot: Robot }) {
  return (
    <g className="robot-body">
      <RobotPropeller variant={robot.svgParts.propeller} />
      <RobotChassis variant={robot.svgParts.chassis} colorClass="body-color" />
      <RobotHead variant={robot.svgParts.head} colorClass="head-color" />
      <RobotAntenna variant={robot.svgParts.topAntenna} position="top" />
      <RobotAntenna variant={robot.svgParts.bottomAntenna} position="bottom" />
    </g>
  );
}
```

### Acceptance Criteria
- [ ] RobotBody component created
- [ ] Assembles 5 robot parts
- [ ] Reads svgParts from Robot data
- [ ] Applies colors based on audioAttributes
- [ ] Parts positioned correctly relative to each other
- [ ] Component renders complete robot

### Reference
- Oceanic: `src/components/fish/FishBody.tsx`

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
  
  // Pick new destination after short delay
  setTimeout(() => handleRobotIdle(robotId), 1000);
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
