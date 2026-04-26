# Building Prompts: Factory Redesign Implementation

> **⚠️ Historical document.** These prompts were written before `oceanStore` was removed from the codebase. Any reference to `oceanStore`, `useOceanStore`, or `oceanStore.test.ts` in the prompts below is outdated. The equivalent store is now `localeStore` — use `useLocaleStore` and key state by locale ID (see `src/stores/localeStore.ts`). Do not recreate `oceanStore`.

This document contains the step-by-step prompts for implementing the new rectangle-based factory system as described in BUILDING_DESIGN.md.

**Implementation Strategy:**
- App can break during intermediate steps (no need to maintain visual continuity)
- Full HSL color migration
- Stub greebles first, then add incrementally
- Day/night system deferred to later
- Unit tests updated per module
- Preserve variant character via size ranges + greeble pools
- Many small, focused prompts

---

## Phase 1: Color System Foundation

### Prompt 1.1: HSL Type Definitions + Utilities
```
Create HSL type definitions and utilities in src/utils/colorUtils.ts:

1. Add HSL interface: { h: number; s: number; l: number }
2. Implement hslToString(hsl: HSL): string (returns "hsl(h, s%, l%)")
3. Implement clamp(value: number, min: number, max: number): number
4. Add unit tests in src/utils/colorUtils.test.ts covering:
   - hslToString formatting
   - clamp boundary conditions

Note: No hex conversion needed - colorTheme.json will be directly authored in HSL format.
```

### Prompt 1.2: Convert colorTheme.json to HSL
```
Convert src/constants/colorTheme.json from hex to HSL format:

1. Transform all color values from hex strings to HSL objects
2. Preserve the existing structure (body.base, shell.highlight, etc.)
3. Add a comment at the top noting "All colors in HSL format (h: 0-360, s: 0-100, l: 0-100)"

Example transformation:
  "base": "#2a3439" → "base": { "h": 195, "s": 15, "l": 20 }

This is a one-time data transformation - use an online hex-to-HSL converter or 
calculate values manually. No runtime conversion utilities needed.
```

### Prompt 1.3: Update colorTheme Imports + Usage
```
Update all files that import colorTheme to handle HSL format:

1. Search for all imports of colorTheme.json
2. Update references to use hslToString() where colors are applied to DOM/SVG
3. Update factoryVariants.ts color references
4. Update any Robot component color references
5. Ensure no hex string assumptions remain
6. Run existing tests to verify no regressions

Example change:
  fill={colorTheme.body.base} → fill={hslToString(colorTheme.body.base)}
```

---

## Phase 2: Variant Config Schema Update

### Prompt 2.1: Add ColorShift Types to Actor
```
Update Actor type to support per-instance color shifts:

1. In src/types/Actor.ts, extend Actor.config interface:
   - Add hueShift?: number
   - Add satShift?: number
2. Document that these are deterministically seeded at spawn
3. Update oceanStore.test.ts to verify serialization still works
```

### Prompt 2.2: Update VARIANT_CONF Schema (Colors + Sizes)
```
Update src/components/actors/factoryVariants.ts VARIANT_CONF:

1. Replace colors: { light, base, dark } with:
   colors: {
     body: HSL,
     accent: HSL,
     greeble: HSL,
     illuminated: HSL
   }

2. Replace nativeSizes with sizeRange:
   sizeRange: {
     minWidth: number,
     maxWidth: number,
     minHeight: number,
     maxHeight: number
   }

3. Add colorRanges:
   colorRanges: {
     hueShiftRange: [number, number],
     satShiftRange: [number, number]
   }

4. Add frontCornerX: number (0-100, use 50 for all variants as placeholder)

5. Keep pathD and bodyClipPath temporarily (we'll remove in next step)

6. Keep greebleConfig: { cols, rows } for now

7. Populate values for all 5 variants (Monolith, Stacks, Refinery, Skyscraper, Warehouse)
   - Use existing nativeSizes to derive reasonable min/max ranges (±20% variation)
   - Map old light/base/dark to new body/accent/greeble using colorTheme HSL values
   - Set illuminated to a high-L version of greeble
   - Use moderate shift ranges: hue [-15, 15], sat [-10, 10]

8. Update Factory.test.ts to verify new schema
```

### Prompt 2.3: Update calcSilhouetteSize for Size Ranges
```
Update src/components/actors/silhouetteUtils.ts calcSilhouetteSize:

1. Change signature from:
   calcSilhouetteSize(noiseValue, nativeSizes)
   to:
   calcSilhouetteSize(noiseValue, sizeRange)

2. Implement lerp-based sizing:
   width = lerp(sizeRange.minWidth, sizeRange.maxWidth, noiseValue)
   height = lerp(sizeRange.minHeight, sizeRange.maxHeight, noiseValue)

3. Add lerp utility if it doesn't exist: lerp(a, b, t) = a + (b - a) * t

4. Update useSilhouette hook to use new signature

5. Update silhouetteUtils.test.ts to verify lerp behavior

6. Update factoryPlacementSystem.ts where calcSilhouetteSize is called
```

### Prompt 2.4: Implement applyColorShift Utility
```
Add color shift logic to src/utils/colorUtils.ts:

1. Implement applyColorShift(base: HSL, shift: ColorShift, lMultiplier: number): string
   - Apply hueShift: h = (base.h + shift.hueShift + 360) % 360
   - Apply satShift: s = clamp(base.s + shift.satShift, 0, 100)
   - Apply lMultiplier: l = base.l * lMultiplier
   - Return hslToString result

2. Add ColorShift type: { hueShift: number; satShift: number }

3. Add unit tests covering:
   - Hue wraparound at 0/360
   - Saturation clamping
   - L multiplier range

4. Export from colorUtils
```

### Prompt 2.5: Generate ColorShift at Spawn
```
Update src/systems/factoryPlacementSystem.ts and factoryVariants.ts:

1. In selectVariantFromSeed, use the PRNG to pick hueShift and satShift:
   - const hueShift = lerp(colorRanges.hueShiftRange[0], colorRanges.hueShiftRange[1], prng())
   - const satShift = lerp(colorRanges.satShiftRange[0], colorRanges.satShiftRange[1], prng())

2. Return { variant, scale, noiseValue, hueShift, satShift }

3. In createFactory, store hueShift and satShift in Actor.config

4. Update factoryPlacementSystem.test.ts to verify determinism
```

---

## Phase 3: Universal Rectangle Base

### Prompt 3.1: Remove pathD and bodyClipPath from VARIANT_CONF
```
Simplify src/components/actors/factoryVariants.ts:

1. Remove pathD field from all variants
2. Remove bodyClipPath field from all variants
3. Add comments noting the universal rectangle path and clip are now in Factory.tsx
4. Update Factory.test.ts to reflect schema change
```

### Prompt 3.2: Rewrite Factory.tsx to Render Universal Rectangle
```
Update src/components/actors/Factory.tsx to render a rectangle:

1. Remove BuildingSilhouette / FactorySilhouette component (or heavily simplify)

2. Render structure:
   <g transform={bottomAnchorTransform}>
     <defs>
       <clipPath id="body-clip-{id}">
         <rect x="2" y="2" width="96" height="96" />
       </clipPath>
     </defs>
     
     <g transform={scale(width/100, height/100)}>
       <rect x="0" y="0" width="100" height="100" fill={bodyFill} />
       
       <g clipPath="url(#body-clip-{id})">
         {/* Stub: render existing greeble rects here temporarily */}
       </g>
     </g>
   </g>

3. Use applyColorShift to compute bodyFill:
   - Read hueShift/satShift from actor.config
   - Use lMultiplier = 0.8 as a fixed placeholder (day/night comes later)
   - Apply to variant.colors.body

4. Keep old greeble rendering temporarily (we'll replace with new system)

5. This will break visuals but establish the rectangle base

6. Test that factories still place correctly (even if they look wrong)
```

---

## Phase 4: Greeble System Foundation

### Prompt 4.1: Define Greeble Type Enums + Renderer Interface
```
Create src/components/actors/greebles/greebleTypes.ts:

1. Export type RooftopGreeble =
   | 'machinery'
   | 'antennae'
   | 'waterTower'
   | 'cupola'
   | 'crownSpire'
   | 'pitchedRoof'
   | 'steppeRoof'

2. Export type FacadeGreeble =
   | 'squareWindows'
   | 'wideWindows'
   | 'tallWindows'
   | 'beltCourse'

3. Export interface GreebleRendererContext {
     buildingWidth: number;
     buildingHeight: number;
     roofY: number;
     seed: number;
     colors: {
       body: HSL;
       accent: HSL;
       greeble: HSL;
       illuminated: HSL;
     };
     lMultiplier: number;
   }

4. Export type GreebleRenderer = (ctx: GreebleRendererContext) => React.ReactElement | null
```

### Prompt 4.2: Update VARIANT_CONF with Greeble Pools
```
Update src/components/actors/factoryVariants.ts greebleConfig:

1. Replace greebleConfig: { cols, rows } with:
   greebleConfig: {
     allowedRooftop: RooftopGreeble[],
     allowedFacade: FacadeGreeble[],
     maxRooftop?: number
   }

2. Assign pools per variant to preserve character:
   - Monolith: rooftop ['steppeRoof', 'machinery'], facade ['squareWindows', 'beltCourse']
   - Stacks: rooftop ['crownSpire', 'antennae'], facade ['tallWindows', 'beltCourse']
   - Refinery: rooftop ['machinery', 'pitchedRoof'], facade ['wideWindows', 'beltCourse']
   - Skyscraper: rooftop ['crownSpire', 'antennae'], facade ['tallWindows']
   - Warehouse: rooftop ['pitchedRoof', 'steppeRoof'], facade ['squareWindows']

3. Set maxRooftop: 1 for all variants

4. Update type definitions and tests
```

### Prompt 4.3: Implement Stub Rooftop Greeble (Machinery)
```
Create src/components/actors/greebles/rooftopGreebles.tsx:

1. Implement renderMachinery(ctx: GreebleRendererContext):
   - For now, just render a simple rectangle group above the roof
   - Use ctx.seed for deterministic positioning
   - Width: ~20% of building width
   - Height: ~5% of building height
   - Position at roof center
   - Fill with ctx.colors.accent

2. This is a placeholder - full implementation comes later

3. Export a registry: ROOFTOP_RENDERERS: Record<RooftopGreeble, GreebleRenderer>
   - Set all others to () => null for now
```

### Prompt 4.4: Implement Stub Facade Greeble (Square Windows)
```
Create src/components/actors/greebles/facadeGreebles.tsx:

1. Implement renderSquareWindows(ctx: GreebleRendererContext):
   - Use the existing generateGreebleRects logic temporarily
   - Derive cols/rows from buildingWidth/buildingHeight (6 cols, 4 rows as default)
   - Render rects at computed positions
   - Fill with ctx.colors.greeble

2. Export registry: FACADE_RENDERERS: Record<FacadeGreeble, GreebleRenderer>
   - Set all others to () => null for now

3. Add unit tests for grid derivation logic
```

### Prompt 4.5: Wire Greeble Selection into Spawn
```
Update src/systems/factoryPlacementSystem.ts and factoryVariants.ts:

1. In selectVariantFromSeed or createFactory:
   - Use PRNG to pick one rooftop greeble from variant's allowedRooftop pool
   - Use PRNG to pick one facade greeble from variant's allowedFacade pool
   - Store selections in Actor.config as rooftopGreeble and facadeGreeble

2. Ensure deterministic selection (same seed = same greebles)

3. Update Actor type to include:
   - rooftopGreeble?: RooftopGreeble
   - facadeGreeble?: FacadeGreeble

4. Add tests verifying deterministic greeble selection
```

### Prompt 4.6: Update Factory.tsx to Render Greebles
```
Update src/components/actors/Factory.tsx:

1. Import ROOFTOP_RENDERERS and FACADE_RENDERERS

2. Read actor.config.rooftopGreeble and actor.config.facadeGreeble

3. Build GreebleRendererContext from actor, variant colors, computed sizes

4. Render rooftop greeble above rectangle (unclipped)

5. Render facade greeble inside body clip rect

6. Remove old greeble rendering code

7. Verify factories now render with rectangles + stub greebles

8. This is the first visual milestone - buildings should look simple but correct
```

---

## Phase 5: Incremental Greeble Implementation

### Prompt 5.1: Implement Rooftop Greebles (Batch 1)
```
Complete implementations in src/components/actors/greebles/rooftopGreebles.tsx:

1. renderSteppeRoof:
   - 1-3 progressively narrower tiers (80%, 60%, 40% of roof width)
   - Each tier ~2% of building height
   - Centered on roof

2. renderPitchedRoof:
   - Right triangle spanning full roof width
   - Height ~10% of building height
   - Apex is diagonal edge

3. Add unit tests for aspect ratios and positioning
```

### Prompt 5.2: Implement Rooftop Greebles (Batch 2)
```
Complete implementations in src/components/actors/greebles/rooftopGreebles.tsx:

1. renderCrownSpire:
   - Stepped/terraced roof (2-3 steps)
   - Full roof width
   - Height ~15% of building height
   - Top with small antenna (thin rect or line)

2. renderAntennae:
   - Tall vertical line (2-4px wide)
   - Height 10-25% of building height (seeded random)
   - Light at top (small circle, use indicator.powered color)
   - If tall (>15%), add mid light that doesn't flicker

3. Add utility for flicker animation (GSAP ticker driven, saved for later refinement)

4. Add unit tests
```

### Prompt 5.3: Implement Rooftop Greebles (Batch 3)
```
Complete implementations in src/components/actors/greebles/rooftopGreebles.tsx:

1. renderWaterTower:
   - Bottom third: support stilts (2-4 vertical lines)
   - Middle third: rectangle (tank body)
   - Top third: triangle cap
   - Width ~15% of building width
   - Total height ~15-20% of building height

2. renderCupola:
   - Rounded dome (use SVG arc or circle)
   - Spans 40-60% of roof width
   - Height ~12% of building height

3. renderMachinery (replace stub):
   - Iterate through columns (~5-8 columns based on roof width)
   - Each column 30% chance of stack
   - Stack height random (3-10% of building height)
   - Use seeded random for determinism

4. Add unit tests
```

### Prompt 5.4: Implement Facade Greebles (Windows)
```
Complete implementations in src/components/actors/greebles/facadeGreebles.tsx:

1. Implement deriveWindowGrid(buildingWidth, buildingHeight, windowType):
   - Calculate unit size: max(4, buildingWidth * 0.06)
   - Calculate cols/rows based on aspect ratios
   - Return { cols, rows, unitW, unitH }

2. Update renderSquareWindows to use deriveWindowGrid

3. Implement renderWideWindows (aspect 4×1)

4. Implement renderTallWindows (aspect 1×4)

5. Add margin calculations from remaining space

6. Add unit tests for grid derivation with various building sizes
```

### Prompt 5.5: Implement Belt Course Greeble
```
Add belt course to src/components/actors/greebles/facadeGreebles.tsx:

1. renderBeltCourse:
   - Calculate number of courses: Math.floor(buildingHeight / threshold)
     - Use threshold ~80-100px
   - Each course is full facade width × 2-3% building height
   - Evenly spaced vertically
   - Use ctx.colors.accent with L bump (+5%)

2. Add unit tests for course count scaling with building height
```

---

## Phase 6: East/West Facade Split (Prep for Day/Night)

### Prompt 6.1: Add East/West Clip Rendering to Factory.tsx
```
Update src/components/actors/Factory.tsx to split facades:

1. Add two clip paths per factory:
   - east-clip-{id}: rect from x=0 to frontCornerX
   - west-clip-{id}: rect from frontCornerX to 100

2. Render rectangle twice:
   - Once with eastFill clipped to east-clip
   - Once with westFill clipped to west-clip

3. For now, use same color for both (lMultiplier = 0.8):
   eastFill = westFill = applyColorShift(body, shift, 0.8)

4. Update facade greeble rendering to check window x position:
   - If x < frontCornerX, use east L multiplier
   - Else use west L multiplier

5. Rooftop greebles use average of east/west L (since they span both)

6. This prepares the rendering pipeline for day/night without implementing the clock
```

---

## Phase 7: Testing & Polish

### Prompt 7.1: Comprehensive Unit Test Pass
```
Review and complete unit test coverage:

1. colorUtils.test.ts - HSL conversion, color shifts
2. factoryVariants.test.ts - variant selection, greeble selection determinism
3. silhouetteUtils.test.ts - size calculation with ranges
4. factoryPlacementSystem.test.ts - actor spawning with new config schema
5. All greeble renderer tests

Run full test suite and fix any failures.
```

### Prompt 7.2: Visual Milestone Testing
```
Manual testing checklist:

1. Spawn app and verify factories render as rectangles
2. Check variety of rooftop greebles (machinery, spires, roofs)
3. Verify windows render correctly on facades
4. Check belt courses on taller buildings
5. Verify no visual artifacts at clip boundaries
6. Test with different viewport sizes
7. Verify determinism (reload = same buildings)

Document any visual issues for refinement.
```

### Prompt 7.3: Performance Check
```
Basic performance verification:

1. Check frame rate with full factory scene
2. Verify no memory leaks from greeble renderers
3. Profile Factory.tsx render time
4. Ensure GSAP timelines for rooftop greebles clean up properly

If performance issues found, optimize in follow-up prompts.
```

---

## Phase 8: Documentation Updates

### Prompt 8.1: Update Code Comments
```
Add/update JSDoc comments throughout:

1. All exported functions in colorUtils.ts
2. All greeble renderer functions
3. Updated VARIANT_CONF schema fields
4. Actor.config color shift fields

Ensure comments reference BUILDING_DESIGN.md where appropriate.
```

### Prompt 8.2: Update ARCHITECTURE.md
```
Update docs/ARCHITECTURE.md to reflect:

1. HSL color system
2. Universal rectangle silhouette
3. Greeble system architecture
4. East/west facade split (note: day/night not yet implemented)

Cross-reference BUILDING_DESIGN.md for details.
```

### Prompt 8.3: Create Migration Summary
```
Add a new section to BUILDING_DESIGN.md (or separate MIGRATION.md):

1. Document what was removed (old pathD/bodyClipPath system)
2. Document what was added (greeble system, HSL colors)
3. Note what's deferred (day/night cycle, window illumination)
4. Provide before/after comparison of VARIANT_CONF schema
```

---

## Deferred to Future Phases

The following features from BUILDING_DESIGN.md are **not** included in the above prompts and should be implemented later:

- **Day/Night Cycle:** 96-measure clock, getFacadeLightness function, dynamic L multipliers
- **Window Illumination:** isLit state, slow on/off toggles, crossfade to illuminated HSL
- **Atmospheric Depth:** Per-row L caps for depth rows
- **Advanced Greeble Features:** Window flicker simulation, complex antenna light patterns

These will be addressed in a separate prompt sequence once the foundation is stable.

---

## Notes for AI Assistant

- Each prompt should be self-contained and executable independently
- Update relevant tests within each prompt (don't batch all tests at end)
- Visual milestone is after Prompt 4.6 - buildings should render correctly
- If prompt proves too large, split into sub-prompts (e.g., 5.3a, 5.3b)
- Preserve determinism throughout - same seed must always produce identical results
- Maintain coding conventions from .github/copilot-instructions.md

# Building Design 2.0

This section contains implementation prompts for the four systems described in
the **Building Design 2.0** goals in `BUILDING_DESIGN.md`. Each phase is
self-contained and independently executable.

**Implementation Order:**
1. Variant Purposes (small, unlocks everything else)
2. Bubble Streams (GSAP animation, purpose-gated)
3. Offline State (system + store change, gates bubbles + windows + lights)
4. Swaying Cables (SVG + GSAP, row-config-gated)

---

## Phase 9: Variant Purposes

### Prompt 9.1: Add `purpose` Field to Variant Config

```
Update src/components/actors/factoryVariants.ts:

1. Add a FactoryPurpose string union type:
   export type FactoryPurpose =
     | 'heavyIndustry'
     | 'chemicalProcessing'
     | 'pipeWorks'
     | 'observationComms'
     | 'storageLogistics';

2. Add purpose: FactoryPurpose to each entry in VARIANT_CONF:
   - Monolith    → 'heavyIndustry'
   - Stacks      → 'chemicalProcessing'
   - Refinery    → 'pipeWorks'
   - Skyscraper  → 'observationComms'
   - Warehouse   → 'storageLogistics'

3. Store purpose in Actor.config at spawn time inside selectVariantFromSeed
   (or in createFactory — wherever hueShift/satShift are currently written).
   Add purpose?: FactoryPurpose to Actor.config type in src/types/Actor.ts.

4. purpose is read-only after spawn; it is never recalculated.

5. Add/update unit tests in factoryVariants.test.ts:
   - All five variants map to the correct purpose.
   - actor.config.purpose survives JSON.stringify round-trip.
```

---

## Phase 10: Bubble Streams

### Prompt 10.1: BubbleStream Component

```
Create src/components/actors/BubbleStream.tsx:

1. Props interface BubbleStreamProps:
   - actorId: string
   - ventX: number          // SVG x position of the vent (pixels)
   - ventY: number          // SVG y position of the vent (top of building, pixels)
   - seed: number           // for deterministic sizing / stagger
   - isActive: boolean      // false when building is offline

2. Derived constants (from seed using a simple LCG):
   - radius: 2–4 px
   - riseDistance: 20–40 px
   - riseDuration: 2.5–4.5 s
   - staggerDelay: 0–2 s

3. Render a single <circle> element, referenced by a React ref.

4. Use the useGSAP hook to create a looping GSAP timeline:
   - Initial position: { cx: ventX, cy: ventY }
   - Tween to: { cy: ventY - riseDistance, opacity: 0, duration: riseDuration,
                  ease: 'power1.out' }
   - delay: staggerDelay before first play
   - repeat: -1, repeatDelay: seeded 0.4–1.2 s
   - Store the timeline in timelineMap under key `bubble-{actorId}`.

5. When isActive changes from true → false: pause the timeline and set
   circle opacity to 0.
   When isActive changes from false → true: resume the timeline.
   Use a useEffect watching isActive for this; do NOT restart the GSAP
   timeline — pause/resume only.

6. Kill and remove the timelineMap entry on unmount.

7. Bubble fill: hsl(200, 40%, 75%) at opacity 0.55 (constant; GSAP drives
   per-tween opacity from 0.55 → 0).

8. Do NOT use setTimeout, setInterval, requestAnimationFrame, or queueMicrotask directly.

9. Add a unit smoke-test in BubbleStream.test.tsx verifying the component
   renders a <circle> and that timelineMap receives an entry.
```

### Prompt 10.2: Integrate BubbleStream into Factory.tsx

```
Update src/components/actors/Factory.tsx:

1. Import BubbleStream and FactoryPurpose.

2. Define BUBBLE_PURPOSES: Set<FactoryPurpose> = new Set([
     'heavyIndustry', 'chemicalProcessing', 'pipeWorks'
   ]);

3. Compute ventX deterministically from buildingSeed:
   ventX = (buildingSeed % 60) + 20   // 20–80% of normalised width
   Convert to pixel coords: ventXPx = ventX / 100 * actualWidth

4. ventY = transform-space top of the building (y offset of the building's
   top edge in scene coordinates). This is actor.position.y - actualHeight
   (the same y used as the top of the rooftop greeble group).

5. Read actor.config.isOffline to derive isActive = !actor.config.isOffline.

6. Render <BubbleStream> after the rooftopElement only when
   BUBBLE_PURPOSES.has(actor.config.purpose):
   <BubbleStream
     actorId={actor.id}
     ventX={ventXPx}
     ventY={ventY}
     seed={buildingSeed}
     isActive={isActive}
   />

7. Ensure the bubble renders in scene (world) coordinates, outside the
   normalised scale group.

8. Run tsc --noEmit and npm test to verify no regressions.
```

---

## Phase 11: Offline State

### Prompt 11.1: Extend Actor Type + Store

```
1. In src/types/Actor.ts, add to Actor.config:
   - isOffline?: boolean          // true while powered down
   - offlineSince?: number        // the measure at which offline started

2. In src/stores/oceanStore.ts:
   - Add action setActorOffline(actorId: string, measure: number): void
     Sets actor.config.isOffline = true, actor.config.offlineSince = measure.
   - Add action setActorOnline(actorId: string): void
     Sets actor.config.isOffline = false, deletes offlineSince.

3. Add unit tests in oceanStore.test.ts:
   - setActorOffline sets fields correctly on the matching actor.
   - setActorOnline clears fields correctly.
   - State remains JSON-serialisable after both transitions.
```

### Prompt 11.2: offlineSystem

```
Create src/systems/offlineSystem.ts:

Constants:
  const OFFLINE_PROBABILITY = 1 / 200;   // per building per measure
  const OFFLINE_DURATION = 66;           // measures

Export function tickOfflineSystem(currentMeasure: number): void

Logic:
1. Get all actors from useOceanStore.getState().
2. For each factory actor:
   a. If actor.config.isOffline === true:
      - If currentMeasure - actor.config.offlineSince >= OFFLINE_DURATION:
        call setActorOnline(actor.id)
   b. Else (online):
      - If Math.random() < OFFLINE_PROBABILITY:
        call setActorOffline(actor.id, currentMeasure)

3. Do NOT use Math.random() for the probability check — use a seeded
   per-building per-measure PRNG:
     const roll = Alea(`offline-${actor.id}-${currentMeasure}`)();
   This ensures replays are deterministic.

4. Export offlineSystem for wiring into the beat clock subscriber in App.tsx.

5. Add unit tests in offlineSystem.test.ts:
   - A building with offlineSince = 0 at measure 66 comes back online.
   - A building offline since measure 5 at measure 70 does NOT come back
     (66 measures haven't elapsed yet; 70 - 5 = 65).
   - The Alea roll is deterministic (same actorId + measure = same result).
```

### Prompt 11.3: Wire offlineSystem into Beat Clock

```
Update src/App.tsx:

1. Import tickOfflineSystem from offlineSystem.ts.
2. Inside the subscribeToMeasure callback (where setCurrentMeasure is called),
   also call tickOfflineSystem(m) after updating the store.

The callback currently looks like:
  subscribeToMeasure((m) => useOceanStore.getState().setCurrentMeasure(m));
Change it to:
  subscribeToMeasure((m) => {
    useOceanStore.getState().setCurrentMeasure(m);
    tickOfflineSystem(m);
  });

3. Run tsc --noEmit and npm test.
```

### Prompt 11.4: Apply Offline Visual Effects in Factory.tsx

```
Update src/components/actors/Factory.tsx to visually reflect offline state:

1. Read isOffline = actor.config.isOffline ?? false.

2. nightDepth override:
   - When isOffline: force nightDepth = 0 (no lit windows).
   - No change needed in the selector — just override the computed value:
     const effectiveNightDepth = isOffline ? 0 : nightDepth;
   - Pass effectiveNightDepth as nightDepth in ctx.

3. Body saturation desaturation:
   - When isOffline, reduce body saturation by 20 before applyColorShift:
     const offlineShift = isOffline
       ? { ...shift, satShift: shift.satShift - 20 }
       : shift;
   - Use offlineShift when computing eastFill and westFill.

4. Antennae lights:
   - Pass isOffline into GreebleRendererContext (add field isOffline?: boolean).
   - In renderAntennae (rooftopGreebles.tsx), when ctx.isOffline === true,
     set opacity={0} on both indicator light <circle> elements.

5. Bubble stream:
   - isActive = !isOffline (already handled in Prompt 10.2 via isActive prop).

6. Add unit test in Factory.test.tsx (or a new snapshot/render test):
   - With isOffline=true: ctx.nightDepth === 0 and body satShift is reduced.

7. Run tsc --noEmit and npm test.
```

---

## Phase 12: Swaying Cables

### Prompt 12.1: Extend Row Config with cablesEnabled

```
Update src/systems/factoryPlacementSystem.ts:

1. Add cablesEnabled: boolean to RowConfig interface (default false).
2. Set cablesEnabled: false on all existing row configs for now.
3. Export a helper isCablesEnabled(row: number): boolean that reads from
   getRowConfig(row)?.cablesEnabled ?? false.
4. Update factoryPlacementSystem.test.ts to verify the new field.
```

### Prompt 12.2: CableLayer Component

```
Create src/components/actors/CableLayer.tsx:

Props:
  actors: Actor[]   // full list of factory actors

Logic:
1. Filter actors to those where isCablesEnabled(actor.config.row) === true.
2. Group filtered actors by row:
   Map<row, Actor[]>
3. For each row group, sort actors by actor.position.x ascending.
4. For each consecutive pair [a, b] in the sorted list:
   - Skip if a.config.variant !== b.config.variant (must match).
   - Skip if either is offline.
   - Skip if horizontal distance > MAX_CABLE_SPAN (export constant, 320 px).
   - Otherwise: compute cable geometry and render a <CableSegment>.

CableSegment (inline sub-component or separate file):
  Props: { id: string; x1: number; y1: number; x2: number; y2: number;
           sag: number; seed: number }
  - Render an SVG <path> quadratic Bézier:
      const cpX = (x1 + x2) / 2;
      const cpY = Math.max(y1, y2) + sag;  // sag hangs below the endpoints
      d={`M ${x1},${y1} Q ${cpX},${cpY} ${x2},${y2}`}
  - stroke="hsl(220, 10%, 18%)" strokeWidth={1.5} fill="none" opacity={0.6}
  - Use a ref on the <path> element.
  - Use useGSAP to create a slow sway tween on the control point:
      Animate cpY ± (4 + seed % 5) px
      Duration: 12 + (seed % 14) s
      yoyo: true, repeat: -1, ease: 'sine.inOut'
    Store in timelineMap under key `cable-{id}`.
  - Kill timeline on unmount.

Cable y-positions:
  y1 = actor.position.y - actualHeight (top-centre of building a)
  y2 = neighbour.position.y - actualHeight (top-centre of building b)
  x1 = actor.position.x + actualWidth / 2
  x2 = neighbour.position.x + neighbour_actualWidth / 2
  sag = (x2 - x1) * 0.18 + (seed % 8)   // ~18% of span + seed jitter

5. CableLayer renders an SVG <g className="cable-layer"> containing all
   CableSegment elements. This group must be placed BELOW factory buildings
   in the render order in OceanScene.tsx.

6. Do NOT perform GSAP sway via state updates or re-renders. Animate the
   SVG path `d` attribute directly via gsap.to(ref.current, { attr: { d } }).

7. Add unit tests in CableLayer.test.tsx:
   - Pairs of same-variant, same-row actors within MAX_CABLE_SPAN produce
     a CableSegment.
   - Mismatched variants produce no cable.
   - Distance over MAX_CABLE_SPAN produces no cable.
   - Online/offline actor pair produces no cable.
```

### Prompt 12.3: Mount CableLayer in OceanScene

```
Update src/components/OceanScene.tsx:

1. Import CableLayer.
2. Read the actors array from the ocean store.
3. Render <CableLayer actors={actors} /> immediately BEFORE the factory
   actor render group so cables appear in SVG behind buildings:

   <svg ...>
     {/* background layers */}
     <CableLayer actors={actors} />
     {/* factory buildings */}
     {actors.map(actor => <Factory key={actor.id} actor={actor} />)}
     {/* robots etc. */}
   </svg>

4. Run tsc --noEmit and npm test.
5. Manually toggle cablesEnabled: true on one row in factoryPlacementSystem.ts,
   reload, and verify cables appear between matching-variant neighbours.
   Revert the toggle after testing (leave default as false).
```

---

## Notes for AI Assistant (2.0 addendum)

- **Purpose gates are the key dependency.** Prompts 10–12 all require
  actor.config.purpose to exist; do not skip Prompt 9.1.
- **Offline state is a store concern, not a render concern.** Factory.tsx
  reads actor.config.isOffline reactively; the system writes it. Keep
  the boundary clean.
- **No GSAP inside greeble renderer pure functions.** BubbleStream and
  CableLayer are React components that own their own GSAP lifecycles.
  GreebleRendererContext renders are pure SVG output only.
- **timelineMap keys must be unique and stable.** Use the scheme defined
  in each prompt; don't invent new key patterns.
- **cablesEnabled is false by default.** The feature is opt-in per row.
  No row currently has cables — a manual config change is required to
  enable them, making it safe to merge without visual side effects.
