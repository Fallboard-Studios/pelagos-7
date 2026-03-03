# Building Prompts: Factory Redesign Implementation

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
