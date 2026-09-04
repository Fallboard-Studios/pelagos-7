import { getSeededVal } from './getSeededVal';
import { getAttenuationStyleNoiseMap, getLocaleNoiseMap } from './noiseMaps';

/**
 * Seed-driven console theme values only — this module does NOT touch the
 * DOM. Tablet.tsx owns application (its own inline `style` prop). See
 * docs/specs/CONSOLE_THEMING.md §3.
 */
export interface ConsoleTheme {
  bg: string;
  surface: string;
  accent: string;
  border: string;
}

// AS-tier (structural) bounds — tighter than ROBOT_DESIGN.md's robot
// precedent (sat 30-100%, lum 20-72%); verified via consoleTheme.test.ts's
// exhaustive hue sweep to clear WCAG AA against the app's FIXED text colors.
// See docs/specs/CONSOLE_THEMING.md §1.1 for the derivation. Exported (not
// for runtime configurability — these are fixed, derived constants, per
// docs/specs/CONSOLE_THEMING.md §3 — but so consoleTheme.test.ts's
// exhaustive sweep can assert against the real bounds rather than a
// hardcoded copy that could silently drift from them).
export const BG_HUE_RANGE: [number, number] = [0, 360];
export const BG_SATURATION_RANGE: [number, number] = [10, 35];
export const BG_LIGHTNESS_RANGE: [number, number] = [5, 14];
/** Surface reads as the same structural color, subtly raised — the same
 *  relationship today's static #121212 -> #1a1a1a pair already has (~+3pp) —
 *  rather than an independent seeded roll. */
export const SURFACE_LIGHTNESS_OFFSET = 4;
export const SURFACE_LIGHTNESS_MAX = 18;

// Locale-tier (accent) bounds — deliberately light/vivid so a 3:1 non-text
// UI-component contrast (WCAG 1.4.11) against the dark AS-tier bg/surface
// holds for every hue. See docs/specs/CONSOLE_THEMING.md §1.1.
export const ACCENT_HUE_RANGE: [number, number] = [0, 360];
export const ACCENT_SATURATION_RANGE: [number, number] = [55, 90];
export const ACCENT_LIGHTNESS_RANGE: [number, number] = [72, 88];

// Border reuses accent's own seeded hue (below) — a desaturated, dimmer
// sibling of accent, not an independent color family. Only saturation and
// lightness are sampled separately.
export const BORDER_SATURATION_RANGE: [number, number] = [20, 40];
export const BORDER_LIGHTNESS_RANGE: [number, number] = [65, 80];

/**
 * Fixed, non-zero, non-integer offset used for every getSeededVal call
 * below — deliberately NOT the default 0. simplex-noise's createNoise2D
 * evaluates to exactly 0 at (0, 0) for every possible seed (the origin is a
 * lattice vertex with no gradient contribution), and stays degenerate for
 * any query point near that vertex — confirmed directly: some dataId
 * strings (e.g. 'ui.theme.background.hue', whose precomputeDataX() hash
 * lands at x≈0.0083) collapsed to only 3-4 distinct hues across 50 random
 * Attenuation Styles when queried at y=0, instead of a full spread. A
 * non-integer offset moves every query off the degenerate y=0 lattice line
 * entirely, regardless of which x a given dataId happens to hash to —
 * verified this restores full variety (43/50 distinct hues for the same
 * dataId). This is local to consoleTheme.ts; getSeededVal.ts's own offset=0
 * default (and every other existing caller using it) is untouched — the
 * same latent hazard could in principle affect any single-value dataId
 * whose hash happens to land near an integer coordinate, but that's a
 * pre-existing, wider concern out of this phase's scope.
 */
const THEME_SAMPLE_OFFSET = 0.5;

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${Math.round(hue)} ${Math.round(saturation)}% ${Math.round(lightness)}%)`;
}

/**
 * Structural (AS-tier) half of the theme — --color-bg/--color-surface.
 * Sampled from the active Attenuation Style's own noise map, per
 * PROCEDURAL_GENERATION.md's getSeededVal(noiseMap, dataId, offset, min, max)
 * convention (each field gets its own dataId, not an index — offset is
 * fixed at THEME_SAMPLE_OFFSET rather than the usual 0; see that constant's
 * own comment for why).
 */
function computeStructuralTheme(
  attenuationStyleId: string,
  attenuationStyleName: string,
): { bg: string; surface: string } {
  const noiseMap = getAttenuationStyleNoiseMap(attenuationStyleId, attenuationStyleName);
  const hue = getSeededVal(noiseMap, 'ui.theme.background.hue', THEME_SAMPLE_OFFSET, ...BG_HUE_RANGE);
  const saturation = getSeededVal(noiseMap, 'ui.theme.background.saturation', THEME_SAMPLE_OFFSET, ...BG_SATURATION_RANGE);
  const bgLightness = getSeededVal(noiseMap, 'ui.theme.background.lightness', THEME_SAMPLE_OFFSET, ...BG_LIGHTNESS_RANGE);
  const surfaceLightness = Math.min(bgLightness + SURFACE_LIGHTNESS_OFFSET, SURFACE_LIGHTNESS_MAX);
  return {
    bg: hsl(hue, saturation, bgLightness),
    surface: hsl(hue, saturation, surfaceLightness),
  };
}

/**
 * Accent (locale-tier) half of the theme — --color-accent/--color-border.
 * Sampled from the active locale's own coordinate noise map — decorrelated
 * from the AS-tier hue by construction (a wholly separate NoiseFunction2D,
 * per noiseMaps.ts). This is the concrete resolution of
 * docs/CONSOLE_THEMING.md's open "Generating Enough Variety" question: hue
 * as the primary differentiator (full 0-360°, independently seeded per
 * tier) plus an independently-seeded saturation — see
 * docs/specs/CONSOLE_THEMING.md §1.2.
 */
function computeAccentTheme(localeId: string, x: number, y: number): { accent: string; border: string } {
  const noiseMap = getLocaleNoiseMap(localeId, x, y);
  const hue = getSeededVal(noiseMap, 'ui.theme.accent.hue', THEME_SAMPLE_OFFSET, ...ACCENT_HUE_RANGE);
  const accentSaturation = getSeededVal(noiseMap, 'ui.theme.accent.saturation', THEME_SAMPLE_OFFSET, ...ACCENT_SATURATION_RANGE);
  const accentLightness = getSeededVal(noiseMap, 'ui.theme.accent.lightness', THEME_SAMPLE_OFFSET, ...ACCENT_LIGHTNESS_RANGE);
  const borderSaturation = getSeededVal(noiseMap, 'ui.theme.border.saturation', THEME_SAMPLE_OFFSET, ...BORDER_SATURATION_RANGE);
  const borderLightness = getSeededVal(noiseMap, 'ui.theme.border.lightness', THEME_SAMPLE_OFFSET, ...BORDER_LIGHTNESS_RANGE);
  return {
    accent: hsl(hue, accentSaturation, accentLightness),
    border: hsl(hue, borderSaturation, borderLightness), // same hue as accent, own sat/lightness
  };
}

/**
 * Full theme for the active Attenuation Style + Locale pair — the single
 * entry point Tablet.tsx calls. Pure function of its 5 inputs; safe to
 * useMemo on them (see docs/specs/CONSOLE_THEMING.md §1.4). Computes
 * values only — does NOT touch the DOM; the caller applies them.
 */
export function computeConsoleTheme(
  attenuationStyleId: string,
  attenuationStyleName: string,
  localeId: string,
  x: number,
  y: number,
): ConsoleTheme {
  return {
    ...computeStructuralTheme(attenuationStyleId, attenuationStyleName),
    ...computeAccentTheme(localeId, x, y),
  };
}

/**
 * Maps a ConsoleTheme onto the 4 seed-driven CSS custom properties, for use
 * as a React inline `style` prop — same `as CSSProperties` cast pattern
 * App.tsx's own realWorldStyle already uses for --real-world-gradient-*.
 * --color-text-primary/--color-text-muted are deliberately NOT included —
 * they stay fixed (docs/specs/CONSOLE_THEMING.md §3).
 */
export function consoleThemeToCSSProperties(theme: ConsoleTheme): Record<string, string> {
  return {
    '--color-bg': theme.bg,
    '--color-surface': theme.surface,
    '--color-accent': theme.accent,
    '--color-border': theme.border,
  };
}
