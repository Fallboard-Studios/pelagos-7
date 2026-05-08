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
  calculateGreebleCount,
} from './robotVisualHelpers';
import { RobotSleek } from './RobotSleek';
import type { AudioAttributes, ADSREnvelope } from '../../types/Robot';

describe('robotVisualHelpers', () => {
  describe('selectRobotShape', () => {
    it('returns a default RobotSleek for sine waveform', () => {
      const result = selectRobotShape('sine' as const);
      expect(result).toBe(RobotSleek);
    });
  });

  describe('generateColors (new HSL mapping)', () => {
    it('returns HSL strings for primary/secondary/accent', () => {
      const attrs = {
        adsr: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.5 },
        pitchRange: { min: 200, max: 800 },
        filterFreq: 1000,
        waveform: 'sine',
      } as unknown as AudioAttributes;

      const colors = generateColors(attrs);
      const hslRegex = /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/;
      expect(hslRegex.test(colors.primary)).toBe(true);
      expect(hslRegex.test(colors.secondary)).toBe(true);
      expect(hslRegex.test(colors.accent)).toBe(true);
    });

    it('varies primary hue by waveform', () => {
      const base = {
        adsr: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.2 },
        pitchRange: { min: 200, max: 800 },
        filterFreq: 800,
      } as unknown as Omit<AudioAttributes, 'waveform'>;

      // generateColors now varies primarily by ADSR; ensure different ADSR yields different primary hues
      const a = generateColors({ ...base, waveform: 'sine', adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2 } } as AudioAttributes);
      const b = generateColors({ ...base, waveform: 'sine', adsr: { attack: 0.5, decay: 1.0, sustain: 0.1, release: 1.0 } } as AudioAttributes);
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

    it('calculateGreebleCount: deterministic, integer, and capped at 16', () => {
      const waveform = 'sawtooth' as const;
      const adsr1: ADSREnvelope = { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.2 };
      const adsr2: ADSREnvelope = { attack: 0.5, decay: 1.0, sustain: 0.1, release: 1.0 };

      const c1 = calculateGreebleCount(2200, 1.0, waveform, adsr1);
      const c2 = calculateGreebleCount(200, 0.0, waveform, adsr2);

      expect(Number.isInteger(c1)).toBe(true);
      expect(Number.isInteger(c2)).toBe(true);
      expect(c1).toBeGreaterThanOrEqual(0);
      expect(c1).toBeLessThanOrEqual(16);
      expect(c2).toBeGreaterThanOrEqual(0);
      expect(c2).toBeLessThanOrEqual(16);
      // different inputs should often produce different results
      expect(c1).not.toEqual(c2);
    });
  });

  describe('calculateScale', () => {
    it('returns 0.7 for treble register', () => {
      expect(calculateScale([3, 5])).toBe(0.7);
    });

    it('returns 1.0 for mid register', () => {
      expect(calculateScale([2, 4])).toBe(1.0);
    });

    it('returns 1.3 for bass register', () => {
      expect(calculateScale([1, 3])).toBe(1.3);
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
