// ========================================
// MOCKS
// ========================================
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../engine/beatClock', () => ({
  subscribeToMeasure: vi.fn(() => vi.fn()),
  getCurrentMeasure: vi.fn(() => 0),
}));

// ========================================
// IMPORTS
// ========================================
import { useLocaleStore, DEFAULT_LOCALE, DEFAULT_LOCALE_ID } from '../stores/localeStore';
import { usePlanetStore, selectCurrentPlanet, DEFAULT_PELAGOS } from '../stores/planetStore';
import { useUIStore } from '../stores/uiStore';
import { useAudioStore } from '../stores/audioStore';
import { AudioEngine } from '../engine/AudioEngine';
import { getLocaleNoiseMap, tryGetLocaleNoiseMap } from '../utils/noiseMaps';
import { getSeededVal } from '../utils/getSeededVal';
import { initializeLocale, retransmitWorld } from './worldTransition';
import { stopRobotLifecycle } from './robotSystems';
import { MAX_ROBOTS } from '../constants';
import { RobotState, DockingState } from '../types/Robot';
import type { Robot } from '../types/Robot';

// ========================================
// HELPERS
// ========================================

function resetStores() {
  usePlanetStore.setState({ planets: [{ ...DEFAULT_PELAGOS }], currentPlanetId: DEFAULT_PELAGOS.id });
  useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: { ...DEFAULT_LOCALE, robots: [], actors: [] } } });
  useUIStore.setState({ selectedRobotId: null, activeHubTile: null });
}

const makeRobot = (id: string): Robot => ({
  id,
  state: RobotState.Idle,
  direction: 'right',
  position: { x: 0, y: 0 },
  destination: null,
  melody: [],
  audioAttributes: { waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, filterFreq: 0 },
  octaveRange: [3, 4],
  createdAt: Date.now(),
  masterVolume: 0.7,
  docking: DockingState.Active,
  batteryLevel: 100,
});

// ========================================
// TESTS
// ========================================

describe('worldTransition', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopRobotLifecycle();
  });

  describe('initializeLocale', () => {
    it(`places factories and spawns exactly ${MAX_ROBOTS} robots for an empty locale`, () => {
      initializeLocale(DEFAULT_LOCALE_ID);
      const locale = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!;
      expect(locale.actors.length).toBeGreaterThan(0);
      expect(locale.robots).toHaveLength(MAX_ROBOTS);
    });

    it('assigns a job to every initially-Active robot', () => {
      initializeLocale(DEFAULT_LOCALE_ID);
      const locale = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!;
      locale.robots.filter((r) => r.docking === DockingState.Active).forEach((r) => {
        expect(r.job).toBeDefined();
      });
    });

    it('is a no-op for factories/robots when called again on an already-populated locale', () => {
      initializeLocale(DEFAULT_LOCALE_ID);
      const afterFirst = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!;
      const actorsAfterFirst = afterFirst.actors;
      const robotsAfterFirst = afterFirst.robots;

      initializeLocale(DEFAULT_LOCALE_ID);
      const afterSecond = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!;

      expect(afterSecond.actors).toBe(actorsAfterFirst);
      expect(afterSecond.robots).toBe(robotsAfterFirst);
    });

    it('still restarts the robot lifecycle tick on a second call, even when idempotent on factories/robots', async () => {
      const { subscribeToMeasure } = await import('../engine/beatClock');
      initializeLocale(DEFAULT_LOCALE_ID);
      initializeLocale(DEFAULT_LOCALE_ID);
      expect(subscribeToMeasure).toHaveBeenCalledTimes(2);
    });

    it('does nothing for an unknown locale id', () => {
      expect(() => initializeLocale('nonexistent')).not.toThrow();
    });

    it('populates companies for an empty locale, immediately after spawning the roster', () => {
      initializeLocale(DEFAULT_LOCALE_ID);
      const locale = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!;
      expect(locale.companies.length).toBeGreaterThan(0);
    });

    it('is a no-op for companies when called again on an already-populated locale', () => {
      initializeLocale(DEFAULT_LOCALE_ID);
      const companiesAfterFirst = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!.companies;

      initializeLocale(DEFAULT_LOCALE_ID);
      const companiesAfterSecond = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!.companies;

      expect(companiesAfterSecond).toBe(companiesAfterFirst);
    });
  });

  describe('retransmitWorld — no-op', () => {
    it('makes zero store mutations and zero AudioEngine/selectRobot calls when neither field is set', () => {
      const releaseVoiceSpy = vi.spyOn(AudioEngine, 'releaseVoice');
      const selectRobotSpy = vi.spyOn(useUIStore.getState(), 'selectRobot');
      const planetsBefore = usePlanetStore.getState().planets;
      const localesBefore = useLocaleStore.getState().locales;

      retransmitWorld({});

      expect(usePlanetStore.getState().planets).toBe(planetsBefore);
      expect(useLocaleStore.getState().locales).toBe(localesBefore);
      expect(releaseVoiceSpy).not.toHaveBeenCalled();
      expect(selectRobotSpy).not.toHaveBeenCalled();

      releaseVoiceSpy.mockRestore();
      selectRobotSpy.mockRestore();
    });
  });

  describe('retransmitWorld — coordinates changed, planet preserved', () => {
    it('never touches currentPlanetId, leaving Audio Rig/LFO state untouched', () => {
      const globalAudioBefore = useAudioStore.getState().globalAudio;
      const planetIdBefore = usePlanetStore.getState().currentPlanetId;

      retransmitWorld({ coordinates: { x: 1000, y: 2000 } });

      expect(usePlanetStore.getState().currentPlanetId).toBe(planetIdBefore);
      expect(useAudioStore.getState().globalAudio).toBe(globalAudioBefore);
    });

    it('creates a new locale at the new coordinates and releases the old locale\'s robots', () => {
      // Give the old (default) locale a robot to verify cleanup.
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('old-robot'));
      const releaseVoiceSpy = vi.spyOn(AudioEngine, 'releaseVoice');

      retransmitWorld({ coordinates: { x: 1000, y: 2000 } });

      const planet = selectCurrentPlanet(usePlanetStore.getState())!;
      expect(planet.currentLocaleId).not.toBe(DEFAULT_LOCALE_ID);
      const newLocale = useLocaleStore.getState().getLocaleById(planet.currentLocaleId!)!;
      expect(newLocale.coordinates).toEqual({ x: 1000, y: 2000 });
      expect(newLocale.robots).toHaveLength(MAX_ROBOTS);
      expect(useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)).toBeUndefined();
      expect(releaseVoiceSpy).toHaveBeenCalledWith('old-robot');

      releaseVoiceSpy.mockRestore();
    });

    it('the decoupling guarantee: the new locale\'s noise map matches what those coordinates produce independent of planet', () => {
      retransmitWorld({ coordinates: { x: 1000, y: 2000 } });
      const planet = selectCurrentPlanet(usePlanetStore.getState())!;
      const newLocale = useLocaleStore.getState().getLocaleById(planet.currentLocaleId!)!;

      const independentMap = getLocaleNoiseMap('independent-check-locale', 1000, 2000);
      const actualMap = getLocaleNoiseMap(newLocale.id, 1000, 2000); // already cached — returns the same map

      expect(getSeededVal(actualMap, 'robot.audio.attack')).toBe(getSeededVal(independentMap, 'robot.audio.attack'));
    });

    it('clears selectedRobotId but leaves activeHubTile untouched', () => {
      useUIStore.setState({ selectedRobotId: 'some-robot', activeHubTile: 'settings' });
      retransmitWorld({ coordinates: { x: 1000, y: 2000 } });
      expect(useUIStore.getState().selectedRobotId).toBeNull();
      expect(useUIStore.getState().activeHubTile).toBe('settings');
    });
  });

  describe('retransmitWorld — planet changed, coordinates preserved', () => {
    it('re-parents the SAME locale record onto the new planet, unchanged', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('kept-robot'));
      const robotsBefore = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!.robots;
      const releaseVoiceSpy = vi.spyOn(AudioEngine, 'releaseVoice');

      retransmitWorld({ planetName: 'Kryndara Prime' });

      const planet = selectCurrentPlanet(usePlanetStore.getState())!;
      expect(planet.id).not.toBe(DEFAULT_PELAGOS.id);
      expect(planet.name).toBe('Kryndara Prime');
      expect(planet.currentLocaleId).toBe(DEFAULT_LOCALE_ID);

      const locale = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)!;
      expect(locale.robots).toBe(robotsBefore); // same array reference — not regenerated
      expect(locale.planetId).toBe(planet.id);
      expect(releaseVoiceSpy).not.toHaveBeenCalled(); // preserved locale's robots are NOT released

      releaseVoiceSpy.mockRestore();
    });

    it('reseeds Audio Rig/global LFO state for the new planet', () => {
      const globalAudioBefore = useAudioStore.getState().globalAudio;
      retransmitWorld({ planetName: 'Halcyon Drift' });
      expect(useAudioStore.getState().globalAudio).not.toBe(globalAudioBefore);
    });

    it('discards the old planet record', () => {
      retransmitWorld({ planetName: 'The Rusting' });
      expect(usePlanetStore.getState().planets.find((p) => p.id === DEFAULT_PELAGOS.id)).toBeUndefined();
    });

    it('re-warms the preserved locale\'s noise map — removePlanet\'s eviction cascade would otherwise leave it uncached', () => {
      // DEFAULT_PELAGOS.locales lists DEFAULT_LOCALE_ID, so removePlanet's
      // cascade evicts it even though this branch is keeping the locale —
      // without a re-warm, AudioEngine's non-throwing tryGetLocaleNoiseMap
      // lookup would see a gap until the next scheduled spawn tick.
      retransmitWorld({ planetName: 'Kryndara' });
      expect(tryGetLocaleNoiseMap(DEFAULT_LOCALE_ID)).not.toBeNull();
    });

    it('the re-warmed noise map matches the decoupling guarantee (same as any fresh lookup at the same coordinates)', () => {
      retransmitWorld({ planetName: 'Kryndara' });
      const rewarmed = tryGetLocaleNoiseMap(DEFAULT_LOCALE_ID)!;
      const independent = getLocaleNoiseMap('independent-check-locale-2', DEFAULT_LOCALE.coordinates.x, DEFAULT_LOCALE.coordinates.y);
      expect(getSeededVal(rewarmed, 'robot.audio.attack')).toBe(getSeededVal(independent, 'robot.audio.attack'));
    });
  });

  describe('retransmitWorld — both changed (full reset)', () => {
    it('creates a new planet and a new locale, releasing the old locale\'s robots first', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('discarded-robot'));
      const releaseVoiceSpy = vi.spyOn(AudioEngine, 'releaseVoice');

      retransmitWorld({ planetName: 'Vessport Null', coordinates: { x: 42, y: 42 } });

      const planet = selectCurrentPlanet(usePlanetStore.getState())!;
      expect(planet.id).not.toBe(DEFAULT_PELAGOS.id);
      expect(planet.name).toBe('Vessport Null');
      const locale = useLocaleStore.getState().getLocaleById(planet.currentLocaleId!)!;
      expect(locale.coordinates).toEqual({ x: 42, y: 42 });
      expect(locale.robots).toHaveLength(MAX_ROBOTS);
      expect(releaseVoiceSpy).toHaveBeenCalledWith('discarded-robot');
      expect(usePlanetStore.getState().planets.find((p) => p.id === DEFAULT_PELAGOS.id)).toBeUndefined();

      releaseVoiceSpy.mockRestore();
    });
  });

  describe('robot lifecycle tick ordering', () => {
    it('stops the previous tick before starting the new locale\'s', async () => {
      const { subscribeToMeasure } = await import('../engine/beatClock');
      initializeLocale(DEFAULT_LOCALE_ID); // first tick running
      const firstUnsubscribe = vi.mocked(subscribeToMeasure).mock.results[0].value;

      retransmitWorld({ coordinates: { x: 500, y: 500 } }); // must stop-then-start for the new locale

      expect(firstUnsubscribe).toHaveBeenCalled();
      expect(subscribeToMeasure).toHaveBeenCalledTimes(2);
      const unsubOrder = firstUnsubscribe.mock.invocationCallOrder[0];
      const secondSubscribeOrder = vi.mocked(subscribeToMeasure).mock.invocationCallOrder[1];
      expect(unsubOrder).toBeLessThan(secondSubscribeOrder);
    });
  });
});
