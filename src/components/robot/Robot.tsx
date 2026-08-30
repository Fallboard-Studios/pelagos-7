// ========================================
// IMPORTS
// ========================================
import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

import type { Robot as RobotType } from '../../types/Robot';
import { RobotBody } from './RobotBody';
import { setRef, deleteRef } from '../../utils/refs';
import { useUIStore } from '../../stores/uiStore';
import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '../../stores/attenuationStyleStore';
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
  const activeHubTile = useUIStore((s) => s.activeHubTile);
  const setActiveHubTile = useUIStore((s) => s.setActiveHubTile);
  const selectedCompanyId = useUIStore((s) => s.selectedCompanyId);
  const localeId = useAttenuationStyleStore((s) => selectCurrentAttenuationStyle(s)?.currentLocaleId ?? '');
  const isSelected = selectedRobotId === robot.id;
  // Roadmap Phase 10 — independent of isSelected; reuses the same .robot.selected glow (see
  // OceanScene.css) rather than a second visual language for "highlighted."
  const isCompanyMember = selectedCompanyId !== null && robot.companyId === selectedCompanyId;

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

  // Roadmap Phase 8: clicking a robot in the world view also opens the Robots hub tile, but only
  // from the main hub grid (activeHubTile === null) — once any tile is already open, the user is
  // already where they meant to go, so the active tile is left alone. Console.css's
  // console--grid class is what lets this click physically reach here in the first place.
  const handleClick = () => {
    selectRobot(robot.id);
    if (activeHubTile === null) setActiveHubTile('robots');
  };

  const className = ['robot', isSelected && 'selected', isCompanyMember && 'isCompanyMember']
    .filter(Boolean)
    .join(' ');

  return (
    <g
      ref={ref}
      className={className}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <RobotBody robot={robot} />
    </g>
  );
}
