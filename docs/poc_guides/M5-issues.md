# M5: Environment & Actors Issues

**Milestone:** M5 - Environment & Actors  
**Timeline:** Week 5  
**Goal:** Rich underwater world with factories and environmental detail

---

## M5.1: Create Factory Actor Type and Components

**Title:** [M5.1] Create Factory actor type and SVG components

**Labels:** feature, system: ui, size: M, priority: high

### Feature Description
Create the Factory actor type and SVG components for rendering stationary factory structures that spawn robots. Factories are **massive silhouette-based structures** placed along the ocean floor, rendered behind robots in the background layer. Use Alea + Simplex Noise for deterministic variety.

### Implementation Details
- Create `src/types/Actor.ts`
- Define `Actor` interface (id, type, position, scale, rotation, cooldownRemaining)
- Define `ActorType` enum (FACTORY only - variants determined by noise)
- Create `src/components/actors/Factory.tsx`
- Use Alea for deterministic seeding (from actor.id)
- Use Simplex Noise to determine silhouette variant
- Three silhouette variants: Monolith, Spire, Refinery
- Each factory is primarily a single `<path>` element
- 1-3 interior cutouts maximum (windows/vents for lights)
- Colors from `src/constants/colorTheme.json`
- Strictly 90°/45° angles, fills only (no strokes)

**Actor types:**
```typescript
export enum ActorType {
  FACTORY = 'FACTORY',
}

export interface Actor {
  id: string;                    // Used as procedural generation seed
  type: ActorType;
  position: { x: number; y: number };
  rotation?: number;
  scale?: number;
  isActive: boolean;
  cooldownRemaining: number;     // Measures until next activation
  config?: {
    robotBlueprint?: string;
    productionInterval?: number;
  };
}
```

**Factory component:**
```tsx
import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

interface FactoryProps {
  actor: Actor;
}

export const Factory: React.FC<FactoryProps> = ({ actor }) => {
  // Procedurally generate silhouette from actor.id seed
  const config = useMemo(() => {
    const prng = Alea(actor.id);
    const noise2D = createNoise2D(prng);
    const noiseValue = noise2D(actor.position.x / 100, 0);
    
    // Determine variant from noise value
    let variant: 'Monolith' | 'Spire' | 'Refinery';
    if (noiseValue < -0.4) variant = 'Monolith';
    else if (noiseValue < 0.3) variant = 'Spire';
    else variant = 'Refinery';
    
    // Simple size variation
    const scale = 0.8 + prng() * 0.4; // 0.8-1.2x scale variation
    
    return { variant, scale, noiseValue };
  }, [actor.id]);
  
  return (
    <g transform={`translate(${actor.position.x}, ${actor.position.y}) scale(${config.scale})`}>
      {/* Render silhouette variant */}
      {config.variant === 'Monolith' && <MonolithSilhouette />}
      {config.variant === 'Spire' && <SpireSilhouette />}
      {config.variant === 'Refinery' && <RefinerySilhouette />}
    </g>
  );
};
```

### Acceptance Criteria
- [ ] Actor type defined with id, type, position, scale, rotation, cooldownRemaining
- [ ] ActorType enum created (FACTORY only)
- [ ] Factory component uses Alea + Simplex Noise for deterministic generation
- [ ] Three silhouette variants generated (Monolith, Spire, Refinery)
- [ ] Each factory is primarily a single `<path>` element
- [ ] 1-3 interior cutouts maximum for window/vent lights
- [ ] Industrial aesthetic with strict 90°/45° angles, fills only
- [ ] Silhouette-based design (solid fills, minimal interior complexity)
- [ ] Static rendering (no animations yet)
- [ ] Factories render in background layer (behind robots)
- [ ] Factory added to oceanStore *(needs M5.4)*

### Reference
- Design doc: `docs/BUILDING_DESIGN.md`
- Color palette: `src/constants/colorTheme.json`
- Implementation: `src/components/actors/Factory.tsx`, `src/types/Actor.ts`

---

## M5.2: Implement Factory Robot Spawning System

**Title:** [M5.2] Implement factory robot spawning on measure timers

**Labels:** feature, system: state, size: L, priority: high

### Feature Description
Implement the factory spawning system that produces robots at measure-based intervals. **Robots spawn behind factory silhouettes** (background layer) for 4 measures, then move to the foreground layer with other robots.

### Implementation Details
- Create `src/systems/factorySystem.ts`
- Implement `scheduleFactoryProduction()` function
- Use BeatClock.scheduleRepeat for timing (not setInterval)
- Default production interval: 60 measures (15 "hours")
- Spawn robot at factory position with exit animation
- Robot spawns in background layer (behind factory silhouettes)
- After 4 measures, robot moves to foreground layer
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
    
    // Spawn robot at factory position (in background layer initially)
    const robot = createRobotFromFactory(factory);
    robot.layer = 'background'; // Start behind factory silhouette
    useOceanStore.getState().addRobot(robot);
    AudioEngine.registerRobotMelody(robot.id, robot.melody);
    
    // Play spawn animation (includes 4-measure layer transition)
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
    // Visual appearance derived from audioAttributes
  };
}
```

### Acceptance Criteria
- [ ] Factory spawns robots every 60 measures
- [ ] BeatClock used (not setInterval)
- [ ] Spawning respects MAX_ROBOTS limit
- [ ] Robot starts at factory position
- [ ] Robot spawns in background layer (behind factories)
- [ ] After 4 measures, robot moves to foreground layer
- [ ] Spawn animation plays
- [ ] Multiple factories work independently

### Reference
- Docs: `docs/BEAT_CLOCK.md#usage-patterns`

---

## M5.3: Implement Factory Placement

**Title:** [M5.3] Implement factory placement along ocean floor

**Labels:** feature, system: state, size: S, priority: medium

### Feature Description
Create a system that places factories along the ocean floor on initialization. **Factories are placed along the ocean floor** (bottom of viewport) in the background layer, behind robots.

### Implementation Details
- Create `src/systems/factoryPlacementSystem.ts`
- Implement `placeFactories()` function
### Implementation Details
- Create `src/systems/factoryPlacementSystem.ts`
- Implement `placeFactories()` function
- Place factories in multiple depth rows using a row configuration (`FACTORY_ROWS`). Each row defines a `y` position, a `spreadType` ("edges" | "full" | "center"), and `factoriesPerRow` to control density. Placement is deterministic per-actor via seeded noise and variant selection.
- Factories render in background/midground/foreground layers according to row metadata and are added to the store with `cooldownRemaining` initialized to the configured `PRODUCTION_INTERVAL`.

**Placement details (runtime):**

- Uses `WORLD_BOUNDS` and a `FACTORY_ROWS: FactoryRowConfig[]` table to express row layout and density.
- `spreadType` semantics:
  - `edges` — place factories along left/right edge bands (edge width configurable per-row).
  - `full`  — spread across the full width with a `factoriesPerRow` cap.
  - `center` — constrain placement to a centered segment (configurable `centerWidth`).
- Each placed factory is created with `createFactory(position, rowIndex)` which:
  - derives a visual `variant` and deterministic `noiseValue` from the factory `id` and position,
  - computes silhouette size with `calcSilhouetteSize` and applies a small random scale (0.9–1.1),
  - sets `config.productionInterval = PRODUCTION_INTERVAL` and `cooldownRemaining = PRODUCTION_INTERVAL` on the actor.

The `placeFactories()` implementation iterates `FACTORY_ROWS`, fills each row according to its `spreadType` and `factoriesPerRow`, computes per-actor widths to avoid overlap, and finally calls `useOceanStore.getState().setActors(actors)`.

### Acceptance Criteria (updated)
- [ ] Factories placed across multiple configured rows (`FACTORY_ROWS`) with expected `y` positions
- [ ] Row `spreadType` behavior matches config (`edges`, `full`, `center`)
- [ ] `factoriesPerRow` respected as a soft cap per row
- [ ] Actors added to store with `config.productionInterval` and `cooldownRemaining` initialized to `PRODUCTION_INTERVAL`
- [ ] Placement avoids obvious silhouette overlap using computed silhouette sizes
- [ ] Unit tests for placement bounds and spacing

### Reference
- Factory placement along skyline/horizon

---

## M5.4: Implement Camera Pan/Zoom System

**Title:** [M5.4] Implement camera pan/zoom system

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

## M5.5: Implement Depth Layers with Parallax

**Title:** [M5.5] Implement depth layers with parallax scrolling

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

## M5.6: Add Factory Spawn Animation

**Title:** [M5.6] Add factory spawn animation for robots

**Labels:** feature, system: animation, size: S, priority: medium

### Feature Description
Create a spawn animation that plays when a factory produces a robot (scale up, move away from factory). **Robot emerges from behind the factory silhouette**, remaining in the background layer for 4 measures before moving to the foreground.

### Implementation Details
- Create `src/animation/factorySpawnAnimation.ts`
- Robot starts at factory position, scaled to 0, in **background layer**
- Scale up (0 → 1.0) with elastic ease
- Move to random nearby position
- **After 4 measures, transition robot to foreground layer** (use BeatClock)
- Play "puff of steam" effect (optional)

**Spawn animation:**
```typescript
const SPAWN_LAYER_DURATION = 4; // measures in background before moving to foreground

export function playFactorySpawnAnimation(factoryId: string, robotId: string): void {
  const robotRef = getRef(`robot-${robotId}`);
  if (!robotRef) return;
  
  const tl = gsap.timeline();
  
  // Start invisible (robot is in background layer)
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
  
  // After 4 measures, move robot to foreground layer
  BeatClock.scheduleOnce(`${SPAWN_LAYER_DURATION}m`, () => {
    useOceanStore.getState().setRobotLayer(robotId, 'foreground');
    if (DEV_TUNING) console.log(`[Factory] Robot ${robotId} moved to foreground`);
  });
}
```

### Acceptance Criteria
- [ ] Robot scales from 0 to 1.0
- [ ] Elastic ease applied
- [ ] Robot moves away from factory
- [ ] Animation completes in ~1.5s
- [ ] Robot spawns in background layer (behind factory silhouette)
- [ ] After 4 measures, robot transitions to foreground layer
- [ ] Layer transition is visually seamless
- [ ] Visually satisfying feedback
- [ ] Timeline cleanup on complete

### Reference
- Similar to spawn animations in other games

---

## M5.7: Test Environment & Factory System

**Title:** [M5.7] Test environment and factory system end-to-end

**Labels:** testing, system: ui, size: M, priority: high

### Feature Description
Comprehensive testing of the environment system including factories, camera, and parallax.

### Implementation Details
- Manual test: Factories spawn robots every 60 measures
- Manual test: Camera pan/zoom works smoothly
- Manual test: Parallax effect visible
- Manual test: Factory silhouettes render correctly
- Manual test: Multiple factories work independently
- Check performance with multiple factories

**Test checklist:**
```markdown
 - [ ] Factories placed according to `FACTORY_ROWS` configuration (rows, spreadType, factoriesPerRow)
- [ ] Factories spawn robots every 60 measures
- [ ] MAX_ROBOTS limit prevents overflow
- [ ] Factory silhouettes show procedural variety (Monolith/Spire/Refinery)
- [ ] Robots spawn behind factories, then move to foreground after 4 measures
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

---

## M5.6: Implement Periodic Robot Spawning From Off-Screen

**Title:** [M5.6] Spawn robots from world edges on a beat-based timer

**Labels:** feature, system: state, size: S, priority: high

### Feature Description
Robots periodically enter the scene from just outside the visible world boundary and swim autonomously inward. There is no factory involvement for v1.0 — factories are environmental decoration only. Spawning is driven by the beat clock so the population grows in musical time.

### Implementation Details
- Extend `src/systems/spawnSystem.ts` with two new exports:
  - `startSpawnScheduler()` — registers a `scheduleRepeat` callback; idempotent (no-op if already running)
  - `stopSpawnScheduler()` — calls `cancelSchedule` with the stored ID; idempotent
- `generateSpawnPosition()` and `spawnRobot()` already exist in `spawnSystem.ts` — no changes needed there
- Call `startSpawnScheduler()` from `OceanScene.tsx` on mount (alongside the two existing immediate `spawnRobot()` calls)
- Call `stopSpawnScheduler()` in the existing `OceanScene` cleanup return alongside `stopCollisionDetection()`
- Enforce `settings.maxRobots` before each spawn

**Spawn scheduler (no code fences to avoid markdown breakage):**

Module-level variable: `let spawnScheduleId: string | null = null`

`startSpawnScheduler()`:
- If `spawnScheduleId !== null` return early (idempotent)
- Pick a random integer interval in measures between `SPAWN_INTERVAL_MIN = 2` and `SPAWN_INTERVAL_MAX = 8` and call `scheduleRepeat(`${interval}m`, callback)`; store returned ID in `spawnScheduleId`.
- Callback: read `robots` and `settings` from store; if `robots.length >= settings.maxRobots` then:
  - if `robots.length > settings.minRobots` remove the oldest robot (by `createdAt`) then continue, otherwise skip spawning this tick. Otherwise call `spawnRobot()`.

`stopSpawnScheduler()`:
- If `spawnScheduleId === null` return early
- Call `cancelSchedule(spawnScheduleId)`; set `spawnScheduleId = null`

### Acceptance Criteria
- [ ] `startSpawnScheduler` and `stopSpawnScheduler` exported from `spawnSystem.ts`
- [ ] `startSpawnScheduler` is idempotent (multiple calls register only one schedule)
- [ ] `stopSpawnScheduler` cancels the Transport schedule via `cancelSchedule`
- [ ] `stopSpawnScheduler` is idempotent (safe to call when not running)
- [ ] Spawning respects `settings.maxRobots`
- [ ] Spawn interval driven by `scheduleRepeat` — no `setTimeout`/`setInterval`
- [ ] `OceanScene.tsx` calls `startSpawnScheduler()` on mount
- [ ] `OceanScene.tsx` calls `stopSpawnScheduler()` in cleanup
- [ ] Unit tests: max-robots guard, idempotent start, stop cancels schedule

### Reference
- `src/systems/spawnSystem.ts` — existing `generateSpawnPosition` / `spawnRobot`
- `src/engine/beatClock.ts` — `scheduleRepeat` / `cancelSchedule`
- `src/systems/factorySystem.ts` — reference pattern for scheduler lifecycle

---

## M5.8: Remove Collision and Interaction Systems

**Title:** [M5.8] Remove collision and interaction systems

**Labels:** refactor, system: state, size: S, priority: high

### Feature Description
Remove the collision detection and robot-robot interaction systems implemented in M4. For v1.0, robots do not collide with each other or trigger interactive effects. The ecosystem focuses on autonomous swimming and music generation.

### Implementation Details
- Delete `src/systems/collisionSystem.ts`
- Delete `src/systems/interactionSystem.ts`
- Remove `startCollisionDetection()` / `stopCollisionDetection()` calls from `OceanScene.tsx`
- Remove any interaction-related state from the robot type (cooldowns, interaction state)
- Clean up AudioEngine references to interaction flurry
- Update Robot type to remove interaction fields

### Acceptance Criteria
- [ ] Collision detection system deleted
- [ ] Interaction system deleted
- [ ] No imports remain for deleted systems
- [ ] OceanScene cleanup hooks removed
- [ ] Robot type cleaned up
- [ ] Robots swim independently without collision checks
- [ ] Application runs without collision-related code paths

### Reference
- Replaced by autonomous spawning (M5.2) and population management (M5.9)

---

## M5.9: Implement MIN/MAX Robot Population Bouncing

**Title:** [M5.9] Implement MIN/MAX robot population bouncing

**Labels:** feature, system: state, size: M, priority: high

### Feature Description
Once MAX_ROBOTS is reached, remove a robot instead when the spawn timer fires. From this point forward, the number of robots bounces between MIN_ROBOTS and MAX_ROBOTS. Any number of robots may be added or removed within those boundaries.

### Implementation Details
- Add `settings.minRobots` constant (= 1) to oceanStore
- Modify `spawnRobot()` in `spawnSystem.ts` to check population:
  - If `robots.length >= maxRobots`, remove the oldest/least-active robot instead of spawning
  - Use removal criteria: oldest robot by spawn time, or robot in idle state longest
- Update spawn system to track robot creation time for removal ordering
- Add removal event logging (DEV_TUNING)

### Acceptance Criteria
- [ ] Robot population bounces between MIN_ROBOTS (1) and MAX_ROBOTS
- [ ] When at max and spawn timer fires, oldest robot is removed
- [ ] Removed robots are unregistered from AudioEngine
- [ ] Population never drops below MIN_ROBOTS (1)
- [ ] Robot creation time tracked in state
- [ ] Population logging (DEV_TUNING)
- [ ] Unit tests: min/max bounds, removal order

### Reference
- `src/systems/spawnSystem.ts` — spawn scheduler
- `src/stores/oceanStore.ts` — robot removal

---

## M5.10: Implement Robot Facing Direction (X-Axis Flip)

**Title:** [M5.10] Implement robot facing direction with x-axis flip

**Labels:** feature, system: animation, size: M, priority: high

### Feature Description
Robots face the direction they are moving. They rotate (flip horizontally) along the x-axis with an ease-in-out animation that starts before the robot begins swimming towards its destination. The turn and swim should overlap slightly for natural motion.

### Implementation Details
- Add `direction` field to Robot type: `direction: 'left' | 'right'` (default: 'right')
- Modify `handleRobotIdle()` in `idleSystem.ts`:
  - Calculate direction based on `destination.x` vs `robot.position.x`
  - Start flip animation BEFORE starting swim animation (~0.3s lead time)
  - Flip animation: 0.5s duration with 'power1.inOut' ease, scaleX from -1 to 1 (or vice versa)
- Update Robot SVG rendering to apply `scaleX` transform based on direction
- Ensure animations overlap: flip starts 0.3s before swim, both total ~0.8–1.0s

### Acceptance Criteria
- [ ] Robots flip horizontally based on movement direction
- [ ] Flip animation duration: ~0.5s
- [ ] Flip starts before swim animation (~0.3s lead)
- [ ] Animations overlap naturally
- [ ] scaleX applied in SVG rendering
- [ ] Robot direction tracked in state
- [ ] Works with all robot speeds

### Reference
- `src/systems/idleSystem.ts` — destination logic
- `src/animation/swimAnimation.ts` — timeline creation

---

## M5.11: Implement Night/Day Cycle Lightness Modulation

**Title:** [M5.11] Implement night/day cycle lightness modulation for robots

**Labels:** feature, system: animation, size: M, priority: medium

### Feature Description
The night/day cycle impacts robot appearance. Instead of changing facade color, the lightness (L in HSL) of all robot parts increases and decreases across the 96-measure day/night cycle. Robot shapes remain the same; only brightness varies with time of day.

### Implementation Details
- Add `currentHour` to oceanStore (derived from `currentMeasure % 96 / 4`)
- Calculate lightness multiplier based on hour:
  - Hour 0 (midnight) → 0.4x (darkest)
  - Hour 6 (dawn) → 0.7x
  - Hour 12 (noon) → 1.0x (brightest)
  - Hour 18 (dusk) → 0.7x
  - Hour 23 → 0.4x
  - Smooth interpolation between hours using sinusoidal curve
- Store lightness multiplier in oceanStore
- Update Robot SVG colors on every lightness change via `subscribeToMeasure()`

### Acceptance Criteria
- [ ] Lightness varies smoothly across 96-measure cycle
- [ ] Darkest at midnight (hour 0, measure 0)
- [ ] Brightest at noon (hour 12, measure 48)
- [ ] All robot colors scale with lightness
- [ ] Subscribed to measure updates
- [ ] Performance maintained (no expensive recalcs)
- [ ] Visual cycle clear and atmospheric

### Reference
- `docs/BEAT_CLOCK.md` — hour derivation
- `src/stores/oceanStore.ts` — subscription pattern

---

## M5.12: Implement Periodic Robot Bubble Emission

**Title:** [M5.12] Implement periodic robot bubble emission

**Labels:** feature, system: animation, size: S, priority: medium

### Feature Description
Robots periodically emit bubbles that rise and fade as they float toward the surface. Bubbles are emitted once per measure on average (with randomness) from the top of each robot's SVG, using the existing `BubbleStream` component.

### Implementation Details
- Reuse `BubbleStream.tsx` component (already handles bubble visuals and physics)
- Add `bubbleEmitterRef` to each Robot component pointing to SVG element at bubble origin
- Schedule bubble emission via BeatClock on a ~1-measure interval with randomness
- Each emission calls `BubbleStream` with origin position (robot top + small random offset)
- Pass bubble parameters: depth scale from robot position, animation duration
- Bubbles automatically handle particle motion and cleanup

### Acceptance Criteria
- [ ] Bubbles emit ~once per measure (with variance)
- [ ] Bubbles originate from robot top center
- [ ] Bubbles rise and fade naturally
- [ ] BubbleStream component reused
- [ ] Depth scaling applied (foreground = bigger)
- [ ] No memory leaks from bubble cleanup
- [ ] Visually adds life to the scene

### Reference
- `src/components/actors/BubbleStream.tsx` — component reuse
- `src/engine/beatClock.ts` — scheduling
