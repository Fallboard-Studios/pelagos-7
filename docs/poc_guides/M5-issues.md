# M5: Environment & Actors Issues

**Milestone:** M5 - Environment & Actors  
**Timeline:** Week 5  
**Goal:** Rich underwater world with factories and environmental detail

---

## M5.1: Create Factory Actor Type and Components

**Title:** [M5.1] Create Factory actor type and SVG components

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Create the Factory actor type and SVG components for rendering stationary factory structures that spawn robots.

### Implementation Details
- Create `src/types/Actor.ts`
- Define `Actor` interface (id, type, position, production cooldown)
- Define `ActorType` enum (factory, ruin, machinery, scrap)
- Create `src/components/actors/Factory.tsx`
- Design industrial SVG (pipes, tanks, mechanical elements)
- Add 2-3 factory variants for visual variety

**Actor types:**
```typescript
export enum ActorType {
  Factory = 'factory',
  Ruin = 'ruin',
  Machinery = 'machinery',
  Scrap = 'scrap',
}

export interface Actor {
  id: string;
  type: ActorType;
  position: Vec2;
  variant: string;
  // Factory-specific
  productionCooldown?: number;  // measures until next spawn
  lastSpawnMeasure?: number;
}
```

**Factory component:**
```tsx
interface FactoryProps {
  actor: Actor;
}

export function Factory({ actor }: FactoryProps) {
  return (
    <g transform={`translate(${actor.position.x}, ${actor.position.y})`}>
      {actor.variant === 'pipes' && <FactoryPipes />}
      {actor.variant === 'tanks' && <FactoryTanks />}
      {actor.variant === 'mechanical' && <FactoryMechanical />}
    </g>
  );
}
```

### Acceptance Criteria
- [ ] Actor type defined with all fields
- [ ] ActorType enum created
- [ ] Factory component renders 2-3 variants
- [ ] SVG has industrial aesthetic
- [ ] Factory scales appropriately
- [ ] Factory added to oceanStore

### Reference
- Oceanic: `src/types/Actor.ts`, `src/components/actors/Factory.tsx`

---

## M5.2: Implement Factory Robot Spawning System

**Title:** [M5.2] Implement factory robot spawning on measure timers

**Labels:** feature, system: state, size: L, priority: high

### Feature Description
Implement the factory spawning system that produces robots at measure-based intervals.

### Implementation Details
- Create `src/systems/factorySystem.ts`
- Implement `scheduleFactoryProduction()` function
- Use BeatClock.scheduleRepeat for timing (not setInterval)
- Default production interval: 60 measures (15 "hours")
- Spawn robot at factory position with exit animation
- Enforce MAX_ROBOTS limit

**Factory production:**
```typescript
const PRODUCTION_INTERVAL = 60;  // 60 measures

export function startFactoryProduction(factoryId: string): void {
  const factory = useOceanStore.getState().getActorById(factoryId);
  if (!factory || factory.type !== ActorType.Factory) return;
  
  // Schedule repeating production
  BeatClock.scheduleRepeat(`${PRODUCTION_INTERVAL}m`, () => {
    const { robots, maxRobots } = useOceanStore.getState();
    if (robots.length >= maxRobots) {
      if (DEV_TUNING) console.log(`[Factory] Max robots reached`);
      return;
    }
    
    // Spawn robot at factory position
    const robot = createRobotFromFactory(factory);
    useOceanStore.getState().addRobot(robot);
    AudioEngine.registerRobotMelody(robot.id, robot.melody);
    
    // Play spawn animation
    playFactorySpawnAnimation(factoryId, robot.id);
    
    if (DEV_TUNING) {
      console.log(`[Factory] Robot ${robot.id} spawned from ${factoryId}`);
    }
  });
}

function createRobotFromFactory(factory: Actor): Robot {
  return {
    id: crypto.randomUUID(),
    state: 'idle',
    position: { ...factory.position },  // Start at factory
    destination: null,
    melody: generateMelodyForRobot(),
    audioAttributes: generateAudioAttributes(),
    svgParts: generateSVGParts(),
  };
}
```

### Acceptance Criteria
- [ ] Factory spawns robots every 60 measures
- [ ] BeatClock used (not setInterval)
- [ ] Spawning respects MAX_ROBOTS limit
- [ ] Robot starts at factory position
- [ ] Spawn animation plays
- [ ] Multiple factories work independently

### Reference
- Docs: `docs/BEAT_CLOCK.md#usage-patterns`

---

## M5.3: Create Environmental Actor Components

**Title:** [M5] Create environmental actor components (ruins, machinery, scrap)

**Labels:** feature, system: ui, size: M, priority: medium

### Feature Description
Create SVG components for non-interactive environmental actors that add visual richness to the scene.

### Implementation Details
- Create `src/components/actors/Ruin.tsx`
- Create `src/components/actors/Machinery.tsx`
- Create `src/components/actors/Scrap.tsx`
- 2-3 variants per actor type
- Post-apocalyptic aesthetic (rusted, broken, barnacles)
- Various sizes for depth layering

**Environmental actors:**
```tsx
export function Ruin({ actor }: ActorProps) {
  return (
    <g transform={`translate(${actor.position.x}, ${actor.position.y})`}>
      {actor.variant === 'building' && <RuinBuilding />}
      {actor.variant === 'tower' && <RuinTower />}
      {actor.variant === 'wreck' && <RuinWreck />}
    </g>
  );
}

export function Machinery({ actor }: ActorProps) {
  return (
    <g transform={`translate(${actor.position.x}, ${actor.position.y})`}>
      {actor.variant === 'gears' && <MachineryGears />}
      {actor.variant === 'pipes' && <MachineryPipes />}
    </g>
  );
}

export function Scrap({ actor }: ActorProps) {
  return (
    <g transform={`translate(${actor.position.x}, ${actor.position.y})`}>
      {actor.variant === 'debris' && <ScrapDebris />}
      {actor.variant === 'parts' && <ScrapParts />}
    </g>
  );
}
```

### Acceptance Criteria
- [ ] 3 actor types created (ruin, machinery, scrap)
- [ ] 2-3 variants per type
- [ ] Post-apocalyptic aesthetic
- [ ] Various sizes available
- [ ] All render without errors

### Reference
- Oceanic: `src/components/actors/` folder

---

## M5.4: Implement Procedural Actor Placement

**Title:** [M5] Implement procedural environmental actor placement

**Labels:** feature, system: state, size: M, priority: medium

### Feature Description
Create a system that procedurally places environmental actors throughout the world on initialization.

### Implementation Details
- Create `src/systems/actorPlacementSystem.ts`
- Implement `placeEnvironmentalActors()` function
- Place 10-20 actors randomly
- Avoid overlap with spawn zones
- Mix of actor types (60% ruins, 30% machinery, 10% scrap)
- Place 1-2 factories at edges

**Placement logic:**
```typescript
const WORLD_BOUNDS = { width: 1920, height: 1080 };

export function placeEnvironmentalActors(): void {
  const actors: Actor[] = [];
  
  // Place 1-2 factories at edges
  actors.push(createFactory({ x: 200, y: 540 }));
  actors.push(createFactory({ x: 1720, y: 540 }));
  
  // Place 10-15 ruins
  for (let i = 0; i < 12; i++) {
    actors.push(createRuin(randomPosition()));
  }
  
  // Place 5-8 machinery
  for (let i = 0; i < 6; i++) {
    actors.push(createMachinery(randomPosition()));
  }
  
  // Place 2-3 scrap piles
  for (let i = 0; i < 3; i++) {
    actors.push(createScrap(randomPosition()));
  }
  
  // Add all to store
  useOceanStore.getState().setActors(actors);
}

function randomPosition(): Vec2 {
  return {
    x: Math.random() * WORLD_BOUNDS.width,
    y: Math.random() * WORLD_BOUNDS.height,
  };
}

function createFactory(position: Vec2): Actor {
  return {
    id: crypto.randomUUID(),
    type: ActorType.Factory,
    position,
    variant: randomChoice(['pipes', 'tanks', 'mechanical']),
    productionCooldown: PRODUCTION_INTERVAL,
    lastSpawnMeasure: 0,
  };
}
```

### Acceptance Criteria
- [ ] 10-20 actors placed on init
- [ ] Random positions used
- [ ] Mix of actor types
- [ ] 1-2 factories at edges
- [ ] No overlap with spawn zones
- [ ] Actors added to store

### Reference
- Similar to Oceanic food placement system

---

## M5.5: Implement Camera Pan/Zoom System

**Title:** [M5] Implement camera pan/zoom system

**Labels:** feature, system: ui, size: L, priority: high

### Feature Description
Implement camera controls that allow panning and zooming the scene (mouse drag + wheel, touch gestures).

### Implementation Details
- Create `src/systems/cameraSystem.ts`
- Track camera state (x, y, zoom) in oceanStore
- Mouse drag to pan
- Mouse wheel to zoom (0.5x - 2.0x range)
- Touch gestures (pinch to zoom, drag to pan)
- Apply transform to SVG viewBox

**Camera implementation:**
```typescript
interface CameraState {
  x: number;
  y: number;
  zoom: number;  // 0.5 - 2.0
}

export function useCameraControls(svgRef: RefObject<SVGSVGElement>) {
  const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1.0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(2.0, prev.zoom * delta)),
    }));
  };
  
  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setCamera(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  return { camera, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp };
}
```

### Acceptance Criteria
- [ ] Mouse drag pans camera
- [ ] Mouse wheel zooms (0.5x - 2.0x)
- [ ] Touch drag pans
- [ ] Touch pinch zooms
- [ ] Smooth camera movement
- [ ] Camera state in store

### Reference
- Standard SVG camera controls

---

## M5.6: Implement Depth Layers with Parallax

**Title:** [M5] Implement depth layers with parallax scrolling

**Labels:** feature, system: animation, size: M, priority: medium

### Feature Description
Create depth layers (background, midground, foreground) with parallax effect based on camera movement.

### Implementation Details
- Create 3 SVG layer groups (background, midground, foreground)
- Place actors in appropriate layers based on size
- Apply parallax multiplier to each layer (0.3x, 0.6x, 1.0x)
- Update layer transforms when camera moves

**Parallax system:**
```tsx
export function OceanScene() {
  const { camera } = useCameraControls();
  const robots = useOceanStore(s => s.robots);
  const actors = useOceanStore(s => s.actors);
  
  const backgroundActors = actors.filter(a => a.depth === 'background');
  const midgroundActors = actors.filter(a => a.depth === 'midground');
  const foregroundActors = actors.filter(a => a.depth === 'foreground');
  
  return (
    <svg viewBox="0 0 1920 1080" className="ocean-scene">
      <rect fill="#0a1128" width="1920" height="1080" />
      
      {/* Background layer - slowest parallax */}
      <g transform={`translate(${camera.x * 0.3}, ${camera.y * 0.3})`}>
        {backgroundActors.map(actor => <Actor key={actor.id} actor={actor} />)}
      </g>
      
      {/* Midground layer - medium parallax */}
      <g transform={`translate(${camera.x * 0.6}, ${camera.y * 0.6})`}>
        {midgroundActors.map(actor => <Actor key={actor.id} actor={actor} />)}
      </g>
      
      {/* Foreground layer - full movement (robots) */}
      <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`}>
        {robots.map(robot => <Robot key={robot.id} robot={robot} />)}
        {foregroundActors.map(actor => <Actor key={actor.id} actor={actor} />)}
      </g>
      
      <g id="ui-layer" />
    </svg>
  );
}
```

### Acceptance Criteria
- [ ] 3 depth layers created
- [ ] Parallax multipliers applied (0.3x, 0.6x, 1.0x)
- [ ] Actors assigned to layers
- [ ] Parallax effect visible when panning
- [ ] Depth creates visual richness
- [ ] Performance maintained (60 FPS)

### Reference
- Standard parallax scrolling technique

---

## M5.7: Add Factory Spawn Animation

**Title:** [M5] Add factory spawn animation for robots

**Labels:** feature, system: animation, size: S, priority: medium

### Feature Description
Create a spawn animation that plays when a factory produces a robot (scale up, move away from factory).

### Implementation Details
- Create `src/animation/factorySpawnAnimation.ts`
- Robot starts at factory position, scaled to 0
- Scale up (0 → 1.0) with elastic ease
- Move to random nearby position
- Play "puff of steam" effect (optional)

**Spawn animation:**
```typescript
export function playFactorySpawnAnimation(factoryId: string, robotId: string): void {
  const robotRef = getRef(`robot-${robotId}`);
  if (!robotRef) return;
  
  const tl = gsap.timeline();
  
  // Start invisible
  gsap.set(robotRef, { scale: 0 });
  
  // Scale up with elastic
  tl.to(robotRef, {
    scale: 1.0,
    duration: 0.8,
    ease: 'elastic.out(1, 0.5)',
  });
  
  // Move away from factory
  const exitPosition = calculateExitPosition(factoryId);
  tl.to(robotRef, {
    x: exitPosition.x,
    y: exitPosition.y,
    duration: 1.5,
    ease: 'sine.out',
  }, 0.3);
  
  setTimeline(`spawn-${robotId}`, tl);
}
```

### Acceptance Criteria
- [ ] Robot scales from 0 to 1.0
- [ ] Elastic ease applied
- [ ] Robot moves away from factory
- [ ] Animation completes in ~1.5s
- [ ] Visually satisfying feedback
- [ ] Timeline cleanup on complete

### Reference
- Similar to spawn animations in other games

---

## M5.8: Test Environment & Actors System

**Title:** [M5] Test environment and actors system end-to-end

**Labels:** testing, system: ui, size: M, priority: high

### Feature Description
Comprehensive testing of the environment system including factories, actors, camera, and parallax.

### Implementation Details
- Manual test: Factories spawn robots every 60 measures
- Manual test: Camera pan/zoom works smoothly
- Manual test: Parallax effect visible
- Manual test: Environmental actors render correctly
- Manual test: Multiple factories work independently
- Check performance with 20+ actors

**Test checklist:**
```markdown
- [ ] 1-2 factories placed at edges
- [ ] Factories spawn robots every 60 measures
- [ ] MAX_ROBOTS limit prevents overflow
- [ ] 10-20 environmental actors placed
- [ ] Actors have visual variety
- [ ] Camera drag pans scene
- [ ] Mouse wheel zooms (0.5x - 2.0x)
- [ ] Touch gestures work on mobile
- [ ] Parallax layers move at different rates
- [ ] Factory spawn animation plays
- [ ] Performance maintained (60 FPS)
- [ ] No console errors
```

### Acceptance Criteria
- [ ] All manual tests pass
- [ ] Factory spawning reliable
- [ ] Camera controls smooth
- [ ] Parallax effect works
- [ ] Performance maintained (60 FPS)
- [ ] No errors or memory leaks

### Reference
- End-to-end system validation
