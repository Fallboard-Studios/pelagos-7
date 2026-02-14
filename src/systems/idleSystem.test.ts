// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { pickDestination } from './idleSystem';

// ========================================
// TESTS
// ========================================

describe('idleSystem', () => {
  describe('pickDestination', () => {
    it('generates destination within world bounds', () => {
      const destination = pickDestination();
      expect(destination.x).toBeGreaterThanOrEqual(0);
      expect(destination.x).toBeLessThanOrEqual(1920);
      expect(destination.y).toBeGreaterThanOrEqual(0);
      expect(destination.y).toBeLessThanOrEqual(1080);
    });

    it('generates destination with margin from edges', () => {
      const WORLD_MARGIN = 100;
      const destination = pickDestination();

      // Should be at least WORLD_MARGIN from edges
      expect(destination.x).toBeGreaterThanOrEqual(WORLD_MARGIN);
      expect(destination.x).toBeLessThanOrEqual(1920 - WORLD_MARGIN);
      expect(destination.y).toBeGreaterThanOrEqual(WORLD_MARGIN);
      expect(destination.y).toBeLessThanOrEqual(1080 - WORLD_MARGIN);
    });

    it('generates varied destinations (not all the same)', () => {
      const destinations = Array.from({ length: 20 }, () => pickDestination());
      const uniqueX = new Set(destinations.map((d) => Math.round(d.x)));
      const uniqueY = new Set(destinations.map((d) => Math.round(d.y)));

      // Should have variety
      expect(uniqueX.size).toBeGreaterThan(10);
      expect(uniqueY.size).toBeGreaterThan(10);
    });

    it('generates destinations in center area (not just edges)', () => {
      const destinations = Array.from({ length: 100 }, () => pickDestination());

      // At least some should be in center region (away from all edges)
      const centerRegion = destinations.filter(
        (d) =>
          d.x > 500 &&
          d.x < 1420 &&
          d.y > 300 &&
          d.y < 780
      );

      expect(centerRegion.length).toBeGreaterThan(20); // Should have good distribution
    });

    it('uses full available space (not clustered)', () => {
      const destinations = Array.from({ length: 100 }, () => pickDestination());

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
});
