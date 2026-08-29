// ========================================
// IMPORTS
// ========================================
import { usePlanetStore, selectCurrentPlanet } from '../stores/planetStore';
import { useLocaleStore } from '../stores/localeStore';
import { useUIStore } from '../stores/uiStore';
import { placeFactories, recolorFactoriesForAttenuationStyle } from './factoryPlacementSystem';
import { spawnInitialRoster, spawnInitialCompanies } from './spawnSystem';
import { startRobotLifecycle, stopRobotLifecycle, assignJob } from './robotSystems';
import { DockingState } from '../types/Robot';
import { getLocaleNoiseMap } from '../utils/noiseMaps';
import { DAY_DURATION_MS } from '../constants/time';
import type { Planet } from '../types/planet';
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

/** Construct a fresh Planet. No dayStartTimestamp/size/currentHour anymore —
 *  dayStartTimestamp moved to Locale (buildLocale below), the rest were
 *  deleted outright. See docs/specs/ATTENUATION_STYLE.md §1.1. */
function buildPlanet(name: string): Planet {
  return {
    id: crypto.randomUUID(),
    name,
    locales: [],
  };
}

/** Construct a fresh, empty Locale at the given coordinates — robots/actors
 *  populate via initializeLocale, not here. dayStartTimestamp is computed
 *  here, once, directly from x — no seed, no shared clock. This is the ONLY
 *  place a fresh dayStartTimestamp gets produced; retransmitPlanetOnly
 *  deliberately never calls this for its preserved locale (the inversion
 *  this phase's spec flags as easiest to get backwards — see
 *  docs/specs/ATTENUATION_STYLE.md §1.1/§3). */
function buildLocale(planetId: string, coordinates: { x: number; y: number }): Locale {
  return {
    id: crypto.randomUUID(),
    planetId,
    name: `Plot ${coordinates.x}, ${coordinates.y}`,
    coordinates,
    dayStartTimestamp: Date.now() - (Math.abs(coordinates.x % 24) / 24) * DAY_DURATION_MS,
    robots: [],
    actors: [],
    companies: [],
    settings: { bpm: 60 },
    currentMeasure: 0,
  };
}

// ========================================
// EXPORTS
// ========================================

/**
 * Bring a locale online: guarded factory placement + fixed 12-robot roster +
 * robot-lifecycle restart. Idempotent on factories/robots — safe to call on
 * an already-populated locale (matches the double-spawn guard OceanScene's
 * own mount effect already had for factories; extended here to robots too)
 * — but always restarts the lifecycle tick, since `startRobotLifecycle`'s
 * own module-singleton guard means a caller switching locales must stop the
 * old tick before starting the new one regardless of whether robots/actors
 * needed regenerating. This is also what makes a power cycle work: BeatClock
 * resets (and silently drops every `subscribeToMeasure` listener) whenever
 * `AudioEngine.killAll()` runs, so the unconditional stop+start pair below is
 * what re-subscribes the tick, not just what handles a locale swap.
 *
 * Job assignment for the roster's initially-Active robots happens here, not
 * inside `spawnInitialRoster` itself — see
 * docs/specs/ROBOT_SYSTEMS_ENGINE.md's Architecture Decisions on avoiding an
 * import cycle between spawnSystem.ts and robotSystems.ts.
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
    spawnInitialRoster(localeId);
    spawnInitialCompanies(localeId); // Roadmap Phase 10 — same guard as the roster it depends on
    const freshRobots = useLocaleStore.getState().getLocaleById(localeId)?.robots ?? [];
    freshRobots
      .filter((r) => r.docking === DockingState.Active)
      .forEach((r) => assignJob(localeId, r.id));
  }

  stopRobotLifecycle();
  startRobotLifecycle(localeId);
}

/**
 * The four things a retransmit can mean, resolved once up front rather than
 * re-derived via scattered `if`s through the function body. Each variant
 * carries exactly the fields its branch needs — no non-null assertions
 * needed at the dispatch site, only inside this one resolution function
 * where the exhaustiveness is actually being established.
 */
type RetransmitAction =
  | { mode: 'noop' }
  | { mode: 'coordsOnly'; coordinates: { x: number; y: number } }
  | { mode: 'planetOnly'; planetName: string }
  | { mode: 'both'; planetName: string; coordinates: { x: number; y: number } };

function resolveRetransmitAction(input: RetransmitInput): RetransmitAction {
  const { planetName, coordinates } = input;
  if (!planetName && !coordinates) return { mode: 'noop' };
  if (coordinates && !planetName) return { mode: 'coordsOnly', coordinates };
  if (planetName && !coordinates) return { mode: 'planetOnly', planetName };
  return { mode: 'both', planetName: planetName!, coordinates: coordinates! };
}

/** Coordinates changed, planet preserved: never touch currentPlanetId, so
 *  audioStore's planet-sync subscription never fires — any Audio Rig/LFO
 *  edits on the current planet survive untouched, with no new code needed. */
function retransmitCoordsOnly(oldPlanet: Planet, oldLocaleId: string | undefined, coordinates: { x: number; y: number }): void {
  const newLocale = buildLocale(oldPlanet.id, coordinates);
  useLocaleStore.getState().addLocale(oldPlanet.id, newLocale);
  initializeLocale(newLocale.id);
  usePlanetStore.getState().setCurrentLocale(oldPlanet.id, newLocale.id);
  if (oldLocaleId) useLocaleStore.getState().removeLocale(oldLocaleId);
}

/** Build a new Planet and switch the store to it (add only — the caller
 *  finalizes with finalizePlanetTransition once its own branch-specific work
 *  is done). Shared by the two modes that create a new planet. */
function createNewPlanet(planetName: string): Planet {
  const newPlanet = buildPlanet(planetName);
  usePlanetStore.getState().addPlanet(newPlanet);
  return newPlanet;
}

/** Switch currentPlanetId to the new planet and discard the old one. Shared
 *  tail step for both planet-creating modes. */
function finalizePlanetTransition(newPlanet: Planet, oldPlanet: Planet): void {
  // Triggers audioStore's existing usePlanetStore.subscribe — reseeds
  // globalAudio/globalLfo from the new planet's own seed. Do not call
  // regenerateGlobalAudioFromSeed/regenerateGlobalLfoFromSeed directly here.
  usePlanetStore.getState().setCurrentPlanetId(newPlanet.id);
  usePlanetStore.getState().removePlanet(oldPlanet.id);
}

/** Planet changed, coordinates preserved: re-parent the EXISTING locale onto
 *  the new planet unchanged — same robots/actors/edits/dayStartTimestamp, no
 *  regeneration. Locale Seed Decoupling is what makes this correct: the
 *  locale's generated content is a pure function of (x, y), independent of
 *  which planet owns it, so there is genuinely nothing to regenerate.
 *  dayStartTimestamp is NOT recalculated here — inverted from the old
 *  planet-owned-time behavior, see docs/specs/ATTENUATION_STYLE.md §1.1.
 *  Factory colors DO change — recolorFactoriesForAttenuationStyle is new
 *  coupling, not a preservation exception; see §1.2. */
function retransmitPlanetOnly(oldPlanet: Planet, oldLocaleId: string | undefined, planetName: string): void {
  const newPlanet = createNewPlanet(planetName);
  let preservedCoords: { x: number; y: number } | undefined;

  if (oldLocaleId) {
    preservedCoords = useLocaleStore.getState().getLocaleById(oldLocaleId)?.coordinates;
    // Partial patch — only touches planetId, can't touch dayStartTimestamp
    // even indirectly, since it isn't mentioned.
    useLocaleStore.getState().setLocaleData(oldLocaleId, { planetId: newPlanet.id });
    usePlanetStore.getState().setCurrentLocale(newPlanet.id, oldLocaleId);
    recolorFactoriesForAttenuationStyle(oldLocaleId, newPlanet.id, newPlanet.name);
  }

  // finalizePlanetTransition's removePlanet(oldPlanet) evicts noise maps for
  // every locale oldPlanet.locales still lists as its own — this preserved
  // locale included, since nothing here (or in addPlanet) ever updates that
  // array. Re-warm AFTER that call (order matters — re-warming first would
  // just get evicted again by removePlanet) so AudioEngine's non-throwing
  // tryGetLocaleNoiseMap lookup never sees a gap, rather than relying on the
  // next scheduled spawn tick to rebuild it.
  finalizePlanetTransition(newPlanet, oldPlanet);
  if (oldLocaleId && preservedCoords) getLocaleNoiseMap(oldLocaleId, preservedCoords.x, preservedCoords.y);
}

/** Both changed: full reset, nothing eligible for preservation. */
function retransmitBoth(oldPlanet: Planet, oldLocaleId: string | undefined, planetName: string, coordinates: { x: number; y: number }): void {
  const newPlanet = createNewPlanet(planetName);

  const newLocale = buildLocale(newPlanet.id, coordinates);
  useLocaleStore.getState().addLocale(newPlanet.id, newLocale);
  initializeLocale(newLocale.id);
  usePlanetStore.getState().setCurrentLocale(newPlanet.id, newLocale.id);
  if (oldLocaleId) useLocaleStore.getState().removeLocale(oldLocaleId);

  finalizePlanetTransition(newPlanet, oldPlanet);
}

/**
 * The Sector Settings retransmit action — four branches, per
 * docs/specs/SECTOR_SETTINGS.md §1's preservation rules. `input`'s two
 * fields are each present only if the user actually edited that panel;
 * absence means "preserve as-is," not "reset to default."
 */
export function retransmitWorld(input: RetransmitInput): void {
  const action = resolveRetransmitAction(input);
  if (action.mode === 'noop') return;

  useUIStore.getState().selectRobot(null);
  const oldPlanet = selectCurrentPlanet(usePlanetStore.getState());
  if (!oldPlanet) return;
  const oldLocaleId = oldPlanet.currentLocaleId;

  switch (action.mode) {
    case 'coordsOnly':
      retransmitCoordsOnly(oldPlanet, oldLocaleId, action.coordinates);
      break;
    case 'planetOnly':
      retransmitPlanetOnly(oldPlanet, oldLocaleId, action.planetName);
      break;
    case 'both':
      retransmitBoth(oldPlanet, oldLocaleId, action.planetName, action.coordinates);
      break;
  }
}
