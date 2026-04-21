// ========================================
// IMPORTS
// ========================================
import type { Actor } from '../types/Actor';
import type { Robot } from '../types/Robot';
import { RobotState } from '../types/Robot';
import useLocaleStore from '../stores/localeStore';
import { usePlanetStore } from '../stores/planetStore';
import type { LocaleSettings } from '../types/locale';
import { AudioEngine } from '../engine/AudioEngine';
import { scheduleRepeat, cancelSchedule } from '../engine/beatClock';
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { generateAudioAttributes } from './spawnSystem';
import { getLocaleNoiseMap } from '../utils/noiseMaps';
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
  // Find factory actor across all locales
  const locales = useLocaleStore.getState().locales;
  let factory: Actor | undefined;
  let factoryLocaleId: string | undefined;
  for (const lid of Object.keys(locales)) {
    const l = locales[lid];
    const found = l.actors?.find((a) => a.id === factoryId);
    if (found) {
      factory = found;
      factoryLocaleId = lid;
      break;
    }
  }

  if (!factory || !factoryLocaleId) {
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
    const locale = useLocaleStore.getState().getLocaleById(factoryLocaleId!);
    const robots = locale?.robots ?? [];
    const settings = (locale?.settings as LocaleSettings) ?? { maxRobots: 12, minRobots: 0 };

    // Enforce MAX_ROBOTS limit
    if (robots.length >= (settings.maxRobots ?? 12)) {
      if (DEV_TUNING) console.log(`[Factory] Max robots reached (${settings.maxRobots})`);
      return;
    }

    // Create robot from factory
    const robot = createRobotFromFactory(factory!);

    // Add to locale store
    useLocaleStore.getState().addRobot(factoryLocaleId!, robot);

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
 * Stop production for all active factories.
 * Call on power-off to cancel all scheduled factory spawns.
 */
export function stopAllFactoryProduction(): void {
  for (const schedule of activeSchedules.values()) {
    cancelSchedule(schedule.scheduleId);
  }
  activeSchedules.clear();
  if (DEV_TUNING) console.log('[Factory] All factory production stopped');
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
export function createRobotFromFactory(factory: Actor, localeId?: string): Robot {
  // Resolve locale noise map for deterministic attribute generation when available
  const locale = localeId ? useLocaleStore.getState().getLocaleById(localeId) : undefined;
  const planet = locale ? usePlanetStore.getState().planets.find((p) => p.id === locale.planetId) : undefined;
  const noiseMap = locale && planet
    ? getLocaleNoiseMap(localeId!, locale.planetId, planet.name, locale.coordinates.x, locale.coordinates.y)
    : null;
  // Use factory ID as a stable offset seed so each factory produces distinct robots
  const offset = noiseMap ? (factory.id.charCodeAt(0) ?? 0) : 0;

  return {
    id: crypto.randomUUID(),
    state: RobotState.Idle,
    position: { ...factory.position },
    destination: null,
    direction: 'right',
    melody: generateMelodyForRobot(),
    audioAttributes: noiseMap ? generateAudioAttributes(noiseMap, offset) : generateAudioAttributes(
      // Inline trivial fallback noise map (uniform midpoint) when locale is unavailable
      (() => { const fn = (_x: number, _y: number) => 0 as number; return fn; })() as Parameters<typeof generateAudioAttributes>[0],
      offset,
    ),
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
