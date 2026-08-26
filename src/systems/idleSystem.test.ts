// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach } from 'vitest';
import type { NoiseFunction2D } from 'simplex-noise';

import { pickDestination, handleRobotIdle } from './idleSystem';
import { useLocaleStore, DEFAULT_LOCALE } from '../stores/localeStore';
import { DEFAULT_LOCALE_ID } from '../stores/planetStore';
import { RobotState, DockingState } from '../types/Robot';
import type { Robot } from '../types/Robot';

/** General-purpose mock: returns a pseudo-random value in [-1, 1]. */
const mockNoiseMap: NoiseFunction2D = () => Math.random() * 2 - 1;

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'idle-test-robot',
    state: RobotState.Idle,
    position: { x: 100, y: 100 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: { adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2 }, filterFreq: 800, waveform: 'sine' },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: DockingState.Active,
    batteryLevel: 100,
    ...overrides,
  };
}

// ========================================
// TESTS
// ========================================

describe('idleSystem', () => {
  describe('pickDestination', () => {
    it('generates destination within world bounds', () => {
      const destination = pickDestination(mockNoiseMap, 0, 0);
      expect(destination.x).toBeGreaterThanOrEqual(0);
      expect(destination.x).toBeLessThanOrEqual(1920);
      expect(destination.y).toBeGreaterThanOrEqual(0);
      expect(destination.y).toBeLessThanOrEqual(1080);
    });

    it('generates destination with margin from edges', () => {
      const WORLD_MARGIN = 100;
      const destination = pickDestination(mockNoiseMap, 0, 0);

      // Should be at least WORLD_MARGIN from edges
      expect(destination.x).toBeGreaterThanOrEqual(WORLD_MARGIN);
      expect(destination.x).toBeLessThanOrEqual(1920 - WORLD_MARGIN);
      expect(destination.y).toBeGreaterThanOrEqual(WORLD_MARGIN);
      expect(destination.y).toBeLessThanOrEqual(1080 - WORLD_MARGIN);
    });

    it('generates varied destinations (not all the same)', () => {
      const destinations = Array.from({ length: 20 }, (_, i) => pickDestination(mockNoiseMap, 0, i));
      const uniqueX = new Set(destinations.map((d) => Math.round(d.x)));
      const uniqueY = new Set(destinations.map((d) => Math.round(d.y)));

      // Should have variety
      expect(uniqueX.size).toBeGreaterThan(10);
      expect(uniqueY.size).toBeGreaterThan(10);
    });

    it('generates destinations in center area (not just edges)', () => {
      const destinations = Array.from({ length: 100 }, (_, i) => pickDestination(mockNoiseMap, 0, i));

      // At least some should be in center region (away from all edges)
      const centerRegion = destinations.filter(
        (d) =>
          d.x > 500 &&
          d.x < 1420 &&
          d.y > 300 &&
          d.y < 780
      );

      expect(centerRegion.length).toBeGreaterThanOrEqual(20); // Should have good distribution
    });

    it('uses full available space (not clustered)', () => {
      const destinations = Array.from({ length: 100 }, (_, i) => pickDestination(mockNoiseMap, 0, i));

      // Check distribution across quadrants
      const leftHalf = destinations.filter((d) => d.x < 960).length;
      const rightHalf = destinations.filter((d) => d.x >= 960).length;
      const topHalf = destinations.filter((d) => d.y < 540).length;
      const bottomHalf = destinations.filter((d) => d.y >= 540).length;

      // Should be roughly evenly distributed (within 30/70 split)
      expect(leftHalf).toBeGreaterThan(30);
      expect(leftHalf).toBeLessThan(70);
      expect(rightHalf).toBeGreaterThan(30);
      expect(rightHalf).toBeLessThan(70);
      expect(topHalf).toBeGreaterThan(30);
      expect(topHalf).toBeLessThan(70);
      expect(bottomHalf).toBeGreaterThan(30);
      expect(bottomHalf).toBeLessThan(70);
    });
  });

  describe('handleRobotIdle — docking guard', () => {
    beforeEach(() => {
      useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE } });
    });

    it.each([DockingState.Docked, DockingState.Docking, DockingState.Departing])(
      'is a no-op for an Idle robot whose docking is %s',
      (docking) => {
        const robot = makeRobot({ state: RobotState.Idle, docking });
        useLocaleStore.setState((s) => ({
          locales: { ...s.locales, [DEFAULT_LOCALE_ID]: { ...s.locales[DEFAULT_LOCALE_ID], robots: [robot] } },
        }));

        handleRobotIdle(DEFAULT_LOCALE_ID, robot.id);

        const after = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
        expect(after).toEqual(robot); // untouched — state, position, destination all unchanged
      }
    );
  });
});
