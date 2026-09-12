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

// Bug fix, found live via browser DevTools (not caught by jsdom, which never resolves real CSS
// cascade/color-mix()): --color-accent/--color-accent-gradient must NOT be declared as a nested
// var()-derivation of --color-accent-a/-b (e.g. `linear-gradient(var(--color-accent-a), ...)`).
// Confirmed empirically: overriding --color-accent-a/-b on a descendant DOES cascade correctly to
// that subtree (verified directly in DevTools' own "Inherited from" breakdown), but a DIFFERENT
// custom property whose OWN specified value nests var() references to them does NOT get
// re-substituted using the local override — it stays pinned to whatever --color-accent-a/-b
// resolved to whenever that outer property was first read. All 4 properties must therefore be
// computed with LITERAL color values baked directly into the color-mix()/linear-gradient() calls,
// at the exact point --color-accent-a/-b are being scoped — never through a second layer of
// custom-property indirection. See docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.2's amendment.
describe('getTraitColorStyle', () => {
  it('returns all 4 accent properties, matching the trait\'s own pair', () => {
    expect(getTraitColorStyle('output')).toEqual({
      '--color-accent-a': ACCENT_COLORS.red,
      '--color-accent-b': ACCENT_COLORS.orange,
      '--color-accent': `color-mix(in srgb, ${ACCENT_COLORS.red} 50%, ${ACCENT_COLORS.orange} 50%)`,
      '--color-accent-gradient': `linear-gradient(135deg, ${ACCENT_COLORS.red}, ${ACCENT_COLORS.orange})`,
    });
  });

  it('returns a correct, distinct style object for every trait', () => {
    for (const trait of TRAIT_IDS) {
      const [a, b] = TRAIT_COLORS[trait];
      expect(getTraitColorStyle(trait)).toEqual({
        '--color-accent-a': a,
        '--color-accent-b': b,
        '--color-accent': `color-mix(in srgb, ${a} 50%, ${b} 50%)`,
        '--color-accent-gradient': `linear-gradient(135deg, ${a}, ${b})`,
      });
    }
  });

  it('never leaves a var() reference inside --color-accent or --color-accent-gradient\'s own value — both must be fully literal', () => {
    for (const trait of TRAIT_IDS) {
      const style = getTraitColorStyle(trait) as Record<string, string>;
      expect(style['--color-accent']).not.toContain('var(');
      expect(style['--color-accent-gradient']).not.toContain('var(');
    }
  });
});

describe('getRobotColorStyle', () => {
  it('sets all 4 accent properties to the same given color (a degenerate solid "gradient")', () => {
    expect(getRobotColorStyle('#abc123')).toEqual({
      '--color-accent-a': '#abc123',
      '--color-accent-b': '#abc123',
      '--color-accent': 'color-mix(in srgb, #abc123 50%, #abc123 50%)',
      '--color-accent-gradient': 'linear-gradient(135deg, #abc123, #abc123)',
    });
  });

  it('works for any hex string, not just a known ACCENT_COLORS value', () => {
    // getRobotColorStyle takes a robot's already-resolved identityColor — it has no reason to
    // validate against ACCENT_COLORS itself (that validation, if any, belongs to whatever produced
    // the color in the first place).
    expect(getRobotColorStyle('#ffffff')).toEqual({
      '--color-accent-a': '#ffffff',
      '--color-accent-b': '#ffffff',
      '--color-accent': 'color-mix(in srgb, #ffffff 50%, #ffffff 50%)',
      '--color-accent-gradient': 'linear-gradient(135deg, #ffffff, #ffffff)',
    });
  });
});
