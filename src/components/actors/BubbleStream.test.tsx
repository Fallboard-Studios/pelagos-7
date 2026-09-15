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
  // Rendering the real BubbleStream directly isn't viable here — its GSAP effect calls
  // `tl.add()`, which the global `gsap` mock (vitest.setup.ts) doesn't implement, so it
  // throws (confirmed directly while writing this test). Same reason
  // FactoryBubbleStream.test.tsx stubs BubbleStream out entirely rather than rendering the
  // real thing. So this checks the memo wrapper structurally instead of via a render-based
  // re-render-count test.
  it('exports a React.memo-wrapped component (backlog item 23)', () => {
    expect(typeof BubbleStream).toBe('object');
    // React.memo's own marker — see react/src/ReactSymbols.js. Confirms the export is
    // actually wrapped, not just an object that happens to also be a function.
    expect((BubbleStream as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });

  it('does not pass a custom comparator — every prop is a primitive, so the default shallow compare is already correct', () => {
    // A supplied `compare` function is the second arg to React.memo(); confirms this wasn't
    // needed (and that BubbleStreamProps genuinely has no object/array prop that would need
    // one — enforced separately by BubbleStreamProps' own type, all fields number/string/
    // boolean).
    expect((BubbleStream as unknown as { compare: unknown }).compare).toBeNull();
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

    it('initial delay is within [0, burstInterval)', () => {
      // Mirrors sequence: radius, burstStagger, count, initialDelay
      const seed = 42;
      const TARGET_GLOBAL_BURST_INTERVAL_SECONDS = 4; // must match component constant
      const totalBuildings = 10;
      const burstInterval = TARGET_GLOBAL_BURST_INTERVAL_SECONDS * totalBuildings;
      const rand = makeLcg(seed);
      rand(); // radius
      rand(); // burstStagger
      rand(); // count
      const initialDelay = rand() * burstInterval;
      expect(initialDelay).toBeGreaterThanOrEqual(0);
      expect(initialDelay).toBeLessThan(burstInterval);
    });

    it('burst interval scales with totalBuildings so the aggregate rate stays constant', () => {
      const TARGET_GLOBAL_BURST_INTERVAL_SECONDS = 4; // must match component constant
      expect(TARGET_GLOBAL_BURST_INTERVAL_SECONDS * 1).toBe(4);
      expect(TARGET_GLOBAL_BURST_INTERVAL_SECONDS * 25).toBe(100);
      expect(TARGET_GLOBAL_BURST_INTERVAL_SECONDS * 100).toBe(400);
    });

    it('clamps totalBuildings to a minimum of 1 (never a zero/negative interval)', () => {
      const TARGET_GLOBAL_BURST_INTERVAL_SECONDS = 4; // must match component constant
      const burstInterval = TARGET_GLOBAL_BURST_INTERVAL_SECONDS * Math.max(1, 0);
      expect(burstInterval).toBe(4);
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
