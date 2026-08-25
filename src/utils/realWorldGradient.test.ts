// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { generateRealWorldGradients, type RandomSource } from './realWorldGradient';
import colorTheme from '@/constants/colorTheme.json';
import { hslToString } from '@/utils/colorUtils';

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

/** Splits on top-level commas only — the color values themselves are now
 *  `hsl(h, s%, l%)` strings, which contain commas of their own that must
 *  not be treated as stop separators. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

/** Parses a `linear-gradient(Xdeg, color1 p1%, color2, ...)` string back into
 *  its angle and ordered stop list — testing the actual CSS string that gets
 *  applied, not an internal representation. Each stop is `<color> <pct>?`;
 *  the trailing `\s+pct%$` anchor is what lets this correctly separate a
 *  stop's own percentage from an hsl() color's internal commas/percents. */
function parseGradient(css: string): { angle: number; stops: ParsedStop[] } {
  const match = /^linear-gradient\((-?[\d.]+)deg,\s*(.+)\)$/.exec(css);
  if (!match) throw new Error(`Could not parse gradient: ${css}`);
  const angle = Number(match[1]);
  const stops = splitTopLevel(match[2]).map((raw) => {
    const trimmed = raw.trim();
    const pctMatch = /^(.*?)\s+(-?[\d.]+%)$/.exec(trimmed);
    if (pctMatch) return { color: pctMatch[1].trim(), pct: Number(pctMatch[2].replace('%', '')) };
    return { color: trimmed, pct: undefined };
  });
  return { angle, stops };
}

// Theme-sourced replacements for the gradient's original hardcoded hex
// colors (App.css's own former values) — same sourcing App.tsx uses.
const NEUTRAL_DARK = hslToString(colorTheme.shadowDepth);
const VENT_SHADOW = hslToString(colorTheme.vent.shadow);
const VENT_BASE = hslToString(colorTheme.vent.base);

// ========================================
// TESTS
// ========================================

describe('generateRealWorldGradients', () => {
  it('keeps the same number of stops as the original CSS — 4 for before, 7 for after', () => {
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
    expect(before.stops.map((s) => s.color)).toEqual(['transparent', NEUTRAL_DARK, VENT_SHADOW, VENT_BASE]);

    const after = parseGradient(generateRealWorldGradients(constantRng(0.37)).after);
    expect(after.stops.map((s) => s.color)).toEqual([
      NEUTRAL_DARK, VENT_BASE, VENT_SHADOW, NEUTRAL_DARK, NEUTRAL_DARK, VENT_BASE, VENT_SHADOW,
    ]);
  });

  it('sources its non-transparent colors from colorTheme.json (the vent family, same as OceanScene\'s own atmospheric gradients) rather than hardcoded hex values', () => {
    const before = parseGradient(generateRealWorldGradients(constantRng(0.1)).before);
    for (const stop of before.stops.slice(1)) {
      expect(stop.color, stop.color).toMatch(/^hsl\(/);
    }
  });

  it('leaves the final stop of each gradient unnumbered, same as the original CSS', () => {
    const { before, after } = generateRealWorldGradients(constantRng(0.5));
    const beforeStops = parseGradient(before).stops;
    const afterStops = parseGradient(after).stops;
    expect(beforeStops[beforeStops.length - 1].pct).toBeUndefined();
    expect(afterStops[afterStops.length - 1].pct).toBeUndefined();
  });

  it('never gives two stops the same (or a visually-indistinguishable) percentage — no hard color edges, only real blends', () => {
    // A constant rng is the adversarial case: every draw starts from the
    // same raw value, so if there's any bug that lets stops land close
    // together, this is where it'd show up.
    for (const v of [0, 0.1, 0.37, 0.5, 0.75, 0.9999]) {
      const { before, after } = generateRealWorldGradients(constantRng(v));
      for (const gradient of [before, after]) {
        const pcts = parseGradient(gradient).stops.map((s) => s.pct).filter((p): p is number => p !== undefined);
        for (let j = 1; j < pcts.length; j++) {
          expect(pcts[j] - pcts[j - 1], `stops ${j - 1} and ${j} (rng=${v})`).toBeGreaterThan(1);
        }
      }
    }
  });

  it('produces a strictly ascending sequence of percentages, never a broken/reversed gradient', () => {
    let i = 0;
    const sequence = [0.1, 0.9, 0.4, 0.6, 0.2, 0.8, 0.5, 0.3, 0.7, 0.05, 0.95, 0.45];
    const rng: RandomSource = () => sequence[i++ % sequence.length];

    const { before, after } = generateRealWorldGradients(rng);
    for (const gradient of [before, after]) {
      const pcts = parseGradient(gradient).stops.map((s) => s.pct).filter((p): p is number => p !== undefined);
      for (let j = 1; j < pcts.length; j++) {
        expect(pcts[j], `stop ${j} should be > stop ${j - 1}`).toBeGreaterThan(pcts[j - 1]);
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
