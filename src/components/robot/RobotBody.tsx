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
    const { synthType, adsr, pitchRange, filterFreq } = robot.audioAttributes;

    const baseColors = generateColors(robot.audioAttributes);
    const colors = applyLightnessMultiplier(baseColors, lightnessMultiplier);
    const { shapeParams, microVariants } = shapeParamsFromAudio(robot.audioAttributes as any);

    // Greeble values
    const detail = calculateDetailLevel(filterFreq);
    const greebleCount = calculateGreebleCount(filterFreq, detail, robot.audioAttributes.waveform, adsr);
    const greebleSize = calculateGreebleSize(adsr.sustain);
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
    };
  }, [robot.audioAttributes, lightnessMultiplier]);

  const { Component, colors, scale, detailLevel, shapeParams, microVariants, greebleCount, greebleSize, greeblePersistence, greeblePlacementBias } = visual as any;

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
