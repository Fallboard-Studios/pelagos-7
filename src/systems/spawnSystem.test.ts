// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NoiseFunction2D } from 'simplex-noise';
import type { Robot } from '../types/Robot';

import { generateSpawnPosition, generateAudioAttributes, spawnRobot } from './spawnSystem';
import { useLocaleStore, DEFAULT_LOCALE } from '../stores/localeStore';
import { DEFAULT_LOCALE_ID } from '../stores/planetStore';
import { AudioEngine } from '../engine/AudioEngine';
import { RobotState } from '../types/Robot';

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
      expect([
        'AMSynth',
        'FMSynth',
        'PolySynth',
        'DuoSynth',
      ]).toContain(attrs.synthType);
    });

    it('generates ADSR values in valid ranges', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      expect(attrs.adsr.attack).toBeGreaterThanOrEqual(0.01);
      expect(attrs.adsr.attack).toBeLessThanOrEqual(0.5);
      expect(attrs.adsr.decay).toBeGreaterThanOrEqual(0.1);
      expect(attrs.adsr.decay).toBeLessThanOrEqual(1.5);
      expect(attrs.adsr.sustain).toBeGreaterThanOrEqual(0.3);
      expect(attrs.adsr.sustain).toBeLessThanOrEqual(0.9);
      expect(attrs.adsr.release).toBeGreaterThanOrEqual(0.2);
      expect(attrs.adsr.release).toBeLessThanOrEqual(1.2);
    });

    it('generates octave range from predefined registers', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      const validRegisters: [number, number][] = [[1, 3], [2, 4], [3, 5]];

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
      const uniqueSynthTypes = new Set(attributes.map((a) => a.synthType));
      const uniqueAttacks = new Set(attributes.map((a) => a.adsr.attack.toFixed(2)));

      expect(uniqueSynthTypes.size).toBeGreaterThan(1);
      expect(uniqueAttacks.size).toBeGreaterThan(10); // Should have variety
    });

    it('creates layeredWave with 1..3 layers and shapeParams in range', () => {
      const attrs = generateAudioAttributes(mockNoiseMap, 0);
      const vm = attrs.visualAudioMap;
      expect(vm).toBeDefined();
      expect(vm?.layeredWave).toBeDefined();
      const layers = vm?.layeredWave?.layers ?? [];
      expect(layers.length).toBeGreaterThanOrEqual(1);
      expect(layers.length).toBeLessThanOrEqual(3);
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
      const vm = attrs.visualAudioMap!;
      const layers = vm.layeredWave?.layers ?? [];
      // With noiseMap always -1 we always get exactly 1 layer
      expect(layers.length).toBe(1);
      const layerAdsr = layers[0].adsr!;
      const avg = vm.averagedADSR!;
      // Gain-weighted average of a single layer equals that layer's own values
      expect(avg.attack).toBeCloseTo(layerAdsr.attack as number, 6);
      expect(avg.decay).toBeCloseTo(layerAdsr.decay as number, 6);
      expect(avg.sustain).toBeCloseTo(layerAdsr.sustain as number, 6);
      expect(avg.release).toBeCloseTo(layerAdsr.release as number, 6);
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

      expect(registerSpy).toHaveBeenCalledWith(robot.id, robot.melody);
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
      addRobot(DEFAULT_LOCALE_ID, { id: 'a', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { synthType: 'AMSynth', waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, pitchRange: { min: 0, max: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 1000, masterVolume: 0.7 } as Robot);
      addRobot(DEFAULT_LOCALE_ID, { id: 'b', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { synthType: 'AMSynth', waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, pitchRange: { min: 0, max: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 2000, masterVolume: 0.7 } as Robot);
      addRobot(DEFAULT_LOCALE_ID, { id: 'c', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { synthType: 'AMSynth', waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, pitchRange: { min: 0, max: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 3000, masterVolume: 0.7 } as Robot);
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
      addRobot2(DEFAULT_LOCALE_ID, { id: 'only', state: RobotState.Idle, direction: 'right', position: { x: 0, y: 0 }, destination: null, melody: [], audioAttributes: { synthType: 'AMSynth', waveform: 'sine', adsr: { attack: 0, decay: 0, sustain: 0, release: 0 }, pitchRange: { min: 0, max: 0 }, filterFreq: 0 }, octaveRange: [3, 4], createdAt: 123, masterVolume: 0.7 } as Robot);

      spawnRobot(DEFAULT_LOCALE_ID);
      expect(useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.robots?.length).toBe(1);
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
