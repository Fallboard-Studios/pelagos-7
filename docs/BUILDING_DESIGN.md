# Factory Visual Design Guide (Silhouette System)

## Overview

Factories are opaque rectangular silhouettes placed along the ocean floor.
Their size, placement, and depth row give the scene a sense of parallax and
scale. Every factory shares the same rectangular base shape; skyline variety
comes from **rooftop greebles** (machinery, antennae, spires, etc.) while
facade variety comes from window styles and belt courses. Additional visual
variation comes from a deterministic pseudorandom process seeded by the
actor ID and horizontal position. `Alea` + `simplex-noise` produce a noise
value which drives variant choice, sizing, and per-instance colour shifts.

**Key source files:**

| File | Purpose |
|------|---------|
| `src/components/actors/Factory.tsx` | Renders the silhouette + greebles for a given actor |
| `src/components/actors/factoryVariants.ts` | `VARIANT_CONF`, variant selection, type definitions |
| `src/components/actors/silhouetteUtils.ts` | Colour math, sizing, greeble generation, anchor transforms |
| `src/systems/factoryPlacementSystem.ts` | Row configs, placement logic |
| `src/constants/colorTheme.json` | Canonical HSL palette (see §Color System) |

---

## Design Philosophy

- **Silhouette-First:** Buildings are identified by their outline. Interior
  detail is decorative only — never load-bearing for readability.
- **90/45 Rule:** Outlines use only vertical, horizontal, or 45-degree
  lines. This keeps forms readable at a glance and fits the salvaged
  industrial aesthetic.
- **Atmospheric Depth:** Per-row L-range compression pushes distant rows
  toward darker, flatter tones. Close rows can reach full brightness;
  far rows cap out lower.
- **Deterministic Randomness:** Every visual property of a factory
  (variant, size, colour shift, greeble selection) is derived from a
  seeded PRNG. Reloading the scene produces identical buildings.

---

## SVG Rules

- **Universal Rectangle:** All factory silhouettes share a single
  rectangular path (`M0,100 L0,0 L100,0 L100,100 Z`) in a 0–100
  viewBox. There are no per-variant path shapes. Skyline variety is
  created entirely by rooftop greebles rendered above the rectangle.
- **Body Clip Path:** A single inset rectangle (`M2,98 V2 H98 V98 Z`)
  masks facade greebles so they don't bleed past silhouette edges.
  Because every factory is the same shape, one clip path definition
  can be shared.
- **Ground Locking:** The bottom of every silhouette aligns to `y=100` in
  the viewBox so that `bottomAnchorTransform` can drop it onto the
  seabed.
- **Front Corner Split:** Each variant defines a `frontCornerX` (0–100)
  that divides the rectangle into an *east facade* and a *west facade*
  for directional lighting (see §Day/Night Cycle). The split is
  rendered via complementary clip rects.

---

## Color System

### HSL Foundation

All factory colours are stored and manipulated in **HSL** (`h: 0–360`,
`s: 0–100`, `l: 0–100`). The canonical palette in
`src/constants/colorTheme.json` is the single source of truth and is
authored directly in HSL format.

### Per-Variant Palette

Each entry in `VARIANT_CONF` defines four base HSL colours:

```typescript
interface VariantColorConfig {
  body: HSL;          // Main silhouette fill
  accent: HSL;        // Secondary structural elements (belt courses, trim)
  greeble: HSL;       // Daytime window / facade detail colour
  illuminated: HSL;   // Night-time lit-window colour (high L)
}
```

### Per-Variant Shift Ranges

Variants also declare the allowed per-instance hue and saturation
variation:

```typescript
colorRanges: {
  hueShiftRange: [minDelta, maxDelta],   // e.g. [-15, 15]
  satShiftRange: [minDelta, maxDelta],   // e.g. [-10, 10]
}
```

### Per-Instance Colour Shift

At spawn time the factory's seed picks a deterministic `hueShift` and
`satShift` within the variant's allowed ranges. These two numbers are
stored on `Actor.config` (serialisable) and remain fixed for the
factory's lifetime. **Only L changes over time** (driven by the day/night
cycle).

```typescript
// Stored on Actor.config
interface ColorShift {
  hueShift: number;
  satShift: number;
}
```

### Applying Colour

A single utility replaces the old hex-based pipeline:

```typescript
function applyColorShift(
  base: HSL,
  shift: ColorShift,
  lMultiplier: number, // 0–1, from day/night curve
): string {
  const h = (base.h + shift.hueShift + 360) % 360;
  const s = clamp(base.s + shift.satShift, 0, 100);
  const l = base.l * lMultiplier;
  return `hsl(${h}, ${s}%, ${l}%)`;
}
```

### Greeble Colours

- **Structural greebles** (rooftop machinery, belt courses) inherit the
  factory's shifted H and S and follow the same facade L curve as the
  surface they sit on. Belt courses use the `accent` HSL with a subtle L
  bump (+3–5%) relative to the surrounding facade fill.
- **Window greebles** use the `greeble` HSL during the day (low L) and
  crossfade toward `illuminated` HSL at night (high L), effectively
  inverting the facade's lighting pattern to produce glowing windows in
  darkness.

### Atmospheric Depth (Per-Row L Offset)

Farther depth rows have a compressed L range — their maximum attainable
lightness is capped below 100%. This simulates atmospheric perspective
underwater.

| Row depth | Max L | Notes |
|-----------|-------|-------|
| Foreground (closest) | 100% | Full brightness at midday |
| Mid-depth | ~80% | Slightly muted |
| Far depth | ~60–70% | Noticeably darker ceiling |

The per-row cap is multiplied into the day/night `lMultiplier` before it
reaches `applyColorShift`, so variant code doesn't need to be aware of it.

---

## Day/Night Cycle (Lightness Curve)

Pelagos-7 uses a **96-measure day/night cycle** (4 measures ≈ 1 "hour").
All non-illuminated factory colours have their L driven by a piecewise
linear function of the current measure. The function returns separate
multipliers for the east and west facades.

### Clock Mapping (2400-style reference)

| Measure | Clock | East L | West L | Description |
|---------|-------|--------|--------|-------------|
| 0–24 | 0000–0600 | 0% → 25% | 0% → 25% | Pre-dawn, uniform rise |
| 24–36 | 0600–0900 | 25% → 100% | 25% → 50% | Morning sun from east |
| 36–60 | 0900–1500 | 100% → 50% | 50% → 100% | Midday crossover |
| 60–72 | 1500–1800 | 50% → 25% | 100% → 25% | Afternoon fade |
| 72–96 | 1800–2400 | 25% → 0% | 25% → 0% | Dusk to midnight |

```typescript
function getFacadeLightness(
  currentMeasure: number,
  facing: 'east' | 'west',
): number {
  const m = currentMeasure % 96;
  // Piecewise linear interpolation returning 0–1
  // (implementation uses a lookup table of breakpoints)
}
```

### Integration

- A `Transport.scheduleRepeat` callback fires every 4 measures and writes
  `{ eastL, westL }` to the Zustand store. Components read these values
  reactively.
- The per-row atmospheric cap is applied on top:
  `effectiveL = facadeL * rowMaxL`.
- **Illuminated windows** (see §Greebles / Facade) use the *inverse* of
  the facade L curve: they brighten as the facade darkens.

### Front Corner Rendering

Each variant defines `frontCornerX` in viewBox coordinates (0–100). The
renderer draws the rectangular base **twice**, each clipped to one side:

```svg
<!-- Shared rectangular path -->
<!-- pathD = "M0,100 L0,0 L100,0 L100,100 Z" -->

<!-- East facade: left of frontCornerX -->
<clipPath id="east-clip-{id}">
  <rect x="0" y="0" width="{frontCornerX}" height="100" />
</clipPath>
<rect x="0" y="0" width="100" height="100" fill={eastFill}
      clip-path="url(#east-clip-{id})" />

<!-- West facade: right of frontCornerX -->
<clipPath id="west-clip-{id}">
  <rect x="{frontCornerX}" y="0" width="{100-frontCornerX}" height="100" />
</clipPath>
<rect x="0" y="0" width="100" height="100" fill={westFill}
      clip-path="url(#west-clip-{id})" />
```

Facade greebles on each side receive the L multiplier of their respective
facade. Rooftop greebles centred over the split use the average of
east/west L.

---

## Size System

### Size Ranges in VARIANT_CONF

Each variant defines a width and height range (in pixels) instead of fixed
native sizes:

```typescript
sizeRange: {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}
```

### calcSilhouetteSize

The noise value maps linearly within the range:

```typescript
function calcSilhouetteSize(noiseValue: number, range: SizeRange) {
  return {
    width:  lerp(range.minWidth,  range.maxWidth,  noiseValue),
    height: lerp(range.minHeight, range.maxHeight, noiseValue),
  };
}
```

The placement system's `computeFactoryWidth` call chain continues to work
— it simply reads from `sizeRange` instead of `nativeSizes`.

---

## Silhouette Variants

All variants share the same rectangular base shape. A variant is now a
**recipe** — a combination of size range, colour palette, greeble pool,
and front-corner position. The skyline silhouette of any given factory
is determined by its rooftop greeble(s), not by a custom path.

### Selection

Variant selection is noise-driven via `getVariantFromNoise` in
`factoryVariants.ts`. A provided list of allowed types is weighted by
order: earlier entries are more likely. Row configs pass custom lists to
bias certain layers.

```typescript
function selectVariantFromSeed(
  id: string, x = 0, row = 1, available?: FactoryVariant[],
) {
  const prng = Alea(id);
  const noise2D = createNoise2D(prng);
  const noiseValue = (noise2D(x / 100, 0) + 1) / 2;
  const variant = getVariantFromNoise(noiseValue, row, available);
  const scale = 0.8 + prng() * 0.4;
  return { variant, scale, noiseValue } as const;
}
```

### What a Variant Defines

With the rectangular base shape being universal, each variant in
`VARIANT_CONF` contributes:

| Field | Purpose |
|-------|---------|
| `sizeRange` | Width/height min–max (see §Size System) |
| `colors` | `VariantColorConfig` — body, accent, greeble, illuminated HSLs |
| `colorRanges` | Allowed per-instance hue/sat shift ranges |
| `frontCornerX` | East/west facade split point (0–100) |
| `greebleConfig` | Pools of allowed rooftop + facade greebles |

Note: `pathD` and `bodyClipPath` are **no longer per-variant**. A single
rectangular path and a single inset clip path are shared by all variants.
### Common Profiles

| Variant | Size Character | Typical Rooftop | Typical Use |
|---------|----------------|-----------------|-------------|
| **Monolith** | Wide, medium-tall | Steppe roof, machinery | Heavy industry |
| **Stacks** | Medium, tall | Crown spire, antennae | Processing plants |
| **Refinery** | Wide, short-medium | Machinery, pitched roof | Chemical/pipe works |
| **Skyscraper** | Narrow, very tall | Crown spire, antennae | Observation/comms |
| **Warehouse** | Wide, short | Pitched roof, steppe roof | Storage/logistics |

---

## Greeble System

Greebles are decorative details placed on factory silhouettes. They fall
into two categories: **rooftop** (above the building path) and **facade**
(inside the body clip path).

### VARIANT_CONF Greeble Declaration

Each variant lists the **pool** of allowed greeble types. At spawn time
the seed selects from the pool — no variant is hard-wired to a single
greeble.

```typescript
greebleConfig: {
  allowedRooftop: RooftopGreeble[];   // pool of possible rooftop details
  allowedFacade: FacadeGreeble[];     // pool of possible facade details
  maxRooftop?: number;                // max rooftop greebles (default: 1)
}
```

```typescript
type RooftopGreeble =
  | 'machinery'
  | 'antennae'
  | 'waterTower'
  | 'cupola'
  | 'crownSpire'
  | 'pitchedRoof'
  | 'steppeRoof';

type FacadeGreeble =
  | 'squareWindows'
  | 'wideWindows'
  | 'tallWindows'
  | 'beltCourse';
```

### Greeble Renderers

Each greeble type is implemented as a pure function:

```typescript
type GreebleRenderer = (ctx: {
  buildingWidth: number;   // computed pixel width
  buildingHeight: number;  // computed pixel height
  roofY: number;           // top of building in viewBox coords (rooftop only)
  seed: number;            // for deterministic randomness
  colors: {
    body: HSL;
    accent: HSL;
    greeble: HSL;
    illuminated: HSL;
  };
  lMultiplier: number;     // current facade L multiplier
}) => React.ReactElement;
```

---

### Rooftop Greebles

Rooftop greebles are rendered **above** the building path (lower y in SVG
viewBox coordinates). They are not clipped by the body clip path.

#### Machinery
- **Aspect ratio:** ~5 × 3
- **Drawing:** Iterate through columns; each column has a 30% chance of a
  stack appearing. Stack height is random up to the greeble's height
  dimension.

#### Antennae
- **Aspect ratio:** 2 × [5–20]
- **Drawing:** A single tall vertical line with a light at the top that
  flickers (via GSAP ticker-driven opacity pulse). If the aspect ratio
  is 1 × [>10], add a second light at the vertical centre that does
  **not** flicker.

#### Water Tower
- **Aspect ratio:** 1 × 3
- **Drawing:** Bottom third = support stilts, middle third = rectangle
  (tank body), top third = triangle (roof cap).

#### Cupola
- **Aspect ratio:** 4 × 3
- **Drawing:** A rounded dome that spans the full width of the roof
  section it sits on.

#### Crown Spire
- **Aspect ratio:** 3 × 4
- **Drawing:** A stepped/terraced roof attachment spanning the full roof
  width, topped with an antenna.

#### Pitched Roof
- **Aspect ratio:** 1 × 1
- **Drawing:** A right-triangle roof spanning the full roof width. The
  apex is the diagonal edge.

#### Steppe Roof
- **Aspect ratio:** varies (short)
- **Drawing:** Up to three progressively narrower horizontal tiers:
  bottom row ≈ 80% roof width, second ≈ 60%, third (if present) ≈ 40%.
  Each tier is ~1% of building height tall.

---

### Facade Greebles

Facade greebles are rendered **inside** the body clip path. Window grid
dimensions are derived from the computed building width and height rather
than being explicitly configured.

#### Window Grid Derivation

```typescript
function deriveWindowGrid(
  buildingWidth: number,
  buildingHeight: number,
  windowType: FacadeGreeble,
): { cols: number; rows: number; unitW: number; unitH: number } {
  const aspect = WINDOW_ASPECTS[windowType]; // e.g. { w: 1, h: 1 }
  const unit = Math.max(4, buildingWidth * 0.06);
  const cols = Math.floor(buildingWidth / (unit * aspect.w * 1.5));
  const rows = Math.floor(buildingHeight / (unit * aspect.h * 2));
  return {
    cols, rows,
    unitW: unit * aspect.w,
    unitH: unit * aspect.h,
  };
}
```

Wider buildings naturally get more columns; taller buildings get more rows.
Margins are computed from the remaining space.

#### Square Windows
- **Aspect ratio:** 1 × 1
- **Args:** rows, cols, margin-block, margin-row (all derived)
- **Drawing:** For each row, draw `cols` squares across the facade.
  Rows are `margin-block` apart; columns are `margin-row` apart.

#### Wide Windows
- **Aspect ratio:** 4 × 1
- **Args / Drawing:** Same grid logic as square windows with wider
  rectangles.

#### Tall Windows
- **Aspect ratio:** 1 × 4
- **Args / Drawing:** Same grid logic as square windows with taller
  rectangles.

#### Belt Course
- **Aspect ratio:** 100% facade width × a few % tall
- **Drawing:** A full-width horizontal stripe between floors. Colour is
  the variant's `accent` HSL with a subtle L bump (+3–5%) relative to
  the surrounding facade fill.
- **Count:** Derived from building height —
  `Math.floor(buildingHeight / threshold)`. Taller buildings get more
  courses.

---

### Window Illumination

Windows can individually turn on or off over time to give the impression
of life inside the buildings without creating a visually distracting sea
of flickering.

**Rules:**
- Each window has an `isLit` state seeded deterministically at spawn.
- At night (facade L < 25%), lit windows crossfade from `greeble` HSL to
  `illuminated` HSL over several measures.
- Periodically (every 8–16 measures, per-window seed), a small percentage
  of windows (~5–10%) toggle their `isLit` state. The transition is a
  slow opacity fade (1–2 measures), **not** a flicker.
- During daytime (facade L > 50%), all windows render at `greeble` HSL
  regardless of `isLit` — the illumination only manifests in darkness.
- The antennae light flicker is the **only** rapid-rate luminance change
  on buildings. Everything else is slow and sparse.

---

## Procedural Pipeline Summary

1. `factoryPlacementSystem` creates actors with seeded IDs and row
   assignments.
2. `selectVariantFromSeed` picks a variant, noise value, and base scale.
3. `calcSilhouetteSize` maps noise → concrete width/height within the
   variant's `sizeRange`.
4. Per-instance `hueShift` and `satShift` are derived from the seed and
   stored on `Actor.config`.
5. The seed selects rooftop greeble(s) from the variant's
   `allowedRooftop` pool and a facade greeble type from
   `allowedFacade`. These define the factory's unique silhouette.
6. At render time, `Factory.tsx` reads the current `{ eastL, westL }`
   from the store, applies the per-row atmospheric cap, and renders:
   - The universal rectangular base, split at `frontCornerX` into
     east and west facade fills
   - Facade greebles (clipped by the shared body clip rect, L per
     facade side)
   - Rooftop greebles (unclipped, rendered above the rectangle —
     these create the factory's skyline profile)

---

## Implementation Order

| Step | Scope | Depends on |
|------|-------|------------|
| 1 | HSL colour system — migrate palette, `applyColorShift`, replace hex utils | — |
| 2 | Size ranges in `VARIANT_CONF` — replace `nativeSizes`, update `calcSilhouetteSize` | — |
| 3 | Front corner + east/west facade split rendering | Step 1 |
| 4 | Day/night L function + per-row atmospheric cap | Steps 1, 3 |
| 5 | Greeble registry + rooftop greeble renderers (incremental, one type at a time) | Step 2 |
| 6 | Facade greeble types (windows, belt course) — replaces current window rects | Steps 2, 4 |
| 7 | Window illumination system | Steps 4, 6 |
