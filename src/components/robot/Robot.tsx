// ========================================
// IMPORTS
// ========================================
import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

import type { Robot as RobotType } from '../../types/Robot';
import { RobotBody } from './RobotBody';
import { setRef, deleteRef } from '../../utils/refs';
import { useUIStore } from '../../stores/uiStore';
import { usePlanetStore, selectCurrentPlanet } from '../../stores/planetStore';
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
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const selectRobot = useUIStore((s) => s.selectRobot);
  const localeId = usePlanetStore((s) => selectCurrentPlanet(s)?.currentLocaleId ?? '');
  const isSelected = selectedRobotId === robot.id;

  // useLayoutEffect fires before paint, preventing a single frame at (0,0).
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
      // isReturning: true — the robot is entering from its south-only spawn
      // spot (see spawnSystem.ts's generateSpawnPosition), so its first
      // on-screen destination stays in the bottom half, same as a dock-cycle
      // return (robotSystems.ts's landOnActive).
      handleRobotIdle(localeId, robot.id, { isReturning: true });
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
