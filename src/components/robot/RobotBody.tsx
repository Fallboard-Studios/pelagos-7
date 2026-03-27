// ========================================
// IMPORTS
// ========================================
import { memo, useMemo } from 'react';

import type { Robot } from '../../types/Robot';
import {
  selectRobotShape,
  generateColors,
  shapeParamsFromAudio,
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

    return {
      Component: selectRobotShape(synthType),
      colors,
      scale: calculateScale(pitchRange),
      detailLevel: calculateDetailLevel(filterFreq),
    };
  }, [robot.audioAttributes, lightnessMultiplier]);

  const { Component, colors, scale, detailLevel } = visual;

  return (
    <Component
      colors={colors}
      scale={scale}
      detailLevel={detailLevel}
        shapeParams={shapeParams}
        microVariants={microVariants}
    />
  );
});
