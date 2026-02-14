// ========================================
// IMPORTS
// ========================================
import React, { useRef, useEffect } from 'react';

import type { Robot as RobotType } from '../../types/Robot';
import { RobotBody } from './RobotBody';
import { setRef } from '../../utils/refs';
import { useOceanStore } from '../../stores/oceanStore';

// ========================================
// TYPES
// ========================================
interface RobotProps {
  robot: RobotType;
}

// ========================================
// COMPONENT
// ========================================
/**
 * Robot - Main robot component with positioning, selection, and interaction
 * Handles click events and stores SVG ref for GSAP animations
 */
export function Robot({ robot }: RobotProps) {
  const ref = useRef<SVGGElement>(null);
  const selectedRobotId = useOceanStore((s) => s.selectedRobotId);
  const selectRobot = useOceanStore((s) => s.selectRobot);
  const isSelected = selectedRobotId === robot.id;

  // Store ref for GSAP access
  useEffect(() => {
    if (ref.current) {
      setRef(`robot-${robot.id}`, ref.current);
    }
  }, [robot.id]);

  const handleClick = () => {
    selectRobot(robot.id);
  };

  return (
    <g
      ref={ref}
      transform={`translate(${robot.position.x}, ${robot.position.y})`}
      className={isSelected ? 'robot selected' : 'robot'}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <RobotBody robot={robot} />
    </g>
  );
}
