// ========================================
// IMPORTS
// ========================================
import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

import type { Robot as RobotType } from '../../types/Robot';
import { RobotBody } from './RobotBody';
import { setRef, deleteRef } from '../../utils/refs';
import { useOceanStore } from '../../stores/oceanStore';
import { handleRobotIdle } from '../../systems/idleSystem';

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
 *
 * IMPORTANT: The top-level <g> has NO React-managed `transform` attribute.
 * GSAP is the single source of truth for all transforms (position, scaleX,
 * rotation) on this element. React re-renders must never overwrite GSAP's
 * SVG transform attribute, otherwise scaleX resets cause instant flips.
 */
export function Robot({ robot }: RobotProps) {
  const ref = useRef<SVGGElement>(null);
  const selectedRobotId = useOceanStore((s) => s.selectedRobotId);
  const selectRobot = useOceanStore((s) => s.selectRobot);
  const isSelected = selectedRobotId === robot.id;

  // useLayoutEffect fires before paint, preventing a single frame at (0,0).
  // Sets initial position and scaleX via GSAP so it owns all transforms.
  // Intentionally run this effect only on mount so GSAP owns transforms

  useLayoutEffect(() => {
    if (ref.current) {
      setRef(`robot-${robot.id}`, ref.current);
      gsap.set(ref.current, {
        x: robot.position.x,
        y: robot.position.y,
        scaleX: robot.direction === 'right' ? 1 : -1,
        transformOrigin: '50% 50%',
      });
      handleRobotIdle(robot.id);
    }
    return () => deleteRef(`robot-${robot.id}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robot.id]);

  const handleClick = () => {
    selectRobot(robot.id);
  };

  return (
    <g
      ref={ref}
      className={isSelected ? 'robot selected' : 'robot'}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <RobotBody robot={robot} />
    </g>
  );
}
