// ========================================
// IMPORTS
// ========================================
import type { Actor } from '../types/Actor';
import type { Robot } from '../types/Robot';
import { RobotState } from '../types/Robot';
import { useOceanStore } from '../stores/oceanStore';
import { AudioEngine } from '../engine/AudioEngine';
import { scheduleRepeat, cancelSchedule } from '../engine/beatClock';
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { generateAudioAttributes } from './spawnSystem';
import { DEV_TUNING } from '../constants';

// ========================================
// CONSTANTS
// ========================================
// ========================================
// CONSTANTS
// ========================================
const PRODUCTION_INTERVAL = 60;  // 60 measures (15 "hours")

// ========================================
// TYPES
// ========================================
interface FactoryProductionSchedule {
  factoryId: string;
  scheduleId: string;
}

// ========================================
// MODULE STATE
// ========================================
const activeSchedules = new Map<string, FactoryProductionSchedule>();

// ========================================
// EXPORTS
// ========================================

/**
 * Start factory production scheduling for a given factory.
 * Spawns robots every 60 measures (PRODUCTION_INTERVAL).
 * Each robot starts in background layer, transitions to foreground after 4 measures.
 */
export function startFactoryProduction(factoryId: string): void {
  const factory = useOceanStore.getState().getActorById(factoryId);

  if (!factory) {
    if (DEV_TUNING) console.log(`[Factory] Factory ${factoryId} not found`);
    return;
  }

  // Check if already scheduled
  if (activeSchedules.has(factoryId)) {
    if (DEV_TUNING) console.log(`[Factory] Production already scheduled for ${factoryId}`);
    return;
  }

  // Schedule repeating production
  const scheduleId = scheduleRepeat(`${PRODUCTION_INTERVAL}m`, () => {
    const { robots, settings } = useOceanStore.getState();

    // Enforce MAX_ROBOTS limit
    if (robots.length >= settings.maxRobots) {
      if (DEV_TUNING) console.log(`[Factory] Max robots reached (${settings.maxRobots})`);
      return;
    }

    // Create robot from factory
    const robot = createRobotFromFactory(factory);

    // Add to store
    useOceanStore.getState().addRobot(robot);

    // Register melody with AudioEngine
    AudioEngine.registerRobotMelody(robot.id, robot.melody);

    if (DEV_TUNING) {
      console.log(`[Factory] Robot ${robot.id} spawned from ${factoryId}`);
    }
  });

  // Track active schedule
  activeSchedules.set(factoryId, { factoryId, scheduleId });

  if (DEV_TUNING) {
    console.log(`[Factory] Production started for ${factoryId}, interval: ${PRODUCTION_INTERVAL}m`);
  }
}

/**
 * Stop factory production for a given factory.
 * Cleanup function for when a factory is destroyed or disabled.
 */
export function stopFactoryProduction(factoryId: string): void {
  const schedule = activeSchedules.get(factoryId);

  if (!schedule) {
    if (DEV_TUNING) console.log(`[Factory] No active schedule found for ${factoryId}`);
    return;
  }

  cancelSchedule(schedule.scheduleId);
  activeSchedules.delete(factoryId);

  if (DEV_TUNING) {
    console.log(`[Factory] Production stopped for ${factoryId}`);
  }
}

/**
 * Create a robot spawned from a factory.
 * Robot starts at factory position in idle state.
 */
export function createRobotFromFactory(factory: Actor): Robot {
  return {
    id: crypto.randomUUID(),
    state: RobotState.Idle,
    position: { ...factory.position },
    destination: null,
    direction: 'right',
    melody: generateMelodyForRobot(),
    audioAttributes: generateAudioAttributes(),
    // sensible defaults for required audio/visual ranges
    octaveRange: [3, 5],
    masterVolume: 0.9,
    createdAt: Date.now(),
  };
}


// ========================================
// INTERNAL HELPERS
// ========================================

/**
 * Get active production schedules (for debugging/inspection)
 */
export function getActiveSchedules(): FactoryProductionSchedule[] {
  return Array.from(activeSchedules.values());
}
