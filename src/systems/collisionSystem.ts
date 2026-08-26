// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import type { Robot } from '../types/Robot';
import { RobotState, DockingState } from '../types/Robot';
import type { Vec2 } from '../types/Vec2';
import useLocaleStore from '../stores/localeStore';
import { triggerInteraction } from './interactionSystem';
import { getRef } from '../utils/refs';
import { getCurrentMeasure } from '../engine/beatClock';
import { DEV_TUNING } from '../constants';

// ========================================
// CONSTANTS
// ========================================
const INTERACTION_DISTANCE = 150; // pixels
const INTERACTION_DISTANCE_SQUARED = INTERACTION_DISTANCE * INTERACTION_DISTANCE;

// ========================================
// MODULE STATE
// ========================================
let tickerCallback: (() => void) | null = null;
let collisionChecksPerSecond = 0;
let frameCount = 0;

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
 * Check if a robot can interact (correct state, Active docking, and not on cooldown).
 * Cooldown is measure-based: robots must wait 8 measures between interactions.
 * The Docking guard matters because the collision ticker (below) iterates every
 * robot in the store regardless of what's rendered — without it, a Docked
 * (muted, off-screen) robot could still be flagged into an audible interaction.
 */
export function canInteract(robot: Robot): boolean {
  const validState =
    (robot.state === RobotState.Idle || robot.state === RobotState.Moving) &&
    robot.docking === DockingState.Active;

  const notOnCooldown = !robot.lastInteractionMeasure
    ? true
    : getCurrentMeasure() - robot.lastInteractionMeasure >= 8;

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

  const x = gsap.getProperty(ref, 'x') as number;
  const y = gsap.getProperty(ref, 'y') as number;

  return { x, y };
}

/**
 * Get collision checks per second (for debug display).
 */
export function getCollisionChecksPerSecond(): number {
  return collisionChecksPerSecond;
}

// ========================================
// COLLISION DETECTION
// ========================================

/**
 * Start collision detection using gsap.ticker.
 * Checks all robot pairs each frame for proximity interactions.
 */
export function startCollisionDetection(localeId: string): void {
  if (tickerCallback) {
    if (DEV_TUNING) console.warn('[CollisionSystem] Already running');
    return;
  }

  collisionChecksPerSecond = 0;
  frameCount = 0;
  let lastTime = gsap.ticker.time;

  tickerCallback = () => {
    const robots = useLocaleStore.getState().getLocaleById(localeId)?.robots || [];
    const checkCount = (robots.length * (robots.length - 1)) / 2;

    frameCount += checkCount;
    const currentTime = gsap.ticker.time;
    if (currentTime - lastTime >= 1) {
      collisionChecksPerSecond = frameCount;
      frameCount = 0;
      lastTime = currentTime;
    }

    for (let i = 0; i < robots.length; i++) {
      for (let j = i + 1; j < robots.length; j++) {
        const robotA = robots[i];
        const robotB = robots[j];

        if (!canInteract(robotA) || !canInteract(robotB)) {
          continue;
        }

        // Get current visual positions (not stored positions)
        const posA = getVisualPosition(robotA);
        const posB = getVisualPosition(robotB);

        const distSquared = calculateDistanceSquared(posA, posB);

        if (distSquared < INTERACTION_DISTANCE_SQUARED) {
          triggerInteraction(localeId, robotA.id, robotB.id);
        }
      }
    }
  };

  gsap.ticker.add(tickerCallback);
  if (DEV_TUNING) console.log('[CollisionSystem] Started');
}

/**
 * Stop collision detection.
 */
export function stopCollisionDetection(): void {
  if (tickerCallback) {
    gsap.ticker.remove(tickerCallback);
    tickerCallback = null;
    if (DEV_TUNING) console.log('[CollisionSystem] Stopped');
  }
}
