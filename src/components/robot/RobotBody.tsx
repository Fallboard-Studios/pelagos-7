// ========================================
// IMPORTS
// ========================================
import React, { useMemo } from 'react';

import type { Robot } from '../../types/Robot';
import {
  selectRobotShape,
  generateColors,
  calculateScale,
  calculateDetailLevel,
} from './robotVisualHelpers';

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
export const RobotBody = React.memo(function RobotBody({ robot }: RobotBodyProps) {
  const visual = useMemo(() => {
    const { synthType, adsr, pitchRange, filterFreq } = robot.audioAttributes;

    return {
      Component: selectRobotShape(synthType),
      colors: generateColors(adsr),
      scale: calculateScale(pitchRange),
      detailLevel: calculateDetailLevel(filterFreq),
    };
  }, [robot.audioAttributes]);

  const { Component, colors, scale, detailLevel } = visual;

  return (
    <Component
      colors={colors}
      scale={scale}
      detailLevel={detailLevel}
    />
  );
});
