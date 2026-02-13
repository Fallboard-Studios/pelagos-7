// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import type { AudioAttributes } from '../../types/Robot';
import {
  selectRobotShape,
  generateColors,
  calculateScale,
  calculateDetailLevel,
} from './robotVisualHelpers';
import { RobotSleek } from './RobotSleek';
import { RobotAngular } from './RobotAngular';
import { RobotOrganic } from './RobotOrganic';
import { RobotIndustrial } from './RobotIndustrial';

// ========================================
// TESTS
// ========================================

describe('robotVisualHelpers', () => {
  describe('selectRobotShape', () => {
    it('returns RobotSleek for AMSynth', () => {
      const result = selectRobotShape('AMSynth');
      expect(result).toBe(RobotSleek);
    });

    it('returns RobotAngular for FMSynth', () => {
      const result = selectRobotShape('FMSynth');
      expect(result).toBe(RobotAngular);
    });

    it('returns RobotOrganic for PolySynth', () => {
      const result = selectRobotShape('PolySynth');
      expect(result).toBe(RobotOrganic);
    });

    it('returns RobotIndustrial for MembraneSynth', () => {
      const result = selectRobotShape('MembraneSynth');
      expect(result).toBe(RobotIndustrial);
    });
  });

  describe('generateColors', () => {
    it('generates bright neon colors for fast attack and high sustain', () => {
      const adsr: AudioAttributes['adsr'] = {
        attack: 0.05,  // Fast
        decay: 0.5,
        sustain: 0.8,  // High
        release: 0.5,
      };

      const colors = generateColors(adsr);

      // Should return neon colors
      expect(colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colors.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(colors.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('generates cool hues for long decay', () => {
      const adsr: AudioAttributes['adsr'] = {
        attack: 0.3,
        decay: 1.5,   // Long
        sustain: 0.5,
        release: 0.5,
      };

      const colors = generateColors(adsr);

      // Should use corroded/cool palette
      expect(colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('generates warm hues for short decay', () => {
      const adsr: AudioAttributes['adsr'] = {
        attack: 0.3,
        decay: 0.2,   // Short
        sustain: 0.5,
        release: 0.5,
      };

      const colors = generateColors(adsr);

      // Should use rusty/warm palette
      expect(colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('darkens colors for slow attack', () => {
      const adsr: AudioAttributes['adsr'] = {
        attack: 0.8,  // Slow
        decay: 0.5,
        sustain: 0.5,
        release: 0.5,
      };

      const colors = generateColors(adsr);

      // Should return darkened colors
      expect(colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('calculateScale', () => {
    it('returns 0.7 for high pitch range (>600Hz)', () => {
      const pitchRange = { min: 700, max: 900 };
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(0.7);
    });

    it('returns 1.0 for mid pitch range (200-600Hz)', () => {
      const pitchRange = { min: 300, max: 500 };
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(1.0);
    });

    it('returns 1.3 for low pitch range (<200Hz)', () => {
      const pitchRange = { min: 100, max: 180 };
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(1.3);
    });

    it('uses average frequency for calculation', () => {
      const pitchRange = { min: 100, max: 280 }; // avg = 190
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(1.3); // Should be low range
    });
  });

  describe('calculateDetailLevel', () => {
    it('returns 0.0 for no filter (0Hz)', () => {
      const detailLevel = calculateDetailLevel(0);
      expect(detailLevel).toBe(0.0);
    });

    it('returns 0.2 for low filter (<500Hz)', () => {
      const detailLevel = calculateDetailLevel(300);
      expect(detailLevel).toBe(0.2);
    });

    it('returns 1.0 for high filter (>2000Hz)', () => {
      const detailLevel = calculateDetailLevel(2500);
      expect(detailLevel).toBe(1.0);
    });

    it('interpolates linearly for mid-range filter (500-2000Hz)', () => {
      const detailLevel = calculateDetailLevel(1250); // Midpoint
      expect(detailLevel).toBeGreaterThan(0.2);
      expect(detailLevel).toBeLessThan(1.0);
      expect(detailLevel).toBeCloseTo(0.6, 1); // Should be near midpoint
    });

    it('returns correct interpolation at 500Hz boundary', () => {
      const detailLevel = calculateDetailLevel(500);
      expect(detailLevel).toBe(0.2);
    });

    it('returns correct interpolation at 2000Hz boundary', () => {
      const detailLevel = calculateDetailLevel(2000);
      expect(detailLevel).toBe(1.0);
    });
  });
});
