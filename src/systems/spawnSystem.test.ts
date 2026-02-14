// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { generateSpawnPosition, generateAudioAttributes, spawnRobot } from './spawnSystem';
import { useOceanStore } from '../stores/oceanStore';
import { AudioEngine } from '../engine/AudioEngine';

// ========================================
// TESTS
// ========================================

describe('spawnSystem', () => {
  describe('generateSpawnPosition', () => {
    it('generates position within world bounds', () => {
      const position = generateSpawnPosition();
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(1920);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(1080);
    });

    it('generates positions near edges (within 100px margin)', () => {
      const positions = Array.from({ length: 100 }, () => generateSpawnPosition());

      // At least some should be near edges
      const nearLeftEdge = positions.filter((p) => p.x < 100).length;
      const nearRightEdge = positions.filter((p) => p.x > 1820).length;
      const nearTopEdge = positions.filter((p) => p.y < 100).length;
      const nearBottomEdge = positions.filter((p) => p.y > 980).length;

      const totalNearEdge = nearLeftEdge + nearRightEdge + nearTopEdge + nearBottomEdge;

      // All 100 positions should be near at least one edge
      expect(totalNearEdge).toBeGreaterThan(80);
    });

    it('generates varied positions (not all the same)', () => {
      const positions = Array.from({ length: 20 }, () => generateSpawnPosition());
      const uniqueX = new Set(positions.map((p) => Math.round(p.x)));
      const uniqueY = new Set(positions.map((p) => Math.round(p.y)));

      expect(uniqueX.size).toBeGreaterThan(10); // Should have variety
      expect(uniqueY.size).toBeGreaterThan(10);
    });
  });

  describe('generateAudioAttributes', () => {
    it('generates valid synth type', () => {
      const attrs = generateAudioAttributes();
      expect(['AMSynth', 'FMSynth', 'PolySynth', 'MembraneSynth']).toContain(
        attrs.synthType
      );
    });

    it('generates ADSR values in valid ranges', () => {
      const attrs = generateAudioAttributes();
      expect(attrs.adsr.attack).toBeGreaterThanOrEqual(0.01);
      expect(attrs.adsr.attack).toBeLessThanOrEqual(0.5);
      expect(attrs.adsr.decay).toBeGreaterThanOrEqual(0.1);
      expect(attrs.adsr.decay).toBeLessThanOrEqual(1.5);
      expect(attrs.adsr.sustain).toBeGreaterThanOrEqual(0.3);
      expect(attrs.adsr.sustain).toBeLessThanOrEqual(0.9);
      expect(attrs.adsr.release).toBeGreaterThanOrEqual(0.2);
      expect(attrs.adsr.release).toBeLessThanOrEqual(1.2);
    });

    it('generates pitch range from predefined options', () => {
      const attrs = generateAudioAttributes();
      const validRanges = [
        { min: 80, max: 150 },
        { min: 250, max: 450 },
        { min: 700, max: 900 },
      ];

      const matchesRange = validRanges.some(
        (range) =>
          attrs.pitchRange.min === range.min && attrs.pitchRange.max === range.max
      );

      expect(matchesRange).toBe(true);
    });

    it('generates filter frequency in valid range', () => {
      const attrs = generateAudioAttributes();
      expect(attrs.filterFreq).toBeGreaterThanOrEqual(400);
      expect(attrs.filterFreq).toBeLessThanOrEqual(2500);
    });

    it('generates reverb amount between 0 and 1', () => {
      const attrs = generateAudioAttributes();
      expect(attrs.reverb).toBeGreaterThanOrEqual(0);
      expect(attrs.reverb).toBeLessThanOrEqual(1);
    });

    it('generates varied attributes (not all the same)', () => {
      const attributes = Array.from({ length: 20 }, () => generateAudioAttributes());
      const uniqueSynthTypes = new Set(attributes.map((a) => a.synthType));
      const uniqueAttacks = new Set(attributes.map((a) => a.adsr.attack.toFixed(2)));

      expect(uniqueSynthTypes.size).toBeGreaterThan(1);
      expect(uniqueAttacks.size).toBeGreaterThan(10); // Should have variety
    });
  });

  describe('spawnRobot', () => {
    beforeEach(() => {
      // Reset store before each test
      useOceanStore.setState({ robots: [] });
      vi.clearAllMocks();
    });

    it('spawns a robot and adds to store', () => {
      const registerSpy = vi.spyOn(AudioEngine, 'registerRobotMelody');

      spawnRobot();

      const robots = useOceanStore.getState().robots;
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
      const maxRobots = useOceanStore.getState().settings.maxRobots;

      // Spawn max robots
      for (let i = 0; i < maxRobots; i++) {
        spawnRobot();
      }

      expect(useOceanStore.getState().robots.length).toBe(maxRobots);

      // Try to spawn one more
      spawnRobot();

      // Should still be at max
      expect(useOceanStore.getState().robots.length).toBe(maxRobots);
    });

    it('spawns multiple robots with unique IDs', () => {
      spawnRobot();
      spawnRobot();
      spawnRobot();

      const robots = useOceanStore.getState().robots;
      const ids = new Set(robots.map((r) => r.id));

      expect(robots.length).toBe(3);
      expect(ids.size).toBe(3); // All unique
    });

    it('generates robots with different attributes', () => {
      spawnRobot();
      spawnRobot();
      spawnRobot();

      const robots = useOceanStore.getState().robots;

      // Positions should differ (ensures different robots)
      const positions = robots.map((r) => `${r.position.x},${r.position.y}`);
      const uniquePositions = new Set(positions);

      expect(uniquePositions.size).toBeGreaterThan(1); // Different positions
    });
  });
});
