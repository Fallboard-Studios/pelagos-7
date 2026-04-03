// ========================================
// IMPORTS
// ========================================
import { memo, useMemo } from 'react';

import type { Robot } from '../../types/Robot';
import {
  selectRobotShape,
  generateColors,
  shapeParamsFromAudio,
  calculateGreebleCount,
  calculateGreebleSize,
  calculateGreeblePersistence,
  calculateGreeblePlacementBias,
  calculateScale,
  calculateDetailLevel,
  applyLightnessMultiplier,
} from './robotVisualHelpers';
import mapVisualAudioToProps from './robotVisualMapper';
import type { RobotColors, RobotSVGComponent, ShapeParams, MicroVariants } from './robotVisualHelpers';
import { useOceanStore } from '../../stores/oceanStore';

// ========================================
// TYPES
// ========================================
interface RobotBodyProps {
  robot: Robot;
}

// ========================================
// COMPONENT
// ========================================
/**
 * RobotBody - Selects appropriate robot shape variant and calculates visual properties
 * from audio attributes. Memoized to prevent unnecessary recalculations.
 */
export const RobotBody = memo(function RobotBody({ robot }: RobotBodyProps) {
  const lightnessMultiplier = useOceanStore((s) => s.lightnessMultiplier);

  const visual = useMemo(() => {
    const { synthType, adsr, pitchRange, filterFreq, visualAudioMap } = robot.audioAttributes;

    const baseColors = generateColors(robot.audioAttributes);
    const colors = applyLightnessMultiplier(baseColors, lightnessMultiplier);

    // Prefer the spawn-time visualAudioMap via mapper when available.
    const mapped = mapVisualAudioToProps(visualAudioMap);

    // Convert mapped bodyShapeProps (scale, roundness, detail) into the
    // component-specific ShapeParams expected by SVG components.
    const bodyShape = mapped.bodyShapeProps ?? { scale: 0.5, roundness: 0.5, detail: 0.3 };
    const shapeParams = {
      torsoAspect: Math.max(0.7, Math.min(1.3, 0.85 + (bodyShape.roundness - 0.5) * 0.6)),
      appendageLength: Math.max(0.6, Math.min(1.4, 0.8 + bodyShape.detail * 0.9)),
      scaleBias: Math.max(-0.4, Math.min(0.4, (bodyShape.scale - 0.5) * 0.6)),
    };

    const microVariants = shapeParamsFromAudio(robot.audioAttributes).microVariants;

    // Greeble values come from mapped greebleProps when present, else fall back
    // to the original deterministic calculations.
    const detail = bodyShape.detail ?? calculateDetailLevel(filterFreq);
    const greebleCount = mapped.greebleProps?.count ?? calculateGreebleCount(filterFreq, detail, robot.audioAttributes.waveform, adsr);
    const greebleSize = mapped.greebleProps?.scale ? Math.max(1, Math.round(mapped.greebleProps.scale * 6)) : calculateGreebleSize(adsr.sustain);
    const greeblePersistence = calculateGreeblePersistence(adsr.release);
    const greeblePlacementBias = calculateGreeblePlacementBias(adsr.decay, adsr.release);

    return {
      Component: selectRobotShape(synthType),
      colors,
      scale: calculateScale(pitchRange),
      detailLevel: detail,
      shapeParams,
      microVariants,
      greebleCount,
      greebleSize,
      greeblePersistence,
      greeblePlacementBias,
      lightsProps: mapped.lightsProps,
    };
  }, [robot.audioAttributes, lightnessMultiplier]) as {
    Component: RobotSVGComponent;
    colors: RobotColors;
    scale: number;
    detailLevel: number;
    shapeParams: ShapeParams;
    microVariants: MicroVariants;
    greebleCount: number;
    greebleSize: number;
    greeblePersistence: number;
    greeblePlacementBias: number;
    lightsProps?: { intensity: number; color: string };
  };

  const { Component, colors, scale, detailLevel, shapeParams, microVariants, greebleCount, greebleSize, greeblePersistence, greeblePlacementBias } = visual;

  return (
    <Component
      colors={colors}
      scale={scale}
      detailLevel={detailLevel}
      shapeParams={shapeParams}
      microVariants={microVariants}
      greebleCount={greebleCount}
      greebleSize={greebleSize}
      greeblePersistence={greeblePersistence}
      greeblePlacementBias={greeblePlacementBias}
    />
  );
});
