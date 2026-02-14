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

// Color palettes (post-apocalyptic theme)
const RUSTY_COLORS = ['#8B4513', '#A0522D', '#CD853F'];
const CORRODED_COLORS = ['#2F4F4F', '#556B2F', '#6B8E23'];
const NEON_COLORS = ['#00FF00', '#00FFFF', '#FF00FF'];
const INDUSTRIAL_COLORS = ['#696969', '#808080', '#A9A9A9'];

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

// ========================================
// HELPERS
// ========================================

/**
 * Darken a hex color by a factor (0-1)
 * Used internally for shading calculations
 */
export function darken(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.floor((num >> 16) * (1 - factor));
  const g = Math.floor(((num >> 8) & 0x00ff) * (1 - factor));
  const b = Math.floor((num & 0x0000ff) * (1 - factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
