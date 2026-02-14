// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import type { Vec2 } from '../types/Vec2';
import { RobotState } from '../types/Robot';
import { useOceanStore } from '../stores/oceanStore';
import { createSwimTimeline } from '../animation/swimAnimation';

// ========================================
// CONSTANTS
// ========================================
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const WORLD_MARGIN = 100; // Keep destinations away from edges
const IDLE_DELAY = 1.0; // Seconds before picking next destination

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
export function handleRobotIdle(robotId: string): void {
  const robot = useOceanStore.getState().getRobotById(robotId);

  // Guard: robot must exist and be in idle state
  if (!robot || robot.state !== RobotState.Idle) {
    return;
  }

  const destination = pickDestination();

  // Update robot state to swimming with destination
  useOceanStore.getState().updateRobot(robotId, {
    state: RobotState.Moving,
    destination,
  });

  // Trigger swim animation with arrival callback
  createSwimTimeline(robot, destination, handleRobotArrival);

  console.log(
    `[IdleSystem] Robot ${robotId} swimming to (${Math.round(destination.x)}, ${Math.round(destination.y)})`
  );
}

/**
 * Handle robot arrival at destination
 * Returns robot to idle state and schedules next destination pick
 */
export function handleRobotArrival(robotId: string): void {
  // Update robot state to idle
  useOceanStore.getState().updateRobot(robotId, {
    state: RobotState.Idle,
    destination: null,
  });

  console.log(`[IdleSystem] Robot ${robotId} arrived, entering idle state`);

  // Schedule next destination pick after delay (using GSAP instead of setTimeout)
  gsap.delayedCall(IDLE_DELAY, () => {
    handleRobotIdle(robotId);
  });
}
