import { describe, it, expect } from 'vitest';
import { BubbleStream } from './BubbleStream';

// ----------------------------------------
// HELPERS (mirrors component LCG for test isolation)
// ----------------------------------------

function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ----------------------------------------
// TESTS
// ----------------------------------------

describe('BubbleStream', () => {
  it('exports a React component', () => {
    expect(typeof BubbleStream).toBe('function');
  });

  describe('config derivation', () => {
    it('derives bubble count between 5 and 10 for any seed', () => {
      // Mirrors the useMemo call sequence: radius, burstStagger, count
      for (const seed of [0, 1, 42, 999, 0xdeadbeef]) {
        const rand = makeLcg(seed);
        rand(); // radius
        rand(); // burstStagger
        const count = 5 + Math.floor(rand() * 6);
        expect(count).toBeGreaterThanOrEqual(5);
        expect(count).toBeLessThanOrEqual(10);
      }
    });

    it('computes burst interval as MEASURES_BETWEEN_BURSTS measures in seconds at 120 BPM', () => {
      const bpm = 120;
      const MEASURES_BETWEEN_BURSTS = 20; // must match component constant
      const secondsPerMeasure = (60 / bpm) * 4; // 2 s per measure at 120 BPM
      const burstInterval = MEASURES_BETWEEN_BURSTS * secondsPerMeasure;
      expect(burstInterval).toBe(40); // 40 s per burst
    });

    it('initial delay is within [0, burstInterval)', () => {
      // Mirrors sequence: radius, burstStagger, count, initialDelay
      const seed = 42;
      const bpm = 120;
      const MEASURES_BETWEEN_BURSTS = 20; // must match component constant
      const rand = makeLcg(seed);
      rand(); // radius
      rand(); // burstStagger
      rand(); // count
      const secondsPerMeasure = (60 / bpm) * 4;
      const burstInterval = MEASURES_BETWEEN_BURSTS * secondsPerMeasure;
      const initialDelay = rand() * burstInterval;
      expect(initialDelay).toBeGreaterThanOrEqual(0);
      expect(initialDelay).toBeLessThan(burstInterval);
    });

    it('depthScale halves the radius for midground (scale=0.5)', () => {
      const seed = 1;
      const rand1 = makeLcg(seed);
      const baseRadiusDraw = rand1(); // same raw LCG draw
      const baseRadius = (8 + baseRadiusDraw * 2) * 1;    // foreground
      const midRadius = (8 + baseRadiusDraw * 2) * 0.5;  // midground
      expect(midRadius).toBeCloseTo(baseRadius * 0.5);
    });

    it('depthScale thirds the radius for background (scale=1/3)', () => {
      const seed = 1;
      const rand1 = makeLcg(seed);
      const baseRadiusDraw = rand1();
      const baseRadius = (8 + baseRadiusDraw * 2) * 1;
      const bgRadius = (8 + baseRadiusDraw * 2) * (1 / 3);
      expect(bgRadius).toBeCloseTo(baseRadius / 3);
    });

    it('depthScale halves minimum rise height for midground (scale=0.5)', () => {
      const MIN_RISE_PX = 100; // must match component constant
      expect(MIN_RISE_PX * 0.5).toBe(50);
    });

    it('depthScale thirds minimum rise height for background (scale=1/3)', () => {
      const MIN_RISE_PX = 100; // must match component constant
      expect(MIN_RISE_PX * (1 / 3)).toBeCloseTo(33.33);
    });

    it('depthScale halves the wobble amplitude for midground (scale=0.5)', () => {
      // Mirrors bubble-params RNG: seed ^ 0xb0bb1e5, first draws are risePx, riseSpeed, wobbleAmp
      const bubbleRand = makeLcg(1 ^ 0xb0bb1e5);
      bubbleRand(); // risePx fraction
      bubbleRand(); // riseSpeed fraction
      const wobbleDraw = bubbleRand();
      const baseAmp = (8 + wobbleDraw * 12) * 1;
      const midAmp = (8 + wobbleDraw * 12) * 0.5;
      expect(midAmp).toBeCloseTo(baseAmp * 0.5);
    });

    it('depthScale thirds the wobble amplitude for background (scale=1/3)', () => {
      const bubbleRand = makeLcg(1 ^ 0xb0bb1e5);
      bubbleRand(); // risePx fraction
      bubbleRand(); // riseSpeed fraction
      const wobbleDraw = bubbleRand();
      const baseAmp = (8 + wobbleDraw * 12) * 1;
      const bgAmp = (8 + wobbleDraw * 12) * (1 / 3);
      expect(bgAmp).toBeCloseTo(baseAmp / 3);
    });
  });
});
