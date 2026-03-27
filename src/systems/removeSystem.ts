// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import type { Vec2 } from '../types/Vec2';
import { RobotState } from '../types/Robot';
import { useOceanStore } from '../stores/oceanStore';
import { setTimeline, killTimeline } from '../animation/timelineMap';
import { getRef } from '../utils/refs';

// ========================================
// CONSTANTS
// ========================================
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const OFFSCREEN_OFFSET = 150;
const SWIM_SPEED = 120; // px/s (match swimAnimation)
const ORIENTATION_DURATION = 0.5;

// ========================================
// HELPERS
// ========================================
function calculateDistance(from: Vec2, to: Vec2): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateDuration(from: Vec2, to: Vec2): number {
  const distance = calculateDistance(from, to);
  return Math.max(0.1, distance / SWIM_SPEED);
}

function pickExitDestination(pos: Vec2): Vec2 {
  // Choose the nearest edge and place a target just beyond the viewBox
  const leftDist = pos.x + OFFSCREEN_OFFSET;
  const rightDist = WORLD_WIDTH - pos.x + OFFSCREEN_OFFSET;
  const topDist = pos.y + OFFSCREEN_OFFSET;
  const bottomDist = WORLD_HEIGHT - pos.y + OFFSCREEN_OFFSET;

  const min = Math.min(leftDist, rightDist, topDist, bottomDist);

  if (min === leftDist) return { x: -OFFSCREEN_OFFSET, y: pos.y };
  if (min === rightDist) return { x: WORLD_WIDTH + OFFSCREEN_OFFSET, y: pos.y };
  if (min === topDist) return { x: pos.x, y: -OFFSCREEN_OFFSET };
  return { x: pos.x, y: WORLD_HEIGHT + OFFSCREEN_OFFSET };
}

// ========================================
// EXPORTS
// ========================================

/**
 * Animate a robot swimming/fading offscreen, then remove and cleanup.
 * Falls back to immediate removal if the robot or DOM ref is not available.
 */
export function removeRobotWithExit(robotId: string): void {
  const store = useOceanStore.getState();
  const robot = store.getRobotById(robotId);
  if (!robot) {
    // Nothing to animate — perform immediate removal
    store.removeRobot(robotId);
    return;
  }

  // Determine exit destination
  const dest = pickExitDestination(robot.position);
  const targetDirection = dest.x > robot.position.x ? 'right' : 'left';

  // Kill any existing swim timeline to avoid conflicts
  killTimeline(`swim-${robotId}`);

  // Mark robot as moving so other systems know its visual state
  useOceanStore.getState().updateRobot(robotId, {
    state: RobotState.Moving,
    destination: dest,
    direction: targetDirection,
  });

  const ref = getRef(`robot-${robotId}`);
  if (!ref) {
    // If no ref, fallback to immediate removal to avoid orphaned state
    store.removeRobot(robotId);
    return;
  }

  // Build exit timeline: optional flip, move to dest, fade out
  const currentScaleX = robot.direction === 'right' ? 1 : -1;
  const targetScaleX = targetDirection === 'right' ? 1 : -1;
  const needsFlip = currentScaleX !== targetScaleX;

  const duration = calculateDuration(robot.position, dest);
  const tl = gsap.timeline({
    onComplete: () => {
      // Final cleanup: remove from store which performs audio/timeout cleanup
      store.removeRobot(robotId);
      // Remove this exit timeline from map
      killTimeline(`exit-${robotId}`);
    }
  });

  tl.set(ref, { transformOrigin: '50% 50%' });

  if (needsFlip) {
    tl.to(ref, {
      scaleX: targetScaleX,
      duration: ORIENTATION_DURATION,
      ease: 'power1.inOut',
    });
  }

  const propulsionStart = needsFlip ? ORIENTATION_DURATION : 0;

  tl.to(ref, {
    x: dest.x,
    y: dest.y,
    duration,
    ease: 'sine.inOut',
  }, propulsionStart);

  // Fade out during the last portion of the movement
  const fadeDuration = Math.min(0.6, duration * 0.6);
  tl.to(ref, { opacity: 0, duration: fadeDuration, ease: 'power1.out' }, propulsionStart + Math.max(0, duration - fadeDuration));

  // Store and play
  setTimeline(`exit-${robotId}`, tl);
  tl.play();
}
