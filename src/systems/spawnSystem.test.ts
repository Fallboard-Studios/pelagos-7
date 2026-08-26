// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import alea from 'alea';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import type { Robot } from '../types/Robot';

import { generateSpawnPosition, generateAudioAttributes, generateRobotLfoSettings, spawnRobot } from './spawnSystem';
import { useLocaleStore, DEFAULT_LOCALE } from '../stores/localeStore';
import { DEFAULT_LOCALE_ID } from '../stores/planetStore';
import { AudioEngine } from '../engine/AudioEngine';
import { RobotState } from '../types/Robot';
import { ROBOT_LFO_TARGET_IDS, LFO_SHAPES, LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '../types/lfo';

/** General-purpose mock: returns a pseudo-random value in [-1, 1]. */
const mockNoiseMap: NoiseFunction2D = () => Math.random() * 2 - 1;

/** Deterministic mock: always returns -1, mapping every getSeededVal call to its min value. */
const deterministicNoiseMap: NoiseFunction2D = () => -1;

vi.mock('../engine/beatClock', () => ({
  scheduleRepeat: vi.fn(() => 'beat-spawn-1'),
  cancelSchedule: vi.fn(),
}));

// ========================================
// TESTS
// ========================================

describe('spawnSystem', () => {
  describe('generateSpawnPosition', () => {
    it('generates position just outside world bounds (off-screen)', () => {
      const position = generateSpawnPosition(mockNoiseMap, 0);
      // Must be outside the viewBox on at least one axis
      const outsideX = position.x < 0 || position.x > 1920;
      const outsideY = position.y < 0 || position.y > 1080;
      expect(outsideX || outsideY).toBe(true);
    });

    it('generates positions on all four edges (off-screen)', () => {
      const positions = Array.from({ length: 100 }, (_, i) => generateSpawnPosition(mockNoiseMap, i));

      const leftEdge = positions.filter((p) => p.x < 0).length;
      const rightEdge = positions.filter((p) => p.x > 1920).length;
      const topEdge = positions.filter((p) => p.y < 0).length;
      const bottomEdge = positions.filter((p) => p.y > 1080).length;

      // Each edge should be hit roughly 25% of the time over 100 samples
      expect(leftEdge).toBeGreaterThanOrEqual(10);
      expect(rightEdge).toBeGreaterThanOrEqual(10);
      expect(topEdge).toBeGreaterThanOrEqual(10);
      expect(bottomEdge).toBeGreaterThanOrEqual(10);
    });

    it('generates varied positions (not all the same)', () => {
      const positions = Array.from({ length: 20 }, (_, i) => generateSpawnPosition(mockNoiseMap, i));
      const uniqueX = new Set(positions.map((p) => Math.round(p.x)));
      const uniqueY = new Set(positions.map((p) => Math.round(p.y)));

      expect(uniqueX.size).toBeGreaterThan(8); // Should have variety
      expect(uniqueY.size).toBeGreaterThanOrEqual(8);
    });
  });

  describe('generateAudioAttributes', () => {
    it('generates valid synth type', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      expect(['sine', 'square', 'triangle', 'sawtooth', 'pulse']).toContain(attrs.waveform);
    });

    it('generates ADSR values in valid ranges', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      expect(attrs.adsr.attack).toBeGreaterThanOrEqual(0.01);
      expect(attrs.adsr.attack).toBeLessThanOrEqual(2.0);
      expect(attrs.adsr.decay).toBeGreaterThanOrEqual(0.05);
      expect(attrs.adsr.decay).toBeLessThanOrEqual(2.0);
      expect(attrs.adsr.sustain).toBeGreaterThanOrEqual(0.0);
      expect(attrs.adsr.sustain).toBeLessThanOrEqual(1.0);
      expect(attrs.adsr.release).toBeGreaterThanOrEqual(0.1);
      expect(attrs.adsr.release).toBeLessThanOrEqual(5.0);
    });

    it('generates octave range from predefined registers', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      const validRegisters: [number, number][] = [[1, 3], [2, 4], [3, 5], [4, 6], [5, 7]];

      const matchesRegister = validRegisters.some(
        ([min, max]) =>
          attrs.octaveRange?.[0] === min && attrs.octaveRange?.[1] === max
      );

      expect(matchesRegister).toBe(true);
    });

    it('generates filter frequency in valid range', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      expect(attrs.filterFreq).toBeGreaterThanOrEqual(400);
      expect(attrs.filterFreq).toBeLessThanOrEqual(2500);
    });

    it('generates varied attributes (not all the same)', () => {
      const attributes = Array.from({ length: 20 }, (_, i) => generateAudioAttributes(mockNoiseMap, i));
      const uniqueWaveforms = new Set(attributes.map((a) => a.waveform));
      const uniqueAttacks = new Set(attributes.map((a) => a.adsr.attack.toFixed(2)));
      // Synth type is now generic; ensure ADSR variety still exists
      expect(uniqueWaveforms.size).toBeGreaterThan(1);
      expect(uniqueAttacks.size).toBeGreaterThan(10); // Should have variety
    });

    it('creates layers with 1..MAX_LAYERS and shapeParams in range', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      const vm = attrs.visualAudioMap;
      expect(vm).toBeDefined();
      const layers = attrs.layers ?? [];
      expect(layers.length).toBeGreaterThanOrEqual(1);
      expect(layers.length).toBeLessThanOrEqual(5);
      // averagedADSR should be within ADSR_MAX-derived bounds
      expect(vm?.averagedADSR).toBeDefined();
      expect(vm?.averagedADSR?.attack).toBeGreaterThanOrEqual(0);
      expect(vm?.averagedADSR?.decay).toBeGreaterThanOrEqual(0);
      expect(vm?.averagedADSR?.sustain).toBeGreaterThanOrEqual(0);
      expect(vm?.averagedADSR?.release).toBeGreaterThanOrEqual(0);
      // shape params 0..1
      expect(vm?.shapeParams?.scale).toBeGreaterThanOrEqual(0);
      expect(vm?.shapeParams?.scale).toBeLessThanOrEqual(1);
      expect(vm?.shapeParams?.roundness).toBeGreaterThanOrEqual(0);
      expect(vm?.shapeParams?.roundness).toBeLessThanOrEqual(1);
      expect(vm?.shapeParams?.detail).toBeGreaterThanOrEqual(0);
      expect(vm?.shapeParams?.detail).toBeLessThanOrEqual(1);
    });

    it('averagedADSR equals single layer ADSR when only one layer (deterministic)', () => {
      // deterministicNoiseMap always returns -1, mapping every getSeededVal to its min.
      // numLayers = 1 + floor(0) = 1; all ADSR values = their respective minimums.
      const attrs = generateAudioAttributes(deterministicNoiseMap, 0);
      const layers = attrs.layers ?? [];
      // With noiseMap always -1 we always get exactly 1 layer
      expect(layers.length).toBe(1);
      const layerAdsr = layers[0].adsr!;
      const avg = attrs.visualAudioMap!.averagedADSR!;
      // Gain-weighted average of a single layer equals that layer's own values
      expect(avg.attack).toBeCloseTo(layerAdsr.attack as number, 6);
      expect(avg.decay).toBeCloseTo(layerAdsr.decay as number, 6);
      expect(avg.sustain).toBeCloseTo(layerAdsr.sustain as number, 6);
      expect(avg.release).toBeCloseTo(layerAdsr.release as number, 6);
    });
  });

  describe('generateRobotLfoSettings', () => {
    it('generates LfoSettings for all 13 RobotLfoTargetId values, no extras', () => {
      const settings = generateRobotLfoSettings(mockNoiseMap, 0);
      expect(Object.keys(settings).sort()).toEqual([...ROBOT_LFO_TARGET_IDS].sort());
    });

    it('every target\'s shape/rate/depth falls within documented bounds', () => {
      const settings = generateRobotLfoSettings(mockNoiseMap, 0);
      for (const target of ROBOT_LFO_TARGET_IDS) {
        const s = settings[target];
        expect(LFO_SHAPES, `${target}.shape`).toContain(s.shape);
        expect(s.rate, `${target}.rate >= min`).toBeGreaterThanOrEqual(LFO_RATE_MIN);
        expect(s.rate, `${target}.rate <= max`).toBeLessThanOrEqual(LFO_RATE_MAX);
        expect(s.depth, `${target}.depth >= min`).toBeGreaterThanOrEqual(LFO_DEPTH_MIN);
        expect(s.depth, `${target}.depth <= max`).toBeLessThanOrEqual(LFO_DEPTH_MAX);
      }
    });

    it('gives different targets different values within the same call — dataIds are genuinely distinct, not colliding', () => {
      const settings = generateRobotLfoSettings(mockNoiseMap, 0);
      const rates = ROBOT_LFO_TARGET_IDS.map((t) => settings[t].rate);
      expect(new Set(rates.map((r) => r.toFixed(6))).size).toBeGreaterThan(1);
    });

    it('is deterministic — the same real seeded noise map + offset always produces identical LfoSettings', () => {
      const noiseMap = createNoise2D(alea('lfo-determinism-test-seed'));
      const first = generateRobotLfoSettings(noiseMap, 5);
      const second = generateRobotLfoSettings(noiseMap, 5);
      expect(second).toEqual(first);
    });

    it('produces different LfoSettings for a different spawn offset (non-degenerate)', () => {
      const noiseMap = createNoise2D(alea('lfo-determinism-test-seed'));
      const a = generateRobotLfoSettings(noiseMap, 0);
      const b = generateRobotLfoSettings(noiseMap, 1);
      expect(b).not.toEqual(a);
    });
  });

  describe('spawnRobot', () => {
    beforeEach(() => {
      // Reset locale store before each test
      useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE } });
      vi.clearAllMocks();
    });

    it('spawns a robot and adds to store', () => {
      const registerSpy = vi.spyOn(AudioEngine, 'registerRobotMelody');

      spawnRobot(DEFAULT_LOCALE_ID);

      const robots = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];
      expect(robots.length).toBe(1);

      const robot = robots[0];
      expect(robot.id).toBeDefined();
      expect(robot.state).toBe('idle');
      expect(robot.position).toBeDefined();
      expect(robot.destination).toBeNull();
      expect(robot.melody).toBeDefined();
      expect(robot.melody.length).toBeGreaterThan(0);
      expect(robot.audioAttributes).toBeDefined();
      expect(robot.lfoSettings).toBeDefined();
      expect(Object.keys(robot.lfoSettings ?? {}).sort()).toEqual([...ROBOT_LFO_TARGET_IDS].sort());

      expect(registerSpy).toHaveBeenCalledWith(robot.id, robot.melody);
    });

    it('spawns robots with the new percentage/toggle melody shapes', () => {
      spawnRobot(DEFAULT_LOCALE_ID);
      const robot = (useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [])[0];

      expect(typeof robot.rhythmicDensity).toBe('number');
      expect(robot.rhythmicDensity).toBeGreaterThanOrEqual(0);
      expect(robot.rhythmicDensity).toBeLessThanOrEqual(100);

      expect(robot.rhythmicMotifLength).toEqual(
        expect.objectContaining({ active: expect.any(Boolean), value: expect.any(Number) })
      );
      expect(robot.rhythmicMotifLength!.value).toBeGreaterThanOrEqual(1);
      expect(robot.rhythmicMotifLength!.value).toBeLessThanOrEqual(8);

      expect(robot.noteVariance).toEqual(
        expect.objectContaining({ active: expect.any(Boolean), value: expect.any(Number) })
      );
      expect(robot.noteVariance!.value).toBeGreaterThanOrEqual(1);
      expect(robot.noteVariance!.value).toBeLessThanOrEqual(8);
    });

    it('seeds rhythmicMotifLength.active at roughly an 85% chance across many spawns', () => {
      // A dedicated locale ID, not DEFAULT_LOCALE_ID: spawnCounters is keyed
      // per-locale, so this test's result is independent of how many times
      // earlier tests in this file already called spawnRobot(DEFAULT_LOCALE_ID)
      // -- otherwise this deterministic seeded roll depends on execution order.
      const localeId = 'motif-active-stat-test-locale';
      useLocaleStore.setState((state) => ({
        locales: {
          ...state.locales,
          [localeId]: { ...DEFAULT_LOCALE, id: localeId, robots: [], settings: { ...DEFAULT_LOCALE.settings, maxRobots: 500 } },
        },
      }));
      const n = 500;
      for (let i = 0; i < n; i++) spawnRobot(localeId);
      const robots = useLocaleStore.getState().getLocaleById(localeId)?.robots ?? [];
      const activeCount = robots.filter((r) => r.rhythmicMotifLength?.active).length;
      const activeFraction = activeCount / robots.length;
      // ~30% of spawns copy an existing robot's setting rather than rolling fresh,
      // which adds clustering variance but doesn't bias the marginal proportion —
      // generous band to avoid flakiness while still discriminating from the old
      // ~66% (shared with noteVariance) threshold.
      expect(activeFraction).toBeGreaterThanOrEqual(0.75);
      expect(activeFraction).toBeLessThanOrEqual(0.95);
    });

    it('a copied robot inherits the source\'s rhythmicDensity/rhythmicMotifLength/noteVariance rather than rolling fresh ones', () => {
      useLocaleStore.getState().setLocaleData(DEFAULT_LOCALE_ID, {
        settings: { ...DEFAULT_LOCALE.settings, maxRobots: 100 },
      });
      for (let i = 0; i < 30; i++) spawnRobot(DEFAULT_LOCALE_ID);
      const robots = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];
      const byLfo = new Map<Robot['lfoSettings'], Robot[]>();
      for (const r of robots) {
        const group = byLfo.get(r.lfoSettings) ?? [];
        group.push(r);
        byLfo.set(r.lfoSettings, group);
      }
      const sharedGroup = [...byLfo.values()].find((g) => g.length > 1);
      expect(sharedGroup, 'expected at least one copy to share its source\'s object references').toBeDefined();
      const [a, b] = sharedGroup!;
      expect(a.rhythmicDensity).toBe(b.rhythmicDensity);
      expect(a.rhythmicMotifLength).toEqual(b.rhythmicMotifLength);
      expect(a.noteVariance).toEqual(b.noteVariance);
    });

    it('a copied robot inherits the source\'s lfoSettings rather than generating fresh ones', () => {
      // Raise maxRobots so 30 spawns don't trigger the oldest-robot removal
      // churn (default cap is 12) — that's an orthogonal system this test
      // isn't about. 30 spawns at a ~30% copy chance per spawn makes at
      // least one copy virtually certain (P(zero copies) ≈ 0.7^29 ≈ 0.00002).
      useLocaleStore.getState().setLocaleData(DEFAULT_LOCALE_ID, {
        settings: { ...DEFAULT_LOCALE.settings, maxRobots: 100 },
      });
      for (let i = 0; i < 30; i++) spawnRobot(DEFAULT_LOCALE_ID);
      const robots = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];
      const bySettings = new Map<Robot['lfoSettings'], Robot[]>();
      for (const r of robots) {
        const group = bySettings.get(r.lfoSettings) ?? [];
        group.push(r);
        bySettings.set(r.lfoSettings, group);
      }
      const sharedGroup = [...bySettings.values()].find((g) => g.length > 1);
      expect(sharedGroup, 'expected at least one copy to share its source\'s lfoSettings reference').toBeDefined();
    });

    it('enforces MAX_ROBOTS limit', () => {
      const maxRobots = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.settings?.maxRobots ?? 12;

      // Spawn max robots
      for (let i = 0; i < maxRobots; i++) {
        spawnRobot(DEFAULT_LOCALE_ID);
      }

      const robotsNow = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];
      expect(robotsNow.length).toBe(maxRobots);

      // Try to spawn one more
      spawnRobot(DEFAULT_LOCALE_ID);

      // Should still be at max (oldest removed)
      const robotsAfter = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];
      expect(robotsAfter.length).toBe(maxRobots - 1);
    });

    it('spawns multiple robots with unique IDs', () => {
      spawnRobot(DEFAULT_LOCALE_ID);
      spawnRobot(DEFAULT_LOCALE_ID);
      spawnRobot(DEFAULT_LOCALE_ID);

      const robots = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];
      const ids = new Set(robots.map((r) => r.id));

      expect(robots.length).toBe(3);
      expect(ids.size).toBe(3); // All unique
    });

    it('generates robots with different attributes', () => {
      spawnRobot(DEFAULT_LOCALE_ID);
      spawnRobot(DEFAULT_LOCALE_ID);
      spawnRobot(DEFAULT_LOCALE_ID);

      const robots = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];

      // Positions should differ (ensures different robots)
      const positions = robots.map((r) => `${r.position.x},${r.position.y}`);
      const uniquePositions = new Set(positions);

      expect(uniquePositions.size).toBeGreaterThan(1); // Different positions
    });

    it('removes oldest robot when at max and does not add', () => {
      useLocaleStore.getState().setLocaleData(DEFAULT_LOCALE_ID, { settings: { ...(useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.settings ?? {}), maxRobots: 3 } });
      const addRobot = useLocaleStore.getState().addRobot;
      // seed store with max robots
      addRobot(DEFAULT_LOCALE_ID, { id: 'a', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 1000, masterVolume: 0.7 } as Robot);
      addRobot(DEFAULT_LOCALE_ID, { id: 'b', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 2000, masterVolume: 0.7 } as Robot);
      addRobot(DEFAULT_LOCALE_ID, { id: 'c', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 3000, masterVolume: 0.7 } as Robot);
      expect(useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots?.length).toBe(3);

      spawnRobot(DEFAULT_LOCALE_ID);

      const robots = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots ?? [];
      expect(robots.length).toBe(2);
      expect(robots.find(r => r.id === 'a')).toBeUndefined();
    });

    it('respects minRobots and does not remove below it', () => {
      // set max and min equal
      useLocaleStore.getState().setLocaleData(DEFAULT_LOCALE_ID, { settings: { bpm: 120, maxRobots: 1, minRobots: 1 } });
      const addRobot2 = useLocaleStore.getState().addRobot;
      addRobot2(DEFAULT_LOCALE_ID, { id: 'only', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 123, masterVolume: 0.7 } as Robot);

      spawnRobot(DEFAULT_LOCALE_ID);
      expect(useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots?.length).toBe(1);
    });
  });

  describe('spawnRobot — deterministic robot IDs', () => {
    beforeEach(() => {
      vi.resetModules();
      vi.clearAllMocks();
    });

    it('robot.id is not a crypto.randomUUID-shaped string', () => {
      // melodyGenerator.ts still legitimately calls crypto.randomUUID() for each
      // melody EVENT's own id — unrelated and untouched by this task. This test
      // checks the ROBOT id's own shape, not whether randomUUID is called at all.
      useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE } });
      spawnRobot(DEFAULT_LOCALE_ID);
      const robot = useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots[0];
      const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(robot?.id).toBeDefined();
      expect(uuidShape.test(robot!.id)).toBe(false);
    });

    it('spawning against the same locale coordinates twice (fresh module state each time) produces identical ID sequences', async () => {
      // Simulates a reload/shared-link replay: a brand-new module instance
      // (spawnCounters reset to empty) spawning against the same coordinates
      // must reproduce the exact same ID sequence, since Session Storage
      // (Phase 11) needs to reapply overrides by ID after the roster
      // regenerates. Reuses this file's existing vi.resetModules() pattern
      // (see 'startSpawnScheduler / stopSpawnScheduler' below) rather than
      // reaching into spawnSystem's private per-locale counter.
      vi.resetModules();
      const run1 = await import('./spawnSystem');
      const store1 = await import('../stores/localeStore');
      const planet1 = await import('../stores/planetStore');
      store1.useLocaleStore.setState({ locales: { [planet1.DEFAULT_LOCALE_ID]: store1.DEFAULT_LOCALE } });
      run1.spawnRobot(planet1.DEFAULT_LOCALE_ID);
      run1.spawnRobot(planet1.DEFAULT_LOCALE_ID);
      const idsRun1 = (store1.useLocaleStore.getState().getLocaleById(planet1.DEFAULT_LOCALE_ID)?.robots ?? []).map((r) => r.id);

      vi.resetModules();
      const run2 = await import('./spawnSystem');
      const store2 = await import('../stores/localeStore');
      const planet2 = await import('../stores/planetStore');
      store2.useLocaleStore.setState({ locales: { [planet2.DEFAULT_LOCALE_ID]: store2.DEFAULT_LOCALE } });
      run2.spawnRobot(planet2.DEFAULT_LOCALE_ID);
      run2.spawnRobot(planet2.DEFAULT_LOCALE_ID);
      const idsRun2 = (store2.useLocaleStore.getState().getLocaleById(planet2.DEFAULT_LOCALE_ID)?.robots ?? []).map((r) => r.id);

      expect(idsRun1).toHaveLength(2);
      expect(idsRun2).toEqual(idsRun1);
    });

    it('two different locale IDs sharing the same coordinates produce identical ID sequences', () => {
      // Robot ID depends on (coordinates, spawnCount) alone, never on localeId
      // itself — matching the same coordinates-are-the-seed guarantee
      // LOCALE_SEED_DECOUPLING.md established for every other locale-derived value.
      const coords = { x: 5.5, y: -3.25 };
      useLocaleStore.setState({
        locales: {
          'locale-id-test-a': { ...DEFAULT_LOCALE, id: 'locale-id-test-a', coordinates: coords, robots: [] },
          'locale-id-test-b': { ...DEFAULT_LOCALE, id: 'locale-id-test-b', coordinates: coords, robots: [] },
        },
      });

      spawnRobot('locale-id-test-a');
      spawnRobot('locale-id-test-a');
      spawnRobot('locale-id-test-b');
      spawnRobot('locale-id-test-b');

      const idsA = (useLocaleStore.getState().getLocaleById('locale-id-test-a')?.robots ?? []).map((r) => r.id);
      const idsB = (useLocaleStore.getState().getLocaleById('locale-id-test-b')?.robots ?? []).map((r) => r.id);
      expect(idsA).toEqual(idsB);
    });
  });

  describe('startSpawnScheduler / stopSpawnScheduler', () => {
    beforeEach(async () => {
      vi.resetModules();
      vi.clearAllMocks();
    });

    it('startSpawnScheduler is idempotent (multiple calls register only one schedule)', async () => {
      const { scheduleRepeat } = await import('../engine/beatClock');
      const { startSpawnScheduler, stopSpawnScheduler } = await import('./spawnSystem');

      startSpawnScheduler(DEFAULT_LOCALE_ID);
      startSpawnScheduler(DEFAULT_LOCALE_ID);
      startSpawnScheduler(DEFAULT_LOCALE_ID);

      expect(scheduleRepeat).toHaveBeenCalledTimes(1);

      stopSpawnScheduler();
    });

    it('stopSpawnScheduler cancels the Transport schedule', async () => {
      const { cancelSchedule } = await import('../engine/beatClock');
      const { startSpawnScheduler, stopSpawnScheduler } = await import('./spawnSystem');

      startSpawnScheduler(DEFAULT_LOCALE_ID);
      stopSpawnScheduler();

      expect(cancelSchedule).toHaveBeenCalledWith('beat-spawn-1');
    });

    it('stopSpawnScheduler is idempotent when scheduler is not running', async () => {
      const { cancelSchedule } = await import('../engine/beatClock');
      const { stopSpawnScheduler } = await import('./spawnSystem');

      stopSpawnScheduler();
      stopSpawnScheduler();

      expect(cancelSchedule).not.toHaveBeenCalled();
    });
  });
});
