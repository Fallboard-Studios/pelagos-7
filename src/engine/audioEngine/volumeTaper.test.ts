import { describe, it, expect } from 'vitest';
import { volumePositionToGain, VOLUME_TAPER_DB_RANGE } from './volumeTaper';

describe('volumePositionToGain', () => {
  it('position 0 is true silence (a hard floor, matching AudioEngine\'s mute-at-0 guarantee)', () => {
    expect(volumePositionToGain(0)).toBe(0);
  });

  it('a negative position is treated the same as 0 (defensive floor)', () => {
    expect(volumePositionToGain(-0.5)).toBe(0);
  });

  it('position 1 is exactly unity gain (0dB, full volume)', () => {
    expect(volumePositionToGain(1)).toBe(1);
  });

  it('a position above 1 is treated the same as 1 (defensive ceiling)', () => {
    expect(volumePositionToGain(1.5)).toBe(1);
  });

  it('is monotonically increasing across the whole range — no dead zones, no reversals', () => {
    const positions = Array.from({ length: 101 }, (_, i) => i / 100);
    const gains = positions.map((p) => volumePositionToGain(p));
    for (let i = 1; i < gains.length; i++) {
      expect(gains[i]).toBeGreaterThan(gains[i - 1]);
    }
  });

  it('the midpoint is meaningfully quieter than full — the whole point of this fix, unlike a flat linear mapping', () => {
    // A plain linear mapping would give exactly 0.5 here (only a ~6dB drop, barely perceptible).
    // The perceptual taper should land well below that.
    const midGain = volumePositionToGain(0.5);
    expect(midGain).toBeLessThan(0.2);
    expect(midGain).toBeGreaterThan(0);
  });

  it('matches the documented dB-per-position formula for an arbitrary interior point', () => {
    const position = 0.75;
    const expectedDb = (position - 1) * VOLUME_TAPER_DB_RANGE;
    const expectedGain = 10 ** (expectedDb / 20);
    expect(volumePositionToGain(position)).toBeCloseTo(expectedGain, 10);
  });

  it('a custom dbRange is honored', () => {
    // A narrower range should taper less aggressively at the same position.
    const narrow = volumePositionToGain(0.5, 20);
    const wide = volumePositionToGain(0.5, 60);
    expect(narrow).toBeGreaterThan(wide);
  });
});
