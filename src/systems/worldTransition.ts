// ========================================
// IMPORTS
// ========================================
import { usePlanetStore, selectCurrentPlanet } from '../stores/planetStore';
import { useLocaleStore } from '../stores/localeStore';
import { useUIStore } from '../stores/uiStore';
import { placeFactories } from './factoryPlacementSystem';
import { spawnRobot, startSpawnScheduler, stopSpawnScheduler } from './spawnSystem';
import { derivePlanetSeed, planetInitialHour } from '../utils/seedUtils';
import { PLANET_DURATION_MS } from '../constants/time';
import type { Planet, PlanetSize } from '../types/planet';
import type { Locale } from '../types/locale';

// ========================================
// TYPES
// ========================================

export interface RetransmitInput {
  /** Present only if the user edited the planet name field. */
  planetName?: string;
  /** Present only if the user edited the X/Y fields (already rounded to
   *  integers by CoordsInput). */
  coordinates?: { x: number; y: number };
}

// ========================================
// CONSTRUCTION HELPERS
// ========================================

/** Construct a fresh Planet, mirroring planetStore.ts's own DEFAULT_PELAGOS/
 *  addPlanet construction (dayStartTimestamp via planetInitialHour). Size is
 *  not a Sector Settings field — fixed at 'medium', matching DEFAULT_PELAGOS'
 *  own default (see docs/specs/SECTOR_SETTINGS.md §7.4). */
function buildPlanet(name: string): Planet {
  const seed = derivePlanetSeed(name);
  const initialHour = planetInitialHour(seed);
  const size: PlanetSize = 'medium';
  return {
    id: crypto.randomUUID(),
    name,
    size,
    locales: [],
    dayStartTimestamp: Date.now() - (initialHour / 24) * PLANET_DURATION_MS[size],
    currentHour: 0,
  };
}

/** Construct a fresh, empty Locale at the given coordinates — robots/actors
 *  populate via initializeLocale, not here. */
function buildLocale(planetId: string, coordinates: { x: number; y: number }): Locale {
  return {
    id: crypto.randomUUID(),
    planetId,
    name: `Plot ${coordinates.x}, ${coordinates.y}`,
    coordinates,
    robots: [],
    actors: [],
    settings: { bpm: 60, maxRobots: 12, minRobots: 2, autoSpawn: true, spawnFrequency: 4 },
    currentMeasure: 0,
  };
}

// ========================================
// EXPORTS
// ========================================

/**
 * Bring a locale online: guarded factory placement + 2 initial robots + spawn
 * scheduler restart. Idempotent on factories/robots — safe to call on an
 * already-populated locale (matches the double-spawn guard OceanScene's own
 * mount effect already had for factories; extended here to robots too) — but
 * always restarts the spawn scheduler, since `startSpawnScheduler`'s own
 * module-singleton guard means a caller switching locales must stop the old
 * schedule before starting the new one regardless of whether robots/actors
 * needed regenerating.
 *
 * Shared by OceanScene's mount effect and worldTransition so "what does
 * bringing a locale online mean" has exactly one implementation. A future
 * caller passing a partially-populated locale will skip the setup it thinks
 * is already done — pass a genuinely empty locale if you want it to run.
 */
export function initializeLocale(localeId: string): void {
  const locale = useLocaleStore.getState().getLocaleById(localeId);
  if (!locale) return;

  if (locale.actors.length === 0) placeFactories(localeId);
  if (locale.robots.length === 0) {
    spawnRobot(localeId);
    spawnRobot(localeId);
  }

  stopSpawnScheduler();
  startSpawnScheduler(localeId);
}

/**
 * The Sector Settings retransmit action — four branches, per
 * docs/specs/SECTOR_SETTINGS.md §1's preservation rules. `input`'s two
 * fields are each present only if the user actually edited that panel;
 * absence means "preserve as-is," not "reset to default."
 */
export function retransmitWorld(input: RetransmitInput): void {
  const { planetName, coordinates } = input;
  if (!planetName && !coordinates) return; // neither changed — true no-op

  useUIStore.getState().selectRobot(null);
  const oldPlanet = selectCurrentPlanet(usePlanetStore.getState());
  if (!oldPlanet) return;
  const oldLocaleId = oldPlanet.currentLocaleId;

  if (coordinates && !planetName) {
    // Coordinates changed, planet preserved: never touch currentPlanetId, so
    // audioStore's planet-sync subscription never fires — any Audio Rig/LFO
    // edits on the current planet survive untouched, with no new code needed.
    const newLocale = buildLocale(oldPlanet.id, coordinates);
    useLocaleStore.getState().addLocale(oldPlanet.id, newLocale);
    initializeLocale(newLocale.id);
    usePlanetStore.getState().setCurrentLocale(oldPlanet.id, newLocale.id);
    if (oldLocaleId) useLocaleStore.getState().removeLocale(oldLocaleId);
    return;
  }

  // planetName is set here (both-changed or planet-only branches).
  const newPlanet = buildPlanet(planetName!);
  usePlanetStore.getState().addPlanet(newPlanet);

  if (!coordinates && oldLocaleId) {
    // Planet changed, coordinates preserved: re-parent the EXISTING locale
    // onto the new planet unchanged — same robots/actors/edits, no
    // regeneration. Locale Seed Decoupling is what makes this correct: the
    // locale's generated content is a pure function of (x, y), independent
    // of which planet owns it, so there is genuinely nothing to regenerate.
    useLocaleStore.getState().setLocaleData(oldLocaleId, { planetId: newPlanet.id });
    usePlanetStore.getState().setCurrentLocale(newPlanet.id, oldLocaleId);
  } else {
    // Both changed: full reset, nothing eligible for preservation.
    const newLocale = buildLocale(newPlanet.id, coordinates!);
    useLocaleStore.getState().addLocale(newPlanet.id, newLocale);
    initializeLocale(newLocale.id);
    usePlanetStore.getState().setCurrentLocale(newPlanet.id, newLocale.id);
    if (oldLocaleId) useLocaleStore.getState().removeLocale(oldLocaleId);
  }

  // Triggers audioStore's existing usePlanetStore.subscribe — reseeds
  // globalAudio/globalLfo from the new planet's own seed. Do not call
  // regenerateGlobalAudioFromSeed/regenerateGlobalLfoFromSeed directly here.
  usePlanetStore.getState().setCurrentPlanetId(newPlanet.id);

  // removePlanet's cascade evicts noise maps for every locale it still lists
  // as its own — harmless even for a just-reparented locale, since the
  // decoupled noise map is a pure function of (x, y) and rebuilds identically
  // the next time anything calls getLocaleNoiseMap for it.
  usePlanetStore.getState().removePlanet(oldPlanet.id);
}
