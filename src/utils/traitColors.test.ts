import { describe, it, expect } from 'vitest';
import { TRAIT_COLORS, getTraitColorStyle, getRobotColorStyle } from './traitColors';
import { ACCENT_COLORS } from '@/constants/accentColors';
import { TRAIT_IDS } from '@/types/traits';

describe('TRAIT_COLORS', () => {
  it('has exactly one entry per TRAIT_IDS member', () => {
    expect(Object.keys(TRAIT_COLORS).sort()).toEqual([...TRAIT_IDS].sort());
  });

  it('matches the confirmed pairs exactly', () => {
    expect(TRAIT_COLORS.spectral).toEqual([ACCENT_COLORS.cyan, ACCENT_COLORS.teal]);
    expect(TRAIT_COLORS.timeSpace).toEqual([ACCENT_COLORS.blue, ACCENT_COLORS.plum]);
    expect(TRAIT_COLORS.output).toEqual([ACCENT_COLORS.red, ACCENT_COLORS.orange]);
    expect(TRAIT_COLORS.composition).toEqual([ACCENT_COLORS.green, ACCENT_COLORS.lime]);
    expect(TRAIT_COLORS.company).toEqual([ACCENT_COLORS.purple, ACCENT_COLORS.pink]);
    expect(TRAIT_COLORS.seed).toEqual([ACCENT_COLORS.tangerine, ACCENT_COLORS.yellow]);
    expect(TRAIT_COLORS.header).toEqual([ACCENT_COLORS.white, ACCENT_COLORS.darkGray]);
  });

  it('every pair is 2 distinct colors, never a trait paired with itself', () => {
    for (const trait of TRAIT_IDS) {
      const [a, b] = TRAIT_COLORS[trait];
      expect(a).not.toBe(b);
    }
  });

  it('never uses the reserved beige swatch in any pair', () => {
    for (const trait of TRAIT_IDS) {
      expect(TRAIT_COLORS[trait]).not.toContain(ACCENT_COLORS.beige);
    }
  });
});

describe('getTraitColorStyle', () => {
  it('returns --color-accent-a/-b matching the trait\'s own pair', () => {
    expect(getTraitColorStyle('output')).toEqual({
      '--color-accent-a': ACCENT_COLORS.red,
      '--color-accent-b': ACCENT_COLORS.orange,
    });
  });

  it('returns a correct, distinct style object for every trait', () => {
    for (const trait of TRAIT_IDS) {
      const [a, b] = TRAIT_COLORS[trait];
      expect(getTraitColorStyle(trait)).toEqual({ '--color-accent-a': a, '--color-accent-b': b });
    }
  });
});

describe('getRobotColorStyle', () => {
  it('sets both --color-accent-a and -b to the same given color', () => {
    expect(getRobotColorStyle('#abc123')).toEqual({
      '--color-accent-a': '#abc123',
      '--color-accent-b': '#abc123',
    });
  });

  it('works for any hex string, not just a known ACCENT_COLORS value', () => {
    // getRobotColorStyle takes a robot's already-resolved identityColor — it has no reason to
    // validate against ACCENT_COLORS itself (that validation, if any, belongs to whatever produced
    // the color in the first place).
    expect(getRobotColorStyle('#ffffff')).toEqual({
      '--color-accent-a': '#ffffff',
      '--color-accent-b': '#ffffff',
    });
  });
});
