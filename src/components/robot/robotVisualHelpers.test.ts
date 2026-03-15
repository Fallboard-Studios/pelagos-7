// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

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

    it('returns RobotIndustrial for DuoSynth', () => {
      const result = selectRobotShape('DuoSynth');
      expect(result).toBe(RobotIndustrial);
    });
  });

  describe('generateColors', () => {
    it('generates neon colors for fast attack and short decay', () => {
      const adsr = { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.5 };
      const colors = generateColors(adsr);
      expect(colors.primary).toBe('hsl(120, 100%, 50%)');
      expect(colors.secondary).toBe('hsl(180, 100%, 50%)');
      expect(colors.accent).toBe('hsl(300, 100%, 50%)');
    });

    it('generates corroded colors for slow attack and long decay', () => {
      const adsr = { attack: 0.6, decay: 1.5, sustain: 0.8, release: 1.0 };
      const colors = generateColors(adsr);
      expect(colors.primary).toBe('hsl(120, 12%, 18%)');
      expect(colors.secondary).toBe('hsl(90, 18%, 28%)');
      expect(colors.accent).toBe('hsl(75, 25%, 35%)');
    });

    it('generates rusty colors for fast attack with longer decay', () => {
      const adsr = { attack: 0.08, decay: 0.5, sustain: 0.6, release: 0.7 };
      const colors = generateColors(adsr);
      expect(colors.primary).toBe('hsl(30, 65%, 30%)');
      expect(colors.secondary).toBe('hsl(20, 45%, 35%)');
      expect(colors.accent).toBe('hsl(30, 55%, 50%)');
    });

    it('generates industrial colors for mid-range ADSR', () => {
      const adsr = { attack: 0.3, decay: 0.4, sustain: 0.5, release: 0.6 };
      const colors = generateColors(adsr);
      expect(colors.primary).toBe('hsl(0, 0%, 41%)');
      expect(colors.secondary).toBe('hsl(0, 0%, 50%)');
      expect(colors.accent).toBe('hsl(0, 0%, 66%)');
    });
  });

  describe('calculateScale', () => {
    it('returns 0.7 for high pitch range', () => {
      const pitchRange = { min: 700, max: 900 };
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(0.7);
    });

    it('returns 1.0 for mid pitch range', () => {
      const pitchRange = { min: 250, max: 450 };
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(1.0);
    });

    it('returns 1.3 for low pitch range', () => {
      const pitchRange = { min: 80, max: 150 };
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(1.3);
    });

    it('returns 1.0 for exact mid-range threshold', () => {
      const pitchRange = { min: 300, max: 500 };
      const scale = calculateScale(pitchRange);
      expect(scale).toBe(1.0);
    });
  });

  describe('calculateDetailLevel', () => {
    it('returns 0.0 for filter frequency at or below low threshold', () => {
      expect(calculateDetailLevel(400)).toBe(0.0);
      expect(calculateDetailLevel(500)).toBe(0.0);
    });

    it('returns 1.0 for filter frequency at or above high threshold', () => {
      expect(calculateDetailLevel(2000)).toBe(1.0);
      expect(calculateDetailLevel(3000)).toBe(1.0);
    });

    it('returns 0.5 for filter frequency at midpoint', () => {
      const midpoint = (500 + 2000) / 2; // 1250 Hz
      expect(calculateDetailLevel(midpoint)).toBe(0.5);
    });

    it('returns correct interpolation for 1000 Hz', () => {
      // 1000 is 500 units above 500 threshold
      // Range is 1500 (2000 - 500)
      // So 500/1500 = 0.333...
      const expected = (1000 - 500) / (2000 - 500);
      expect(calculateDetailLevel(1000)).toBeCloseTo(expected, 5);
    });

    it('returns correct interpolation for 1500 Hz', () => {
      // 1500 is 1000 units above 500 threshold
      // Range is 1500 (2000 - 500)
      // So 1000/1500 = 0.666...
      const expected = (1500 - 500) / (2000 - 500);
      expect(calculateDetailLevel(1500)).toBeCloseTo(expected, 5);
    });

    it('handles boundary values correctly', () => {
      expect(calculateDetailLevel(0)).toBe(0.0);
      expect(calculateDetailLevel(499)).toBe(0.0);
      expect(calculateDetailLevel(501)).toBeCloseTo(0.000666, 5);
      expect(calculateDetailLevel(1999)).toBeCloseTo(0.999333, 5);
    });
  });
});
