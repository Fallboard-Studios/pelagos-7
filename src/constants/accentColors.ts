/**
 * Single source of truth for the app's static accent palette — transcribed once from
 * docs/reference/accent-colors.css (Crawford's own design reference; that file is not imported at
 * runtime). See docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.1. Renaming a key here is a breaking
 * change to traitColors.ts and spawnSystem.ts's robot-color seeding — treat it the same caution
 * class as a getSeededVal dataId rename (docs/PROCEDURAL_GENERATION.md).
 */
export const ACCENT_COLORS = {
  orange: '#da7e1b',
  red: '#cd5e57',
  pink: '#ae5378',
  purple: '#7a5484',
  plum: '#65617f',
  blue: '#4f6d7a',
  cyan: '#428d95',
  teal: '#41ad9f',
  green: '#68cb97',
  lime: '#a9e583',
  yellow: '#e9e377',
  tangerine: '#e2b149',
  beige: '#f7f5d3',
  black: '#120a03',
  white: '#fff',
  darkGray: '#211e1b',
} as const;

export type AccentColorName = keyof typeof ACCENT_COLORS;

/**
 * The 13 hue keys only — excludes black/white/darkGray, which would render a robot's card/detail
 * identity color as colorless against the app's own dark neutral base. Order is stable (a literal
 * array, not derived from ACCENT_COLORS' own key order) since spawnSystem.ts indexes into it via a
 * seeded float — reordering this array changes which color every already-generated robot on a
 * given seed gets, the same breaking-change caution as a dataId rename.
 */
export const ROBOT_IDENTITY_COLOR_NAMES: AccentColorName[] = [
  'orange', 'red', 'pink', 'purple', 'plum', 'blue', 'cyan',
  'teal', 'green', 'lime', 'yellow', 'tangerine', 'beige',
];
