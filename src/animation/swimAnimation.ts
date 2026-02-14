// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import type { Robot } from '../types/Robot';
import type { Vec2 } from '../types/Vec2';
import { RobotState } from '../types/Robot';
import { getRef } from '../utils/refs';
import { setTimeline, killTimeline } from './timelineMap';
import { useOceanStore } from '../stores/oceanStore';

// ========================================
// CONSTANTS
// ========================================
const SWIM_SPEED = 120; // pixels per second
const PROPELLER_ROTATION_SPEED = 2; // seconds per 360deg rotation
const TILT_ANGLE = 5; // degrees of body tilt during movement

// ========================================
// HELPERS
// ========================================

/**
 * Calculate distance between two points
 */
function calculateDistance(from: Vec2, to: Vec2): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate swim duration based on distance
 */
function calculateDuration(from: Vec2, to: Vec2): number {
  const distance = calculateDistance(from, to);
  return distance / SWIM_SPEED;
}

/**
 * Handle robot arrival at destination
 * Updates robot state to Idle and clears destination
 */
function handleArrival(robotId: string): void {
  useOceanStore.getState().updateRobot(robotId, {
    state: RobotState.Idle,
    destination: null,
  });
  console.log(`[SwimAnimation] Robot ${robotId} arrived at destination`);
}

// ========================================
// EXPORTS
// ========================================

/**
 * Create GSAP timeline for robot swim animation
 * Animates movement from current position to destination with propeller rotation
 */
export function createSwimTimeline(robot: Robot, destination: Vec2): gsap.core.Timeline {
  const ref = getRef(`robot-${robot.id}`);

  // If ref not found, return empty timeline
  if (!ref) {
    console.warn(`[SwimAnimation] No ref found for robot ${robot.id}`);
    return gsap.timeline();
  }

  // Kill any existing swim timeline for this robot
  killTimeline(`swim-${robot.id}`);

  // Calculate animation duration based on distance
  const duration = calculateDuration(robot.position, destination);

  // Create main timeline with arrival handler
  const tl = gsap.timeline({
    onComplete: () => handleArrival(robot.id),
  });

  // Main movement tween (position change)
  tl.to(ref, {
    x: destination.x,
    y: destination.y,
    duration,
    ease: 'sine.inOut',
  });

  // Propeller rotation (continuous loop, starts immediately)
  const propeller = ref.querySelector('.propeller');
  if (propeller) {
    tl.to(
      propeller,
      {
        rotation: '+=360',
        duration: PROPELLER_ROTATION_SPEED,
        repeat: -1,
        ease: 'none',
      },
      0 // Start at time 0 (parallel with movement)
    );
  }

  // Slight body tilt during movement (optional polish)
  // Calculate tilt direction based on movement vector
  const dx = destination.x - robot.position.x;
  const tiltDirection = dx > 0 ? TILT_ANGLE : -TILT_ANGLE;

  tl.to(
    ref,
    {
      rotation: tiltDirection,
      duration: duration * 0.3,
      ease: 'sine.out',
    },
    0 // Start at beginning
  );

  tl.to(
    ref,
    {
      rotation: 0,
      duration: duration * 0.3,
      ease: 'sine.in',
    },
    duration * 0.7 // Start near end of movement
  );

  // Store timeline for external access/cleanup
  setTimeline(`swim-${robot.id}`, tl);

  console.log(
    `[SwimAnimation] Created swim timeline for robot ${robot.id} (duration: ${duration.toFixed(2)}s)`
  );

  return tl;
}
