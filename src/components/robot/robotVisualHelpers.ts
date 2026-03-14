// ========================================
// IMPORTS
// ========================================
import type { AudioAttributes, SynthType } from '../../types/Robot';
import { RobotSleek } from './RobotSleek';
import { RobotAngular } from './RobotAngular';
import { RobotOrganic } from './RobotOrganic';
import { RobotIndustrial } from './RobotIndustrial';

// ========================================
// TYPES
// ========================================
export interface RobotColors {
  primary: string;
  secondary: string;
  accent: string;
}

export type RobotSVGComponent = typeof RobotSleek | typeof RobotAngular | typeof RobotOrganic | typeof RobotIndustrial;

// ========================================
// CONSTANTS
// ========================================
// ADSR thresholds for color mapping
const FAST_ATTACK_THRESHOLD = 0.1;   // seconds
const SLOW_ATTACK_THRESHOLD = 0.5;   // seconds
const SHORT_DECAY_THRESHOLD = 0.3;   // seconds
const LONG_DECAY_THRESHOLD = 1.0;    // seconds

// Pitch thresholds for scale mapping
const HIGH_PITCH_THRESHOLD = 600;    // Hz
const LOW_PITCH_THRESHOLD = 200;     // Hz

// Filter thresholds for detail level mapping
const HIGH_FILTER_THRESHOLD = 2000;  // Hz
const LOW_FILTER_THRESHOLD = 500;    // Hz

// Color palettes (post-apocalyptic theme) - expressed as HSL strings
const RUSTY_COLORS = ['hsl(30, 65%, 30%)', 'hsl(20, 45%, 35%)', 'hsl(30, 55%, 50%)'];
const CORRODED_COLORS = ['hsl(120, 12%, 18%)', 'hsl(90, 18%, 28%)', 'hsl(75, 25%, 35%)'];
const NEON_COLORS = ['hsl(120, 100%, 50%)', 'hsl(180, 100%, 50%)', 'hsl(300, 100%, 50%)'];
const INDUSTRIAL_COLORS = ['hsl(0, 0%, 41%)', 'hsl(0, 0%, 50%)', 'hsl(0, 0%, 66%)'];

// ========================================
// EXPORTS
// ========================================

/**
 * Select robot shape component based on synth type
 * AMSynth → Sleek, FMSynth → Angular, PolySynth → Organic, MembraneSynth → Industrial
 */
export function selectRobotShape(synthType: SynthType): RobotSVGComponent {
  switch (synthType) {
    case 'AMSynth':
      return RobotSleek;
    case 'FMSynth':
      return RobotAngular;
    case 'PolySynth':
      return RobotOrganic;
    case 'MembraneSynth':
      return RobotIndustrial;
    default:
      return RobotSleek; // Fallback
  }
}

/**
 * Generate color palette from ADSR envelope
 * Fast attack + short decay → bright neon colors (energetic)
 * Slow attack + long decay → muted corroded colors (atmospheric)
 */
export function generateColors(adsr: AudioAttributes['adsr']): RobotColors {
  const { attack, decay } = adsr;

  // Determine color palette
  let palette: string[];
  if (attack < FAST_ATTACK_THRESHOLD && decay < SHORT_DECAY_THRESHOLD) {
    palette = NEON_COLORS; // Fast/bright
  } else if (attack > SLOW_ATTACK_THRESHOLD && decay > LONG_DECAY_THRESHOLD) {
    palette = CORRODED_COLORS; // Slow/muted
  } else if (attack < FAST_ATTACK_THRESHOLD) {
    palette = RUSTY_COLORS; // Fast but sustained
  } else {
    palette = INDUSTRIAL_COLORS; // Default
  }

  // Palettes are already HSL strings.
  return {
    primary: palette[0],
    secondary: palette[1],
    accent: palette[2],
  };
}

/**
 * Calculate scale from pitch range
 * High pitch → smaller (0.7x)
 * Mid pitch → normal (1.0x)
 * Low pitch → larger (1.3x)
 */
export function calculateScale(pitchRange: AudioAttributes['pitchRange']): number {
  const avgPitch = (pitchRange.min + pitchRange.max) / 2;

  if (avgPitch > HIGH_PITCH_THRESHOLD) {
    return 0.7;
  } else if (avgPitch < LOW_PITCH_THRESHOLD) {
    return 1.3;
  } else {
    return 1.0;
  }
}

/**
 * Calculate detail level from filter frequency
 * Low filter → minimal details (0.0)
 * High filter → maximum details (1.0)
 * Linear interpolation between thresholds
 */
export function calculateDetailLevel(filterFreq: number): number {
  if (filterFreq <= LOW_FILTER_THRESHOLD) {
    return 0.0;
  } else if (filterFreq >= HIGH_FILTER_THRESHOLD) {
    return 1.0;
  } else {
    // Linear interpolation
    return (filterFreq - LOW_FILTER_THRESHOLD) / (HIGH_FILTER_THRESHOLD - LOW_FILTER_THRESHOLD);
  }
}

/**
 * Adjust RobotColors by applying a lightness multiplier to each color.
 * Multiplier scales the L component of HSL (0..1) and clamps results.
 */
export function applyLightnessMultiplier(colors: RobotColors, multiplier: number): RobotColors {
  return {
    primary: adjustHslLightness(colors.primary, multiplier),
    secondary: adjustHslLightness(colors.secondary, multiplier),
    accent: adjustHslLightness(colors.accent, multiplier),
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Parse an HSL string `hsl(h, s%, l%)` into components.
 */
function parseHslString(hsl: string) {
  const m = /hsl\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i.exec(hsl);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

/**
 * Adjust an HSL string's lightness, returning an HSL string.
 */
function adjustHslLightness(input: string, multiplier: number) {
  const parsed = parseHslString(input);
  if (!parsed) return input;
  const { h, s, l } = parsed;
  const newL = Math.round(clamp01((l / 100) * multiplier) * 100);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${newL}%)`;
}

// ========================================
// HELPERS
// ========================================

/**
 * Darken a hex color by a factor (0-1)
 * Used internally for shading calculations
 */
export function darken(hsl: string, factor: number): string {
  const parsed = parseHslString(hsl);
  if (!parsed) return hsl;
  const { h, s, l } = parsed;
  const newL = Math.round(clamp01((l / 100) * (1 - factor)) * 100);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${newL}%)`;
}
