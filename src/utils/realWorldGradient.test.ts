// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { generateRealWorldGradients, type RandomSource } from './realWorldGradient';

// ========================================
// TEST HELPERS
// ========================================

/** A fake RandomSource that always returns the same value — makes every
 *  match/diverge coin-flip and every percentage draw fully predictable. */
function constantRng(value: number): RandomSource {
  return () => value;
}

interface ParsedStop {
  color: string;
  /** undefined for the final, deliberately-unnumbered stop. */
  pct: number | undefined;
}

/** Parses a `linear-gradient(Xdeg, color1 p1%, color2, ...)` string back into
 *  its angle and ordered stop list — testing the actual CSS string that gets
 *  applied, not an internal representation. */
function parseGradient(css: string): { angle: number; stops: ParsedStop[] } {
  const match = /^linear-gradient\((-?[\d.]+)deg,\s*(.+)\)$/.exec(css);
  if (!match) throw new Error(`Could not parse gradient: ${css}`);
  const angle = Number(match[1]);
  const stops = match[2].split(',').map((raw) => {
    const parts = raw.trim().split(/\s+/);
    if (parts.length === 2) return { color: parts[0], pct: Number(parts[1].replace('%', '')) };
    return { color: parts[0], pct: undefined };
  });
  return { angle, stops };
}

// ========================================
// TESTS
// ========================================

describe('generateRealWorldGradients', () => {
  it('keeps the same number of stops as the original CSS — 4 for before, 7 for after — regardless of match/diverge choices', () => {
    const { before, after } = generateRealWorldGradients(constantRng(0));
    expect(parseGradient(before).stops).toHaveLength(4);
    expect(parseGradient(after).stops).toHaveLength(7);
  });

  it('never turns the transparent stop into a color', () => {
    const zero = parseGradient(generateRealWorldGradients(constantRng(0)).before);
    const one = parseGradient(generateRealWorldGradients(constantRng(0.9999)).before);
    expect(zero.stops[0].color).toBe('transparent');
    expect(one.stops[0].color).toBe('transparent');
  });

  it('keeps every color in its original relative order — colors are never shuffled, only angle/percentages change', () => {
    const before = parseGradient(generateRealWorldGradients(constantRng(0.37)).before);
    expect(before.stops.map((s) => s.color)).toEqual(['transparent', '#1e1e1e', '#083a70', '#1d5da1']);

    const after = parseGradient(generateRealWorldGradients(constantRng(0.37)).after);
    expect(after.stops.map((s) => s.color)).toEqual([
      '#1e1e1e', '#1d5da1', '#083a70', '#1e1e1e', '#1e1e1e', '#1d5da1', '#083a70',
    ]);
  });

  it('leaves the final stop of each gradient unnumbered, same as the original CSS', () => {
    const { before, after } = generateRealWorldGradients(constantRng(0.5));
    const beforeStops = parseGradient(before).stops;
    const afterStops = parseGradient(after).stops;
    expect(beforeStops[beforeStops.length - 1].pct).toBeUndefined();
    expect(afterStops[afterStops.length - 1].pct).toBeUndefined();
  });

  it('keeps a matching pair matching (equal percentages) when the coin flip stays below the threshold', () => {
    // rng() always returns 0 — every "diverge?" check (rng() >= 0.5) is false.
    const { before, after } = generateRealWorldGradients(constantRng(0));
    const beforeStops = parseGradient(before).stops;
    expect(beforeStops[1].pct).toBe(beforeStops[2].pct); // #1e1e1e / #083a70 pair

    const afterStops = parseGradient(after).stops;
    expect(afterStops[0].pct).toBe(afterStops[1].pct); // #1e1e1e / #1d5da1 pair
    expect(afterStops[2].pct).toBe(afterStops[3].pct); // #083a70 / #1e1e1e pair
    expect(afterStops[4].pct).toBe(afterStops[5].pct); // #1e1e1e / #1d5da1 pair
  });

  it('lets a matching pair diverge into two distinct, ascending percentages when the coin flip clears the threshold', () => {
    // A constant rng can't produce two genuinely different draws by
    // definition — use a short varying sequence instead: angle (unused
    // here), a >= 0.5 diverge decision, then three spread-out percent draws.
    const sequence = [0.5, 0.6, 0.1, 0.5, 0.9];
    let i = 0;
    const rng: RandomSource = () => sequence[i++];

    const { before } = generateRealWorldGradients(rng);
    const beforeStops = parseGradient(before).stops;
    expect(beforeStops[1].pct).toBeLessThan(beforeStops[2].pct!);
  });

  it('produces a monotonically non-decreasing sequence of percentages, never a broken/reversed gradient', () => {
    // A varied, non-constant rng — mixes matching and diverging outcomes.
    let i = 0;
    const sequence = [0.1, 0.9, 0.4, 0.6, 0.2, 0.8, 0.5, 0.3, 0.7, 0.05, 0.95, 0.45];
    const rng: RandomSource = () => sequence[i++ % sequence.length];

    const { before, after } = generateRealWorldGradients(rng);
    for (const gradient of [before, after]) {
      const pcts = parseGradient(gradient).stops.map((s) => s.pct).filter((p): p is number => p !== undefined);
      for (let j = 1; j < pcts.length; j++) {
        expect(pcts[j], `stop ${j} should be >= stop ${j - 1}`).toBeGreaterThanOrEqual(pcts[j - 1]);
      }
    }
  });

  it('draws the angle from the rng — different rng sequences produce different angles', () => {
    const a = generateRealWorldGradients(constantRng(0));
    const b = generateRealWorldGradients(constantRng(0.5));
    expect(parseGradient(a.before).angle).not.toBe(parseGradient(b.before).angle);
  });

  it('keeps every angle within [0, 360)', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 0.999]) {
      const { before, after } = generateRealWorldGradients(constantRng(v));
      expect(parseGradient(before).angle).toBeGreaterThanOrEqual(0);
      expect(parseGradient(before).angle).toBeLessThan(360);
      expect(parseGradient(after).angle).toBeGreaterThanOrEqual(0);
      expect(parseGradient(after).angle).toBeLessThan(360);
    }
  });

  it('defaults to Math.random when no source is supplied, and never throws', () => {
    expect(() => generateRealWorldGradients()).not.toThrow();
    const { before, after } = generateRealWorldGradients();
    expect(before).toMatch(/^linear-gradient\(/);
    expect(after).toMatch(/^linear-gradient\(/);
  });
});
