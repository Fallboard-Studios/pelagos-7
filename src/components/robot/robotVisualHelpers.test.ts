// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import {
  selectRobotShape,
  calculateScale,
  calculateDetailLevel,
  generateColors,
  hueOffset,
  toSaturation,
  toLuminance,
} from './robotVisualHelpers';
import { RobotSleek } from './RobotSleek';
import { RobotAngular } from './RobotAngular';
import { RobotOrganic } from './RobotOrganic';
import { RobotIndustrial } from './RobotIndustrial';
import type { AudioAttributes } from '../../types/Robot';

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

  describe('generateColors (new HSL mapping)', () => {
    it('returns HSL strings for primary/secondary/accent', () => {
      const attrs = {
        synthType: 'AMSynth',
        adsr: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.5 },
        pitchRange: { min: 200, max: 800 },
        filterFreq: 1000,
      } as unknown as AudioAttributes;

      const colors = generateColors(attrs);
      const hslRegex = /^hsl\(\d+,\s*\d+%\,\s*\d+%\)$/;
      expect(hslRegex.test(colors.primary)).toBe(true);
      expect(hslRegex.test(colors.secondary)).toBe(true);
      expect(hslRegex.test(colors.accent)).toBe(true);
    });

    it('varies primary hue by synthType', () => {
      const base = {
        adsr: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.2 },
        pitchRange: { min: 200, max: 800 },
        filterFreq: 800,
      } as unknown as Omit<AudioAttributes, 'synthType'>;

      const a = generateColors({ ...base, synthType: 'AMSynth' } as AudioAttributes);
      const b = generateColors({ ...base, synthType: 'FMSynth' } as AudioAttributes);
      expect(a.primary).not.toEqual(b.primary);
    });
  });

  describe('color helpers', () => {
    it('hueOffset returns a finite number and varies with ADSR', () => {
      const a: AudioAttributes['adsr'] = { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.2 };
      const b: AudioAttributes['adsr'] = { attack: 0.5, decay: 1.5, sustain: 0.2, release: 1.0 };

      const ha = hueOffset(a);
      const hb = hueOffset(b);

      expect(Number.isFinite(ha)).toBe(true);
      expect(Number.isFinite(hb)).toBe(true);
      expect(ha).not.toEqual(hb);
    });

    it('toSaturation: faster attack -> higher saturation', () => {
      const fast = toSaturation(0.01);
      const slow = toSaturation(0.7);
      expect(fast).toBeGreaterThan(slow);
    });

    it('toLuminance: higher sustain -> higher luminance', () => {
      const low = toLuminance(0.0);
      const high = toLuminance(1.0);
      expect(high).toBeGreaterThan(low);
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
  });
});
