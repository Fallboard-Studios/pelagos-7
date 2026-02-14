// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import type { Robot } from '../types/Robot';
import { RobotState } from '../types/Robot';
import type { Vec2 } from '../types/Vec2';
import { useOceanStore } from '../stores/oceanStore';
import { triggerInteraction } from './interactionSystem';
import { getRef } from '../utils/refs';

// ========================================
// CONSTANTS
// ========================================
const INTERACTION_DISTANCE = 150; // pixels
const INTERACTION_DISTANCE_SQUARED = INTERACTION_DISTANCE * INTERACTION_DISTANCE;

// ========================================
// MODULE STATE
// ========================================
let tickerCallback: (() => void) | null = null;

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Calculate squared distance between two positions.
 * Avoids expensive sqrt operation for performance.
 */
export function calculateDistanceSquared(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/**
 * Check if a robot can interact (correct state and not on cooldown).
 */
export function canInteract(robot: Robot): boolean {
  // Must be in idle or moving state
  const validState =
    robot.state === RobotState.Idle || robot.state === RobotState.Moving;

  // Must not be on cooldown
  const notOnCooldown =
    !robot.interactionCooldown || Date.now() >= robot.interactionCooldown;

  return validState && notOnCooldown;
}

/**
 * Get the current visual position of a robot (from GSAP animation).
 * Falls back to stored position if ref not found.
 */
function getVisualPosition(robot: Robot): Vec2 {
  const ref = getRef(`robot-${robot.id}`);

  if (!ref) {
    // No ref yet or robot not rendered - use stored position
    return robot.position;
  }

  // Get actual visual position from DOM transform
  const x = gsap.getProperty(ref, 'x') as number;
  const y = gsap.getProperty(ref, 'y') as number;

  return { x, y };
}

// ========================================
// COLLISION DETECTION
// ========================================

/**
 * Start collision detection using gsap.ticker.
 * Checks all robot pairs each frame for proximity interactions.
 */
export function startCollisionDetection(): void {
  if (tickerCallback) {
    console.warn('[CollisionSystem] Already running');
    return;
  }

  tickerCallback = () => {
    const robots = useOceanStore.getState().robots;

    // Check all unique pairs
    for (let i = 0; i < robots.length; i++) {
      for (let j = i + 1; j < robots.length; j++) {
        const robotA = robots[i];
        const robotB = robots[j];

        // Skip if either cannot interact
        if (!canInteract(robotA) || !canInteract(robotB)) {
          continue;
        }

        // Get current visual positions (not stored positions)
        const posA = getVisualPosition(robotA);
        const posB = getVisualPosition(robotB);

        // Check squared distance (avoid sqrt)
        const distSquared = calculateDistanceSquared(posA, posB);

        if (distSquared < INTERACTION_DISTANCE_SQUARED) {
          triggerInteraction(robotA.id, robotB.id);
        }
      }
    }
  };

  gsap.ticker.add(tickerCallback);
  console.log('[CollisionSystem] Started');
}

/**
 * Stop collision detection.
 */
export function stopCollisionDetection(): void {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
    console.log('[CollisionSystem] Stopped');
  }
}
