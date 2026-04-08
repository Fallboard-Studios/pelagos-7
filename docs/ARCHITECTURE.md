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

**Timeline Management Implementation:**

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


### 3. State (Zustand)
**Responsibility:** All serializable data and business logic  
**Location:** `src/stores/`

**Store Structure:**
- `oceanStore`: Simulation/game state (robots, actors, world settings, day length, measure clock, etc.)
- `audioStore`: Global audio settings (FX chain parameters, BPM, global bypass, etc.)
- `uiStore`: UI-only state (active view, theme, language, fullscreen, etc.)
- `settingsStore`: Persistent user preferences (reduced motion, accessibility, saved theme, language) — persisted via localStorage.
- `notificationStore`: In-app notifications/toasts (id, message, type, timestamp).
- `sessionStore`: Session-level state (sessionId, unsaved changes flag, auth state).

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
- onComplete updates robot state (e.g., Idle → Moving)
- NO state updates during animation

## Timing Architecture

**Single Source of Truth:** `BeatClock` wrapping `Tone.Transport`

**All timing uses beats/measures:**
- 1 beat = quarter note at current BPM
- 1 measure = 4 beats (4/4 time)
- 96 measures = 1 full day/night cycle
- 4 measures = 1 "hour equivalent"

- **Scheduling:**
- Use `BeatClock.scheduleRepeat()` for recurring musical intervals or `Transport.schedule()`/`Transport.scheduleOnce()` for one-shot events. (`scheduleAtBeat` is a planned helper — the runtime provides `scheduleRepeat` and transport-backed APIs.)
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
│   ├── oceanStore.ts
│   ├── audioStore.ts
│   ├── uiStore.ts
│   ├── settingsStore.ts   # planned (Issue 0h)
│   ├── notificationStore.ts # planned (Issue 0i)
│   └── sessionStore.ts    # planned (Issue 0j)
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
**Fix:** Use GSAP ticker or timeline
```typescript
// ✅ Correct — GSAP ticker for per-frame updates
gsap.ticker.add(() => {
  updatePosition();
});

// Or use a GSAP timeline for controlled animations
gsap.to(ref.current, { x: target.x, duration: 3 });
```

## Factory Building System

Factory actors are purely visual — they have no audio or physics behaviour. All of their
complexity lives in a self-contained rendering stack. See [BUILDING_DESIGN.md](BUILDING_DESIGN.md)
for the full design rationale.

### HSL Color System

Every factory color is an `HSL` object `{ h, s, l }` from `src/utils/colorUtils.ts`.
No hex strings are used at runtime.

| Utility | Purpose |
|---------|---------|
| `hslToString(hsl)` | Serialises `HSL` → `"hsl(h, s%, l%)"` for SVG attributes |
| `applyColorShift(base, shift, lMultiplier)` | Applies per-instance hue/sat shift and a lighting multiplier |
| `clamp(value, min, max)` | Bounds saturation and lightness; handles inverted bounds |

Per-instance color variation is generated **once at spawn time** by `selectVariantFromSeed`
using a deterministic PRNG. The resulting `hueShift` and `satShift` scalars are stored in
`Actor.config` and passed to `applyColorShift` at render time.

```
VARIANT_CONF[variant].colors.body   ← base HSL from colorTheme.json
      ↓  applyColorShift(base, { hueShift, satShift }, lMultiplier)
      ↓
fill="hsl(…)"   applied to SVG <rect>
```

**Forbidden:**
- ❌ Hex color strings (`"#2a3439"`) anywhere in factory rendering paths
- ❌ Computing color shifts inside a render function (must be pre-computed at spawn)
- ❌ Storing computed `fill` strings in Zustand state

---

### Universal Rectangle Silhouette

All factories share a single rectangle body. The old per-variant `pathD` / `bodyClipPath`
fields have been removed. `Factory.tsx` renders:

```
<g transform={bottomAnchorTransform}>            ← world position
  <defs>
    <clipPath id="body-clip-{id}">               ← keeps greebles inside body
      <rect x="2" y="2" width="96" height="96" />
    </clipPath>
    <clipPath id="west-clip-{id}">               ← masks west face overlay
      <rect x={frontCornerX} y="0" width={100-frontCornerX} height="100" />
    </clipPath>
  </defs>

  <g transform="scale(width/100, height/100)">   ← pixel size applied here
    <rect … fill={eastFill} />                   ← east face (full base rect)
    <g clipPath="west-clip">
      <rect … fill={westFill} />                 ← west face overlay (no seam)
    </g>
    <g clipPath="body-clip">
      {facadeContent}                            ← windows + belt courses
    </g>
  </g>
  {rooftopElement}                               ← rendered outside scale group
</g>
```

All coordinates inside the scale group are in a **0-100 normalised SVG space**;
the `scale()` transform converts them to world pixels. This means all greeble
renderers work in the same 0-100 space regardless of actual building size.

Pixel size is derived via `calcSilhouetteSize(noiseValue, sizeRange)` — a linear
interpolation between `sizeRange.minWidth/minHeight` and `sizeRange.maxWidth/maxHeight`.

---

### Greeble System Architecture

Procedural decoration is split into two renderer pools, each keyed by a string union type:

```
RooftopGreeble  →  ROOFTOP_RENDERERS  (src/components/actors/greebles/rooftopGreebles.tsx)
FacadeGreeble   →  FACADE_RENDERERS   (src/components/actors/greebles/facadeGreebles.tsx)
```

Every renderer has the signature:

```typescript
type GreebleRenderer = (ctx: GreebleRendererContext) => GreebleElement | null;
```

`GreebleRendererContext` carries building dimensions, per-variant colors, the spawn seed,
and lighting multipliers. Renderers must be **pure functions of their context** — no global
state reads, no Tone.js calls, no GSAP inside the function body.

**Selection pipeline (spawn time, once per actor):**

```
selectVariantFromSeed(actorId, x, row, availableTypes)
  → variant                          stored implicitly via config.row / position.x
  → rooftopGreeble (PRNG pick)       → Actor.config.rooftopGreeble
  → facadeGreeble  (PRNG pick)       → Actor.config.facadeGreeble
  → beltCourseCount (PRNG pick)      → Actor.config.beltCourseCount
```

**Render time lookup (`Factory.tsx`):**

```typescript
const rooftopEl = ROOFTOP_RENDERERS[actor.config.rooftopGreeble](ctx);
const facadeEl  = FACADE_RENDERERS[actor.config.facadeGreeble](ctx);
```

**Belt courses** are not dispatched through `FACADE_RENDERERS`. They are handled
separately because the number of courses must be known **before** window zones are
laid out — each course divides the facade into an additional window zone.

**Design decision:** `beltCourse` was deliberately removed from every variant's
`allowedFacade` array. Instead, each variant declares `maxBeltCourses` in its
`greebleConfig`:

| Variant    | `maxBeltCourses` |
|------------|-----------------|
| Monolith   | 2               |
| Stacks     | 1               |
| Refinery   | 1               |
| Skyscraper | 3               |
| Warehouse  | 0               |

At spawn time, `selectVariantFromSeed` picks `beltCourseCount` as a uniform random
integer in `[0 .. maxBeltCourses]` and stores it in `Actor.config.beltCourseCount`.
Variants with `maxBeltCourses: 0` (Warehouse) always produce `beltCourseCount = 0`.

`Factory.tsx` then uses this count to partition the facade:

```
zones = beltCourseCount + 1
for each zone i:
  render FACADE_RENDERERS[facadeGreeble](zoneCtx)   ← window grid for zone i
  if not last zone:
    render <rect …/>                                  ← belt course separator
```

Each zone context receives an independent seed (`ctx.seed + 1000 * (i + 1)`) so
window patterns vary per zone even when they share the same `facadeGreeble` type.

**Forbidden:**
- ❌ Greeble renderers importing Tone.js or AudioEngine
- ❌ Greeble renderers starting GSAP animations (GSAP animations are added separately to rooftop elements via `attachFlickerAnimation` stub — deferred)
- ❌ Greeble selection re-run at render time (must use stored `Actor.config` values)

---

### East/West Facade Split

Each factory exposes two independently coloured faces to prepare the rendering pipeline
for the future day/night lighting system.

```
frontCornerX  ← random 25–75 in normalised 0-100 space (generated by PRNG at spawn)
eastFill      = applyColorShift(body, shift, eastLMultiplier)
westFill      = applyColorShift(body, shift, westLMultiplier)
```

The east face is rendered as a **full-width base rect**; the west face is a full-width rect
clipped to `[frontCornerX, 100]` and composited on top. This avoids sub-pixel seam
artifacts that appear when two adjacent clipped rects share an edge.

Window renderers (`renderWindowGrid`) receive `eastLMultiplier`, `westLMultiplier`, and
`frontCornerX` via `GreebleRendererContext`. Each window's opacity is multiplied by the
appropriate side's lightness multiplier based on whether its x position falls left or right
of `frontCornerX`.

**Current state:** `eastLMultiplier` and `westLMultiplier` are driven by a hardcoded
`DEBUG_LIGHTING_PRESET` constant in `Factory.tsx`. The day/night clock integration
(`getFacadeLightness`, `Tone.Transport`-based cycle) is **deferred** — see
[BUILDING_DESIGN.md § Day/Night Cycle](BUILDING_DESIGN.md) for the planned approach.

**Forbidden:**
- ❌ Computing `frontCornerX` at render time (must use `config.frontCornerX` from spawn)
- ❌ Connecting `eastLMultiplier` / `westLMultiplier` to `setTimeout` or `setInterval`
  (must use `Tone.Transport`-scheduled callbacks when implemented)

---

