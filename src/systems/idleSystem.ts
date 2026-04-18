// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import type { Vec2 } from '../types/Vec2';
import { RobotState } from '../types/Robot';
import useLocaleStore from '../stores/localeStore';
import { createSwimTimeline } from '../animation/swimAnimation';

// ========================================
// CONSTANTS
// ========================================
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const WORLD_MARGIN = 100; // Keep destinations away from edges
const IDLE_DELAY = 1.0; // Seconds before picking next destination

// ========================================
// MODULE STATE
// ========================================
/** Track pending idle delays by robot ID to allow cleanup */
const pendingIdleDelays = new Map<string, gsap.core.Tween>();

// ========================================
// EXPORTS
// ========================================

/**
 * Pick a random destination within world bounds
 * Keeps destinations away from edges by WORLD_MARGIN
 */
export function pickDestination(): Vec2 {
  return {
    x: WORLD_MARGIN + Math.random() * (WORLD_WIDTH - 2 * WORLD_MARGIN),
    y: WORLD_MARGIN + Math.random() * (WORLD_HEIGHT - 2 * WORLD_MARGIN),
  };
}

/**
 * Handle robot entering idle state
 * Picks a random destination and triggers swim animation
 */
export function handleRobotIdle(localeId: string, robotId: string): void {
  // console.log(`[IdleSystem] handleRobotIdle called for robot ${robotId}`);

  const robot = useLocaleStore.getState().getRobotById(localeId, robotId);

  // Guard: robot must exist and be in idle state
  if (!robot || robot.state !== RobotState.Idle) {
    console.warn(`[IdleSystem] Robot ${robotId} not found or not Idle (state: ${robot?.state})`);
    return;
  }

  const destination = pickDestination();

  // Calculate direction based on destination x-coordinate relative to current position
  const direction = destination.x > robot.position.x ? 'right' : 'left';

  // Pass PRE-UPDATE robot to createSwimTimeline so it knows the old direction
  // and can correctly determine whether a flip animation is needed.
  createSwimTimeline(robot, destination, direction, () => handleRobotArrival(localeId, robotId));

  // Update robot state to swimming with destination and new direction
  useLocaleStore.getState().updateRobot(localeId, robotId, {
    state: RobotState.Moving,
    destination,
    direction,
  });

  // console.log(
  //   `[IdleSystem] Robot ${robotId} swimming to (${Math.round(destination.x)}, ${Math.round(destination.y)})`
  // );
}

/**
 * Handle robot arrival at destination
 * Returns robot to idle state and schedules next destination pick
 */
export function handleRobotArrival(localeId: string, robotId: string): void {
  const robot = useLocaleStore.getState().getRobotById(localeId, robotId);

  if (!robot || !robot.destination) {
    return;
  }

  // Update robot state to idle and sync position to destination
  useLocaleStore.getState().updateRobot(localeId, robotId, {
    state: RobotState.Idle,
    position: robot.destination, // Sync store position to where robot actually is
    destination: null,
  });

  // console.log(`[IdleSystem] Robot ${robotId} arrived, entering idle state`);

  // Schedule next destination pick after delay (using GSAP instead of setTimeout)
  // Store the tween so we can cancel it if the robot is removed before it fires
  const delayTween = gsap.delayedCall(IDLE_DELAY, () => {
    pendingIdleDelays.delete(robotId); // Clean up the stored reference
    handleRobotIdle(localeId, robotId);
  });

  pendingIdleDelays.set(robotId, delayTween);
}

/**
 * Cancel any pending idle delay for a robot
 * Called when a robot is removed to prevent orphaned timers
 */
export function cancelPendingIdleDelay(robotId: string): void {
  const delayTween = pendingIdleDelays.get(robotId);
  if (delayTween) {
    delayTween.kill();
    pendingIdleDelays.delete(robotId);
  }
}

// (no default wrappers) callers must provide explicit localeId
