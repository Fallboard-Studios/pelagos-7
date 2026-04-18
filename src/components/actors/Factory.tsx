import React, { useMemo } from 'react';

import type { Actor } from '../../types/Actor';
import { selectVariantFromSeed, VARIANT_CONF } from './factoryVariants';
import { getRowConfig } from '../../systems/factoryPlacementSystem';
import { calcSilhouetteSize, bottomAnchorTransform } from './silhouetteUtils';
import { applyColorShift, shiftHSL, clamp } from '../../utils/colorUtils';
import { getLighting, getNightDepth, FLICKER_PERIOD, FILL_TRANSITION, DAY_CYCLE_MEASURES } from '../../utils/lightingUtils';
import { ROOFTOP_RENDERERS } from './greebles/rooftopGreebles';
import { FACADE_RENDERERS } from './greebles/facadeGreebles';
import type { GreebleRendererContext } from './greebles/greebleTypes';
import useLocaleStore from '../../stores/localeStore';
import { usePlanetStore } from '../../stores/planetStore';
import BubbleStream from './BubbleStream';
import type { FactoryPurpose } from './factoryVariants';

// ========================================
// DEBUG LIGHTING
// ========================================

/** Named lighting presets for visual testing.
 * east = sun-facing side multiplier, west = shadow-side multiplier.
 * Values >1 are valid (boost lightness beyond base).
 */
const LIGHTING_PRESETS = {
  dawn: { east: 1.1, west: 0.45 },
  morning: { east: 1.0, west: 0.6 },
  noon: { east: 0.9, west: 0.85 },
  evening: { east: 0.55, west: 1.0 },
  night: { east: 0.3, west: 0.3 },
} as const;

/**
 * Set to one of the preset keys to preview lighting.
 * Set to `null` to use the live day/night cycle driven by `currentMeasure`.
 */
const DEBUG_LIGHTING_PRESET = null as keyof typeof LIGHTING_PRESETS | null;
// const DEBUG_LIGHTING_PRESET = "morning" as keyof typeof LIGHTING_PRESETS | null;

// ========================================
// CONSTANTS
// ========================================

/** Belt course thickness in normalised 0-100 SVG units. */
const BELT_H = 2;

// purposes eligible for bubble vents
const BUBBLE_PURPOSES: Set<FactoryPurpose> = new Set([
  'heavyIndustry',
  'chemicalProcessing',
  'pipeWorks',
  'storageLogistics'
]);

// ========================================
// COMPONENT
// ========================================

interface FactoryProps {
  actor: Actor;
}



const FactoryInner: React.FC<FactoryProps> = ({ actor }) => {
  // Procedurally generate silhouette configuration
  const config = useMemo(() => {
    const row = actor.config?.row ?? 1;
    const rowCfg = getRowConfig(row);
    const available = rowCfg?.availableFactoryTypes;
    return selectVariantFromSeed(actor.id, actor.position.x, row, available);
  }, [actor.id, actor.position.x, actor.config?.row]);

  const sizeRange = VARIANT_CONF[config.variant].sizeRange;
  const { width, height } = calcSilhouetteSize(config.noiseValue, sizeRange);

  // compute body fills — east/west split prepares for day/night system
  const hueShift = actor.config?.hueShift ?? 0;
  const satShift = actor.config?.satShift ?? 0;
  const shift = { hueShift, satShift };
  const frontCornerX = config.frontCornerX;

  // Per-building phase offset (0..FLICKER_PERIOD-1) staggers window rerolls
  // across FLICKER_PERIOD consecutive measures so no two buildings re-render
  // in the same frame at an epoch boundary.
  const buildingSeed = parseInt(actor.id.slice(0, 8), 16) || 0;
  const buildingPhase = buildingSeed % FLICKER_PERIOD;

  // Resolve east/west lightness multipliers:
  // debug preset overrides the live cycle (useful for visual testing).
  //
  // lightMeasure: derived from the world time-of-day (fractional hour)
  // so building fills update smoothly based on real wall-clock time. We
  // convert `currentHour` (0..24 float) into the 0..DAY_CYCLE_MEASURES range
  // expected by `getLighting`.
  const localeId = usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '');
  const bpm = useLocaleStore(state => state.locales[localeId]?.settings?.bpm ?? 120);
  const lightMeasure = useLocaleStore(state => (state.locales[localeId]?.currentMeasure ?? 0));
  // flickerEpoch: phased per building so window rerolls are spread across
  // FLICKER_PERIOD consecutive measures rather than all firing at once.
  const flickerEpoch = useLocaleStore(state =>
    Math.floor(((state.locales[localeId]?.currentMeasure ?? 0) + buildingPhase) / FLICKER_PERIOD)
  );

  const preset = DEBUG_LIGHTING_PRESET ? LIGHTING_PRESETS[DEBUG_LIGHTING_PRESET] : null;

  // Map the quantised `lightMeasure` (0..dayLength-1) into the 0..95 cycle
  // expected by `getLighting`. This keeps the relative sun position correct
  // even when `dayLengthMeasures` is changed from the default 96.
  const eastLMultiplier = (() => {
    if (preset) return preset.east;
    const cycleMeasure = lightMeasure % DAY_CYCLE_MEASURES;
    return getLighting(cycleMeasure).eastL;
  })();
  const westLMultiplier = (() => {
    if (preset) return preset.west;
    const cycleMeasure = lightMeasure % DAY_CYCLE_MEASURES;
    return getLighting(cycleMeasure).westL;
  })();

  const nightDepth = getNightDepth(eastLMultiplier, westLMultiplier);
  /** Average used for elements spanning the full roof width */
  const roofLMultiplier = (eastLMultiplier + westLMultiplier) / 2;

  // Pre-shift the palette so all greebles (roof + facade) share the
  // building's per-instance hue/sat variation.
  const rawColors = VARIANT_CONF[config.variant].colors;

  const shiftedColors = {
    body: shiftHSL(rawColors.body, shift),
    accent: shiftHSL(rawColors.accent, shift),
    greeble: shiftHSL(rawColors.greeble, shift),
    illuminated: shiftHSL(rawColors.illuminated, shift),
  };

  // --- bubble vent helper values; actualWidth/Height calculated below
  const isOffline = actor.config?.isOffline ?? false;
  const isActive = !isOffline;

  // Apply lightness multipliers to body color using already-shifted palette
  const eastFill = applyColorShift(shiftedColors.body, { hueShift: 0, satShift: 0 }, eastLMultiplier);
  const westFill = applyColorShift(shiftedColors.body, { hueShift: 0, satShift: 0 }, westLMultiplier);

  const transform = bottomAnchorTransform(actor, height);
  const safeId = String(actor.id).replace(/[^a-zA-Z0-9-_]/g, '-');
  const bodyClipId = `body-clip-${safeId}`;
  const westClipId = `west-clip-${safeId}`;

  // Actual pixel dimensions after actor scale is applied.
  // The scale group inside multiplies by (scaleX/Y ?? 1), so rooftop greebles —
  // which render outside that group — must use these values, not bare width/height.
  const actualWidth = width * (actor.scaleX ?? 1);
  const actualHeight = height * (actor.scaleY ?? 1);

  // --- bubble vent coordinates (scene space) ---------------------------------
  const ventXnorm = (buildingSeed % 60) + 20; // 20–80% of normalised width
  // ventXPx is the local building offset; add actor.position.x for world space
  const ventXWorld = actor.position.x + (ventXnorm / 100) * actualWidth;
  // ventY is top edge of building in world coords
  const ventY = actor.position.y - actualHeight;

  // build context for any greeble renderer
  const ctx: GreebleRendererContext = {
    buildingWidth: width,
    buildingHeight: height,
    roofY: 1, // 1px overlap into building top prevents sub-pixel seam
    seed: buildingSeed,
    colors: shiftedColors,
    lMultiplier: roofLMultiplier,
    eastLMultiplier,
    westLMultiplier,
    frontCornerX,
    nightDepth,
    flickerEpoch,
  };

  const rooftopElement =
    actor.config?.rooftopGreeble
      ? ROOFTOP_RENDERERS[actor.config.rooftopGreeble]({
        ...ctx,
        // Rooftop greebles render outside the scale group, so they need the
        // actual rendered pixel dimensions rather than the normalized values.
        buildingWidth: actualWidth,
        buildingHeight: actualHeight,
        frontCornerX: (frontCornerX / 100) * actualWidth,
      })
      : null;

  // ----------------------------------------
  // Facade: belt courses + window zones
  // ----------------------------------------
  const beltCourseCount = actor.config?.beltCourseCount ?? 0;
  const facadeGreeble = actor.config?.facadeGreeble;

  let facadeContent: React.ReactElement | null = null;
  let beltContent: React.ReactElement | null = null;
  if (facadeGreeble) {
    if (beltCourseCount === 0) {
      // No belt courses — windows span full facade height
      facadeContent = FACADE_RENDERERS[facadeGreeble](ctx);
    } else {
      // Divide facade into (beltCourseCount + 1) window zones separated by belt rects
      const totalBeltH = beltCourseCount * BELT_H;
      const zoneH = (100 - totalBeltH) / (beltCourseCount + 1);
      const accentBase = shiftedColors.accent;
      const beltAccent = { ...accentBase, l: clamp(accentBase.l + 5, 0, 100) };
      const noShift = { hueShift: 0, satShift: 0 };
      const eastBeltFill = applyColorShift(beltAccent, noShift, eastLMultiplier);
      const westBeltFill = applyColorShift(beltAccent, noShift, westLMultiplier);

      const zoneElements: React.ReactElement[] = [];
      const beltElements: React.ReactElement[] = [];
      for (let i = 0; i <= beltCourseCount; i++) {
        const zoneY = i * (zoneH + BELT_H);
        const zoneCtx: GreebleRendererContext = {
          ...ctx,
          zoneY,
          zoneHeight: zoneH,
          // independent seed per zone for varied window patterns
          seed: ctx.seed + 1000 * (i + 1),
        };
        const zoneEl = FACADE_RENDERERS[facadeGreeble](zoneCtx);
        if (zoneEl) {
          zoneElements.push(<React.Fragment key={`zone-${i}`}>{zoneEl}</React.Fragment>);
        }
        // Belt separators: left rect = west face, right rect = east face
        if (i < beltCourseCount) {
          const by = zoneY + zoneH;
          beltElements.push(
            <React.Fragment key={`belt-${i}`}>
              <rect x={0} y={by} width={frontCornerX} height={BELT_H} fill={westBeltFill} style={{ transition: FILL_TRANSITION }} />
              <rect x={frontCornerX} y={by} width={100 - frontCornerX} height={BELT_H} fill={eastBeltFill} style={{ transition: FILL_TRANSITION }} />
            </React.Fragment>
          );
        }
      }
      facadeContent = <>{zoneElements}</>;
      beltContent = <>{beltElements}</>;
    }
  }

  // Derive bubble depth scale from the row layer label.
  // foreground rows get full-size bubbles; midground = half; background = one-third.
  const rowLabel = getRowConfig(actor.config?.row ?? 0)?.row;
  const bubbleDepthScale = rowLabel === 'background' ? 1 / 3 : rowLabel === 'midground' ? 0.5 : 1;

  return (
    <>
      <g
        transform={transform}
        data-factory-type={config.variant}
        data-rooftop-greeble={actor.config?.rooftopGreeble ?? 'none'}
        data-facade-greeble={actor.config?.facadeGreeble ?? 'none'}
      >
        <defs>
          {/* Full body clip — keeps facade greebles inside building bounds */}
          <clipPath id={bodyClipId}>
            <rect x="2" y="2" width="96" height="96" />
          </clipPath>
          {/* Right-face clip (x ≥ frontCornerX) — left/west is the base rect */}
          <clipPath id={westClipId}>
            <rect x={frontCornerX} y={0} width={100 - frontCornerX} height={100} />
          </clipPath>
        </defs>

        <g transform={`scale(${(width * (actor.scaleX ?? 1)) / 100}, ${(height * (actor.scaleY ?? 1)) / 100})`}>
          {/* Body: base rect = left (west) face; overlay clipped to right (east) face */}
          <rect x="0" y="0" width="100" height="100" fill={westFill} style={{ transition: FILL_TRANSITION }} />
          <g clipPath={`url(#${westClipId})`}>
            <rect x="0" y="0" width="100" height="100" fill={eastFill} style={{ transition: FILL_TRANSITION }} />
          </g>
          {/* Facade greebles clipped to body bounds */}
          <g clipPath={`url(#${bodyClipId})`}>{facadeContent}</g>
          {/* Belt separators rendered outside the body clip so they span full width */}
          {beltContent}
        </g>
        {/* rooftop greeble rendered outside scaled group so it's not clipped */}
        {rooftopElement}
      </g>
      {/* end scaled/positioned factory group */}

      {/* bubble vent animation (scene coordinates) - placed outside transform group */}
      {
        BUBBLE_PURPOSES.has(actor.config?.purpose ?? 'heavyIndustry') && (
          <BubbleStream
            actorId={actor.id}
            ventX={ventXWorld}
            ventY={ventY}
            seed={buildingSeed}
            isActive={isActive}
            bpm={bpm}
            bodyHue={shiftedColors.body.h}
            depthScale={bubbleDepthScale}
          />
        )
      }
    </>
  );
};

/**
 * Factory building component. Wrapped in React.memo because factory actors
 * are static after spawn — prevents re-renders driven by robot state updates.
 */
export const Factory = React.memo(FactoryInner);
export default Factory;
