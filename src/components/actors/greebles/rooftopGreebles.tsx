import React from 'react';
import type { RooftopGreeble, GreebleRendererContext, GreebleRenderer, GreebleElement } from './greebleTypes';
import { hslToString, applyColorShift } from '../../../utils/colorUtils';
import { FILL_TRANSITION } from '../../../utils/lightingUtils';
import colorTheme from '../../../constants/colorTheme.json';

// ========================================
// ROOFTOP GREEBLE RENDERERS
// ========================================

/**
 * Renders a procedural machinery cluster on the rooftop. The building width
 * is divided into 5-8 equal columns; each column has a 30% seeded chance of
 * sporting a stack rectangle (height 3-10% of building height). Determinism
 * is guaranteed by a local LCG seeded from `ctx.seed`.
 * Returns `null` when no stacks are generated.
 *
 * @param ctx - The greeble renderer context providing dimensions and colors.
 * @returns A React fragment of stack rects, or null if no stacks generated.
 */
export function renderMachinery(ctx: GreebleRendererContext): GreebleElement | null {
  const { buildingWidth: bw, buildingHeight: bh, roofY, seed } = ctx;

  const colCount = Math.min(8, 5 + Math.floor(bw / 40)); // 5-8 columns
  const colW = bw / colCount;
  const stackW = Math.max(4, colW * 0.4);
  const fill = hslToString(ctx.colors.accent);

  let r = seed;
  const prng = (): number => {
    r = (r * 1664525 + 1013904223) & 0xffffffff;
    return (r >>> 0) / 2 ** 32;
  };

  const stacks: GreebleElement[] = [];
  for (let i = 0; i < colCount; i++) {
    if (prng() < 0.3) {
      const stackH = bh * (0.03 + prng() * 0.07); // 3-10% of building height
      const cx = colW * i + colW / 2;
      const x = cx - stackW / 2;
      const y = roofY - stackH;
      stacks.push(<rect key={i} x={x} y={y} width={stackW} height={stackH} fill={fill} />);
    }
  }

  if (stacks.length === 0) return null;
  return <>{stacks}</>;
}

/**
 * Renders a steppe (ziggurat) roof with 1-3 progressively narrower tiers.
 * Tier count is derived deterministically from the seed (1-3 tiers).
 * Each tier is 2% of building height, centered, and uses 80/60/40% of build width.
 *
 * @param ctx - The greeble renderer context providing dimensions and colors.
 * @returns A React fragment containing the stacked tier rectangles.
 */
export function renderSteppeRoof(ctx: GreebleRendererContext): GreebleElement | null {
  const tierCount = 1 + (ctx.seed % 3); // 1..3 tiers based on seed
  const tierWidthPcts = [0.8, 0.6, 0.4] as const;
  const tierH = ctx.buildingHeight * 0.02; // 2% of building height per tier
  const fill = hslToString(ctx.colors.accent);

  const tiers: GreebleElement[] = [];
  for (let i = 0; i < tierCount; i++) {
    const w = ctx.buildingWidth * tierWidthPcts[i];
    const x = (ctx.buildingWidth - w) / 2; // centre each tier
    const y = ctx.roofY - tierH * (i + 1); // stack upward from roof
    tiers.push(<rect key={i} x={x} y={y} width={w} height={tierH} fill={fill} />);
  }

  return <>{tiers}</>;
}

/**
 * Renders a pitched roof with a lean-to profile matching the building's
 * pseudo-3/4 perspective:
 *
 * - **Front slope** (west face, lighter): a triangle from the full front-face
 *   base up to the ridge at `frontCornerX`. The slope diagonal faces the viewer.
 * - **Side wall** (east face, darker): a flat vertical rectangle spanning the
 *   side face at the same ridge height — reads as a straight-up parapet wall.
 *
 * The two polygons share a vertical edge at `x = frontCornerX`. Ridge height
 * equals the front-face width (1:1 pitch on the visible slope).
 *
 * Falls back to a single centred triangle when lighting context is absent.
 *
 * @param ctx - The greeble renderer context providing dimensions and colors.
 * @returns A React SVG element forming the roof.
 */
export function renderPitchedRoof(ctx: GreebleRendererContext): GreebleElement | null {
  const { buildingWidth: bw, roofY, frontCornerX, eastLMultiplier, westLMultiplier } = ctx;

  if (frontCornerX !== undefined && eastLMultiplier !== undefined && westLMultiplier !== undefined) {
    const h = frontCornerX;
    const ridgeY = roofY - h;

    // Front slope: right triangle — base along eave, vertical right edge at corner.
    const slopePoints = `0,${roofY} ${frontCornerX},${roofY} ${frontCornerX},${ridgeY}`;
    // Side wall: flat rectangle — straight vertical parapet over the side face.
    const wallPoints = `${frontCornerX},${ridgeY} ${bw},${ridgeY} ${bw},${roofY} ${frontCornerX},${roofY}`;

    const noShift = { hueShift: 0, satShift: 0 };
    const westFill = applyColorShift(ctx.colors.accent, noShift, westLMultiplier);
    const eastFill = applyColorShift(ctx.colors.accent, noShift, eastLMultiplier);

    return (
      <>
        <polygon points={slopePoints} fill={westFill} style={{ transition: FILL_TRANSITION }} />
        <polygon points={wallPoints} fill={eastFill} style={{ transition: FILL_TRANSITION }} />
      </>
    );
  }

  const h = bw;
  const apexX = frontCornerX ?? bw / 2;
  const points = `0,${roofY} ${bw},${roofY} ${apexX},${roofY - h}`;
  return <polygon points={points} fill={hslToString(ctx.colors.accent)} />;
}

/**
 * Renders a step-pyramid (ziggurat) crown spire above the roofline.
 *
 * **Shaded path** (when `frontCornerX`, `eastLMultiplier`, `westLMultiplier`
 * are all present): Each tier produces two rects sharing a vertical edge at
 * `frontCornerX`:
 * - Front face (west, lighter): insets from the left each tier.
 * - Side face  (east, darker):  insets from the right each tier.
 * The antenna rod sits centred on the top tier’s front face.
 *
 * **Fallback path** (no lighting context): original centered rectangles
 * — preserves the existing 2D silhouette when context is absent.
 *
 * @param ctx - The greeble renderer context providing dimensions and colors.
 * @returns A React fragment containing tier rectangles and an antenna rect.
 */
export function renderCrownSpire(ctx: GreebleRendererContext): GreebleElement | null {
  const { buildingWidth: bw, buildingHeight: bh, roofY, seed, frontCornerX, eastLMultiplier, westLMultiplier } = ctx;
  const stepCount = 2 + (seed % 2); // 2 or 3 tiers from seed
  const totalStepH = bh * 0.15;
  const stepH = totalStepH / stepCount;
  // How aggressively each face insets per tier (0 = no inset at bottom, 1 = full width at top)
  const INSET_RATE = 0.65;

  const elements: GreebleElement[] = [];

  if (frontCornerX !== undefined && eastLMultiplier !== undefined && westLMultiplier !== undefined) {
    const noShift = { hueShift: 0, satShift: 0 };
    const westFill = applyColorShift(ctx.colors.accent, noShift, westLMultiplier);
    const eastFill = applyColorShift(ctx.colors.accent, noShift, eastLMultiplier);

    for (let i = 0; i < stepCount; i++) {
      const t = i / stepCount; // 0 at bottom, approaches 1 at top
      const y = roofY - stepH * (i + 1);

      // Front face: right edge fixed at frontCornerX; left edge steps inward
      const leftX = frontCornerX * t * INSET_RATE;
      const frontW = frontCornerX - leftX;

      // Side face: left edge fixed at frontCornerX; right edge steps inward
      const sideW = (bw - frontCornerX) * (1 - t * INSET_RATE);

      elements.push(
        <rect key={`front-${i}`} x={leftX} y={y} width={frontW} height={stepH} fill={westFill} style={{ transition: FILL_TRANSITION }} />,
        <rect key={`side-${i}`} x={frontCornerX} y={y} width={sideW} height={stepH} fill={eastFill} style={{ transition: FILL_TRANSITION }} />,
      );
    }

    const topT = (stepCount - 1) / stepCount;
    const topLeftX = frontCornerX * topT * INSET_RATE;
    const topFrontW = frontCornerX - topLeftX;
    const antennaW = 2;
    const antennaH = bh * 0.08;
    const antennaX = topLeftX + topFrontW / 2 - antennaW / 2;
    const antennaY = roofY - totalStepH - antennaH;
    elements.push(
      <rect key="antenna" x={antennaX} y={antennaY} width={antennaW} height={antennaH} fill={westFill} style={{ transition: FILL_TRANSITION }} />,
    );
  } else {
    const widthPcts2 = [1.0, 0.5] as const;
    const widthPcts3 = [1.0, 0.65, 0.3] as const;
    const widthPcts = stepCount === 2 ? widthPcts2 : widthPcts3;
    const fill = hslToString(ctx.colors.accent);

    for (let i = 0; i < stepCount; i++) {
      const w = bw * widthPcts[i];
      const x = (bw - w) / 2;
      const y = roofY - stepH * (i + 1);
      elements.push(<rect key={`step-${i}`} x={x} y={y} width={w} height={stepH} fill={fill} />);
    }

    const antennaW = 2;
    const antennaH = bh * 0.08;
    const antennaX = (bw - antennaW) / 2;
    const antennaY = roofY - totalStepH - antennaH;
    elements.push(
      <rect key="antenna" x={antennaX} y={antennaY} width={antennaW} height={antennaH} fill={fill} />,
    );
  }

  return <>{elements}</>;
}

/**
 * Renders a single antenna: a tall vertical shaft with an indicator light at
 * the top. If the antenna is taller than 15% of building height, a second
 * static mid-point light is added (flicker animation deferred to later).
 *
 * Shaft width: 2-4px (seeded); height: 10-25% of building height (seeded).
 * Indicator light color: colorTheme.indicator.powered.
 *
 * @param ctx - The greeble renderer context providing dimensions and colors.
 * @returns A React fragment containing the shaft rect and light circle(s).
 */
export function renderAntennae(ctx: GreebleRendererContext): GreebleElement | null {
  const { buildingWidth: bw, buildingHeight: bh, roofY, seed } = ctx;

  // Derive shaft dimensions from seed
  const lineW = 2 + (seed % 3); // 2, 3, or 4 px
  const heightPct = 0.1 + (seed % 100) / 100 * 0.15; // 10-25% of bh
  const lineH = bh * heightPct;
  const isTall = heightPct > 0.15;

  const lineX = (bw - lineW) / 2;
  const lineY = roofY - lineH;

  const shaftFill = hslToString(ctx.colors.accent);
  const lightFill = hslToString(colorTheme.indicator.powered);
  const lightR = Math.max(2, lineW * 1.5);

  const elements: GreebleElement[] = [
    <rect key="shaft" x={lineX} y={lineY} width={lineW} height={lineH} fill={shaftFill} />,
    <circle key="top-light" cx={bw / 2} cy={lineY} r={lightR} fill={lightFill} />,
  ];

  if (isTall) {
    const midY = lineY + lineH * 0.5;
    elements.push(
      <circle key="mid-light" cx={bw / 2} cy={midY} r={lightR} fill={lightFill} />,
    );
  }

  return <>{elements}</>;
}

/**
 * Renders a water tower composed of three vertical sections:
 * - Bottom third: 2-4 evenly-spaced support stilts (2px-wide rects)
 * - Middle third: a solid rectangular tank body
 * - Top third: a triangular cap (polygon)
 *
 * Width is ~15% of building width; total height is 15-20% of building height,
 * both derived deterministically from `ctx.seed`. Tower is horizontally centred.
 *
 * @param ctx - The greeble renderer context providing dimensions and colors.
 * @returns A React fragment containing stilt rects, body rect, and cap polygon.
 */
export function renderWaterTower(ctx: GreebleRendererContext): GreebleElement | null {
  const { buildingWidth: bw, buildingHeight: bh, roofY, seed } = ctx;

  const totalH = bh * (0.15 + (seed % 6) * (0.05 / 5)); // 15-20% of building height
  const totalW = bw * 0.15;
  const thirdH = totalH / 3;
  const leftX = (bw - totalW) / 2;
  const fill = hslToString(ctx.colors.accent);

  const elements: GreebleElement[] = [];

  elements.push(
    <rect key="body" x={leftX} y={roofY - 2 * thirdH} width={totalW} height={thirdH} fill={fill} />,
  );

  const capBaseY = roofY - 2 * thirdH; // bottom of cap = top of body
  const capPoints =
    `${leftX},${capBaseY} ${leftX + totalW},${capBaseY} ${leftX + totalW / 2},${roofY - totalH}`;
  elements.push(<polygon key="cap" points={capPoints} fill={fill} />);

  const stiltCount = 2 + (seed % 3); // 2, 3, or 4 stilts
  const stiltW = 2;
  const stiltH = thirdH;
  const stiltY = roofY - thirdH;
  const slotW = totalW / stiltCount;
  for (let i = 0; i < stiltCount; i++) {
    const stiltX = leftX + slotW * i + slotW / 2 - stiltW / 2; // centred in slot
    elements.push(
      <rect key={`stilt-${i}`} x={stiltX} y={stiltY} width={stiltW} height={stiltH} fill={fill} />,
    );
  }

  return <>{elements}</>;
}

/**
 * Renders a rounded cupola dome above the roofline using an SVG arc path.
 * The dome spans 40-60% of building width (seeded) and rises ~12% of building
 * height. The arc traces the upper half of an ellipse, filled with the accent
 * color, with a straight line closing the base along `roofY`.
 *
 * @param ctx - The greeble renderer context providing dimensions and colors.
 * @returns A React SVG path element forming the filled dome shape.
 */
export function renderCupola(ctx: GreebleRendererContext): GreebleElement | null {
  const { buildingWidth: bw, buildingHeight: bh, roofY, seed } = ctx;

  const cupolaW = bw * (0.4 + (seed % 100) / 100 * 0.2); // 40-60% of building width
  const cupolaH = bh * 0.12; // 12% of building height
  const cx = bw / 2;
  const rx = cupolaW / 2;
  const ry = cupolaH;

  // Upper half of an ellipse: arc from left edge to right edge along roofY,
  // sweeping clockwise (sweep-flag=1) which traces through the top of the dome.
  const d = `M ${cx - rx},${roofY} A ${rx},${ry} 0 0 1 ${cx + rx},${roofY} Z`;

  return <path d={d} fill={hslToString(ctx.colors.accent)} />;
}

// ========================================
// ANIMATION UTILITIES
// ========================================

/**
 * Stub utility for attaching a GSAP ticker-driven flicker animation to an
 * antenna indicator light element. Full implementation is deferred to a later
 * refinement pass.
 *
 * Future implementation will:
 *   1. Read the element via `ref.current` — do NOT use `document.getElementById()`.
 *   2. Register a `gsap.ticker.add()` handler that varies `opacity` slightly
 *      each frame to simulate a real-world indicator blink.
 *   3. Return a cleanup that calls `gsap.ticker.remove()` to prevent leaks.
 *
 * @param _ref - React ref pointing to the SVG circle element to animate (unused until implemented).
 * @returns A cleanup function that removes the ticker listener (currently a no-op).
 */
export function attachFlickerAnimation(_ref: React.RefObject<SVGCircleElement | null>): () => void {
  return () => { };
}

// ---------------------------------------
// pipes & valves renderer
// ---------------------------------------

/**
 * Renders a handful of horizontal/vertical pipe segments with round valve
 * discs attached. Pipes are laid out along the roof with a simple LCG pattern
 * seeded from `ctx.seed`. Valves are circles at pipe junctions. Primarily
 * uses `ctx.colors.greeble` for fill.
 */
export function renderPipesValves(ctx: GreebleRendererContext): GreebleElement | null {
  const { buildingWidth: bw, buildingHeight: bh, roofY, seed } = ctx;
  const fill = hslToString(ctx.colors.greeble);
  let s = seed + 500;
  const prng = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const elements: GreebleElement[] = [];
  // up to 4 pipes
  const count = 2 + Math.floor(prng() * 3);
  for (let i = 0; i < count; i++) {
    const isHorizontal = prng() < 0.5;
    if (isHorizontal) {
      // horizontal pipes hug the roofline; small vertical jitter 0‑5px
      const y = roofY - (prng() * 5);
      const len = bw * (0.3 + prng() * 0.4);
      const x = prng() * (bw - len);
      elements.push(<rect key={`pipe-h-${i}`} x={x} y={y} width={len} height={2} fill={fill} />);
      // valve at the left end sitting on roof
      elements.push(<circle key={`valve-h-${i}`} cx={x} cy={y + 1} r={3} fill={fill} />);
    } else {
      // vertical pipes start at roof and descend
      const len = bh * (0.1 + prng() * 0.1); // somewhat longer
      const x = prng() * bw;
      const y = roofY - len;
      elements.push(<rect key={`pipe-v-${i}`} x={x} y={y} width={2} height={len} fill={fill} />);
      // valve at top on roof
      elements.push(<circle key={`valve-v-${i}`} cx={x + 1} cy={roofY} r={3} fill={fill} />);
    }
  }
  return elements.length ? <>{elements}</> : null;
}

// ========================================
// EXPORTS
// ========================================

/** Registry mapping every RooftopGreeble variant to its renderer function. */
export const ROOFTOP_RENDERERS: Record<RooftopGreeble, GreebleRenderer> = {
  machinery: renderMachinery,
  antennae: renderAntennae,
  waterTower: renderWaterTower,
  cupola: renderCupola,
  crownSpire: renderCrownSpire,
  pitchedRoof: renderPitchedRoof,
  steppeRoof: renderSteppeRoof,
  pipesValves: renderPipesValves,
};
