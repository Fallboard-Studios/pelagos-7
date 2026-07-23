// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import type { NoiseFunction2D } from 'simplex-noise';
import { RobotState } from '../types/Robot';
import useLocaleStore from '../stores/localeStore';
import { usePlanetStore } from '../stores/planetStore';
import { createSwimTimeline } from '../animation/swimAnimation';
import { getLocaleNoiseMap } from '../utils/noiseMaps';
import { getSeededVal } from '../utils/getSeededVal';
import type { Vec2 } from '../types/Vec2';

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

/** Per-robot move counter — incremented each time a robot picks a new idle destination.
 *  Stores the robot's spawn index (for its unique noise channel) and current move count. */
const idleMoveCounters = new Map<string, { spawnIndex: number; count: number }>();

function getAndIncrementMoveCount(robotId: string): { spawnIndex: number; count: number } {
  const entry = idleMoveCounters.get(robotId) ?? { spawnIndex: 0, count: 0 };
  idleMoveCounters.set(robotId, { ...entry, count: entry.count + 1 });
  return entry;
}

/**
 * Seed the idle move counter for a robot at spawn time.
 * Pass the robot's spawn index so each robot gets its own noise channel.
 */
export function initRobotIdleCounter(robotId: string, spawnIndex: number): void {
  idleMoveCounters.set(robotId, { spawnIndex, count: 0 });
}

// ========================================
// EXPORTS
// ========================================

/**
 * Pick a destination within world bounds using seeded noise.
 * Each robot has a unique noise channel determined by its spawnIndex,
 * so robots never follow correlated paths regardless of their move count.
 * Falls back to Math.random if noiseMap is unavailable.
 */
export function pickDestination(noiseMap: NoiseFunction2D | null, spawnIndex: number, moveCount: number): Vec2 {
  if (noiseMap) {
    return {
      x: getSeededVal(noiseMap, `idle.target.x.${spawnIndex}`, moveCount, WORLD_MARGIN, WORLD_WIDTH - WORLD_MARGIN),
      y: getSeededVal(noiseMap, `idle.target.y.${spawnIndex}`, moveCount, WORLD_MARGIN, WORLD_HEIGHT - WORLD_MARGIN),
    };
  }
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
  const store = useLocaleStore.getState();
  const robot = store.getRobotById(localeId, robotId);

  if (!robot || robot.state !== RobotState.Idle) {
    console.warn(`[IdleSystem] Robot ${robotId} not found or not Idle (state: ${robot?.state})`);
    return;
  }

  const locale = store.getLocaleById(localeId);
  const planet = locale ? usePlanetStore.getState().planets.find((p) => p.id === locale.planetId) : undefined;
  const noiseMap = locale && planet
    ? getLocaleNoiseMap(localeId, locale.planetId, planet.name, locale.coordinates.x, locale.coordinates.y)
    : null;

  const { spawnIndex, count } = getAndIncrementMoveCount(robotId);

  const destination = pickDestination(noiseMap, spawnIndex, count);

  const direction = destination.x > robot.position.x ? 'right' : 'left';

  // Pass PRE-UPDATE robot to createSwimTimeline so it knows the old direction
  // and can correctly determine whether a flip animation is needed.
  createSwimTimeline(robot, destination, direction, () => handleRobotArrival(localeId, robotId));

  useLocaleStore.getState().updateRobot(localeId, robotId, {
    state: RobotState.Moving,
    destination,
    direction,
  });
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

  useLocaleStore.getState().updateRobot(localeId, robotId, {
    state: RobotState.Idle,
    position: robot.destination, // Sync store position to where robot actually is
    destination: null,
  });

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
  idleMoveCounters.delete(robotId);
}
