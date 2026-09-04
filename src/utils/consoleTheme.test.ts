import { describe, it, expect, afterEach } from 'vitest';

import {
  computeConsoleTheme,
  consoleThemeToCSSProperties,
  BG_SATURATION_RANGE,
  BG_LIGHTNESS_RANGE,
  SURFACE_LIGHTNESS_OFFSET,
  SURFACE_LIGHTNESS_MAX,
  ACCENT_SATURATION_RANGE,
  ACCENT_LIGHTNESS_RANGE,
  BORDER_SATURATION_RANGE,
  BORDER_LIGHTNESS_RANGE,
} from './consoleTheme';
import { hslToRgb, contrastRatio, blendOverBackground, type RGB } from './contrastRatio';
import { evictAttenuationStyleNoiseMap, evictLocaleNoiseMap } from './noiseMaps';

// ========================================
// HELPERS
// ========================================

/** Parses the exact `hsl(H S% L%)` format consoleTheme.ts's own `hsl()` helper emits. */
function parseHsl(value: string): { h: number; s: number; l: number } {
  const match = /^hsl\((\d+) (\d+)% (\d+)%\)$/.exec(value);
  if (!match) throw new Error(`Not a valid consoleTheme hsl() string: ${value}`);
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

const SAMPLE_COUNT = 50;
const asTestId = (i: number) => `theme-test-as-${i}`;
const localeTestId = (i: number) => `theme-test-locale-${i}`;

// Fixed 87%/60% alphas of --color-text-primary/--color-text-muted
// (src/index.css) — never seed-driven, per docs/specs/CONSOLE_THEMING.md §3.
const WHITE: RGB = [255, 255, 255];
const TEXT_PRIMARY_ALPHA = 0.87;
const TEXT_MUTED_ALPHA = 0.6;

// ========================================
// TESTS
// ========================================

afterEach(() => {
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    evictAttenuationStyleNoiseMap(asTestId(i));
    evictLocaleNoiseMap(localeTestId(i));
  }
});

describe('computeConsoleTheme — bounds coverage', () => {
  it('keeps bg/surface hue, saturation, and lightness within the AS-tier bounds for 50 distinct Attenuation Styles', () => {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const theme = computeConsoleTheme(asTestId(i), `Attenuation Style ${i}`, 'theme-test-locale-fixed', i, i * 2);
      const bg = parseHsl(theme.bg);
      const surface = parseHsl(theme.surface);

      expect(bg.h, `sample ${i} bg hue`).toBeGreaterThanOrEqual(0);
      expect(bg.h, `sample ${i} bg hue`).toBeLessThanOrEqual(360);
      expect(bg.s, `sample ${i} bg saturation`).toBeGreaterThanOrEqual(BG_SATURATION_RANGE[0]);
      expect(bg.s, `sample ${i} bg saturation`).toBeLessThanOrEqual(BG_SATURATION_RANGE[1]);
      expect(bg.l, `sample ${i} bg lightness`).toBeGreaterThanOrEqual(BG_LIGHTNESS_RANGE[0]);
      expect(bg.l, `sample ${i} bg lightness`).toBeLessThanOrEqual(BG_LIGHTNESS_RANGE[1]);

      // Surface reuses bg's hue/saturation exactly, and its lightness is the
      // real offset/clamp formula — not an independent seeded roll.
      expect(surface.h, `sample ${i} surface hue`).toBe(bg.h);
      expect(surface.s, `sample ${i} surface saturation`).toBe(bg.s);
      expect(surface.l, `sample ${i} surface lightness`).toBe(
        Math.min(bg.l + SURFACE_LIGHTNESS_OFFSET, SURFACE_LIGHTNESS_MAX),
      );
    }
  });

  it('keeps accent/border hue, saturation, and lightness within the locale-tier bounds for 50 distinct locales', () => {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const theme = computeConsoleTheme('theme-test-as-fixed', 'Fixed Attenuation Style', localeTestId(i), i * 3, i * 5);
      const accent = parseHsl(theme.accent);
      const border = parseHsl(theme.border);

      expect(accent.h, `sample ${i} accent hue`).toBeGreaterThanOrEqual(0);
      expect(accent.h, `sample ${i} accent hue`).toBeLessThanOrEqual(360);
      expect(accent.s, `sample ${i} accent saturation`).toBeGreaterThanOrEqual(ACCENT_SATURATION_RANGE[0]);
      expect(accent.s, `sample ${i} accent saturation`).toBeLessThanOrEqual(ACCENT_SATURATION_RANGE[1]);
      expect(accent.l, `sample ${i} accent lightness`).toBeGreaterThanOrEqual(ACCENT_LIGHTNESS_RANGE[0]);
      expect(accent.l, `sample ${i} accent lightness`).toBeLessThanOrEqual(ACCENT_LIGHTNESS_RANGE[1]);

      // Border reuses accent's own hue exactly — its own sat/lightness only.
      expect(border.h, `sample ${i} border hue`).toBe(accent.h);
      expect(border.s, `sample ${i} border saturation`).toBeGreaterThanOrEqual(BORDER_SATURATION_RANGE[0]);
      expect(border.s, `sample ${i} border saturation`).toBeLessThanOrEqual(BORDER_SATURATION_RANGE[1]);
      expect(border.l, `sample ${i} border lightness`).toBeGreaterThanOrEqual(BORDER_LIGHTNESS_RANGE[0]);
      expect(border.l, `sample ${i} border lightness`).toBeLessThanOrEqual(BORDER_LIGHTNESS_RANGE[1]);
    }
  });
});

describe('computeConsoleTheme — determinism', () => {
  it('returns byte-identical hsl(...) strings for identical inputs', () => {
    evictAttenuationStyleNoiseMap('theme-test-determinism-as');
    evictLocaleNoiseMap('theme-test-determinism-locale');

    const first = computeConsoleTheme('theme-test-determinism-as', 'Determinism AS', 'theme-test-determinism-locale', 7, 11);
    const second = computeConsoleTheme('theme-test-determinism-as', 'Determinism AS', 'theme-test-determinism-locale', 7, 11);

    expect(second).toEqual(first);

    evictAttenuationStyleNoiseMap('theme-test-determinism-as');
    evictLocaleNoiseMap('theme-test-determinism-locale');
  });
});

describe('computeConsoleTheme — non-degeneracy', () => {
  it('produces more than one distinct bg hue across 50 distinct Attenuation Styles (no static palette)', () => {
    const hues = new Set<number>();
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const theme = computeConsoleTheme(asTestId(i), `Attenuation Style ${i}`, 'theme-test-locale-fixed', i, i * 2);
      hues.add(parseHsl(theme.bg).h);
    }
    // "A handful" — well above 1, well below requiring near-uniform spread.
    expect(hues.size).toBeGreaterThan(5);
  });
});

describe('consoleThemeToCSSProperties', () => {
  it('returns exactly the 4 seed-driven keys, never the 2 fixed text tokens', () => {
    const theme = computeConsoleTheme('theme-test-as-css-props', 'CSS Props AS', 'theme-test-locale-css-props', 1, 2);
    const cssProps = consoleThemeToCSSProperties(theme);

    expect(Object.keys(cssProps).sort()).toEqual(['--color-accent', '--color-bg', '--color-border', '--color-surface']);
    expect(cssProps).not.toHaveProperty('--color-text-primary');
    expect(cssProps).not.toHaveProperty('--color-text-muted');

    evictAttenuationStyleNoiseMap('theme-test-as-css-props');
    evictLocaleNoiseMap('theme-test-locale-css-props');
  });
});

describe('the exhaustive contrast sweep (proves spec §1.1\'s bounds table)', () => {
  // Permanent regression coverage, not incidental: if this ever fails, the
  // bounds (or the fixed text-color alphas) changed without re-deriving the
  // AA guarantee. See docs/specs/CONSOLE_THEMING.md §1.1/§5.4.
  const HUE_STEP = 5;
  const extremesOf = (range: [number, number]) => [range[0], range[1]];

  it('clears WCAG AA for text-primary/text-muted vs surface, and 3:1 for accent/border vs bg/surface, across the full hue range at every bound extreme', () => {
    for (let hue = 0; hue <= 360; hue += HUE_STEP) {
      for (const bgSat of extremesOf(BG_SATURATION_RANGE)) {
        for (const bgLight of extremesOf(BG_LIGHTNESS_RANGE)) {
          const surfaceLight = Math.min(bgLight + SURFACE_LIGHTNESS_OFFSET, SURFACE_LIGHTNESS_MAX);
          const bgRgb = hslToRgb(hue, bgSat, bgLight);
          const surfaceRgb = hslToRgb(hue, bgSat, surfaceLight);
          const context = `hue=${hue} bgSat=${bgSat} bgLight=${bgLight}`;

          // Text is checked against surface, not bg — surface is always the
          // lighter of the two, the harder case for light-on-dark contrast.
          const primaryOnSurface = contrastRatio(blendOverBackground(WHITE, TEXT_PRIMARY_ALPHA, surfaceRgb), surfaceRgb);
          expect(primaryOnSurface, `text-primary vs surface, ${context}`).toBeGreaterThanOrEqual(4.5);

          const mutedOnSurface = contrastRatio(blendOverBackground(WHITE, TEXT_MUTED_ALPHA, surfaceRgb), surfaceRgb);
          expect(mutedOnSurface, `text-muted vs surface, ${context}`).toBeGreaterThanOrEqual(4.5);

          for (const accentSat of extremesOf(ACCENT_SATURATION_RANGE)) {
            for (const accentLight of extremesOf(ACCENT_LIGHTNESS_RANGE)) {
              const accentRgb = hslToRgb(hue, accentSat, accentLight);
              const accentContext = `accent vs bg/surface, ${context} accentSat=${accentSat} accentLight=${accentLight}`;
              expect(contrastRatio(accentRgb, bgRgb), accentContext).toBeGreaterThanOrEqual(3);
              expect(contrastRatio(accentRgb, surfaceRgb), accentContext).toBeGreaterThanOrEqual(3);
            }
          }

          for (const borderSat of extremesOf(BORDER_SATURATION_RANGE)) {
            for (const borderLight of extremesOf(BORDER_LIGHTNESS_RANGE)) {
              const borderRgb = hslToRgb(hue, borderSat, borderLight);
              const borderContext = `border vs bg/surface, ${context} borderSat=${borderSat} borderLight=${borderLight}`;
              expect(contrastRatio(borderRgb, bgRgb), borderContext).toBeGreaterThanOrEqual(3);
              expect(contrastRatio(borderRgb, surfaceRgb), borderContext).toBeGreaterThanOrEqual(3);
            }
          }
        }
      }
    }
  });
});
