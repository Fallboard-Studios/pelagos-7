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
 * - Attack: Fast → bright/saturated, Slow → muted/desaturated
 * - Decay: Long → cool hues, Short → warm hues
 * - Sustain: High → higher luminance, Low → lower luminance
 */
export function generateColors(adsr: AudioAttributes['adsr']): RobotColors {
  const { attack, decay, sustain } = adsr;

  // Determine base palette from decay (hue selection)
  let basePalette: string[];
  if (decay > LONG_DECAY_THRESHOLD) {
    basePalette = CORRODED_COLORS; // Cool hues (blues, cyans, greens)
  } else if (decay < SHORT_DECAY_THRESHOLD) {
    basePalette = RUSTY_COLORS; // Warm hues (reds, oranges, browns)
  } else {
    basePalette = INDUSTRIAL_COLORS; // Neutral grays
  }

  // Modify saturation/brightness based on attack and sustain
  const isFastAttack = attack < FAST_ATTACK_THRESHOLD;
  const isSlowAttack = attack > SLOW_ATTACK_THRESHOLD;
  const isHighSustain = sustain > 0.6;

  // Bright, saturated colors for fast attack
  if (isFastAttack && isHighSustain) {
    return {
      primary: NEON_COLORS[0],
      secondary: NEON_COLORS[1],
      accent: NEON_COLORS[2],
    };
  }

  // Muted colors for slow attack or low sustain
  if (isSlowAttack || sustain < 0.3) {
    return {
      primary: darken(basePalette[0], 0.3),
      secondary: darken(basePalette[1], 0.3),
      accent: darken(basePalette[2], 0.3),
    };
  }

  // Standard palette
  return {
    primary: basePalette[0],
    secondary: basePalette[1],
    accent: basePalette[2],
  };
}

/**
 * Calculate scale from pitch range
 * High pitch (>600Hz) → small (0.7x)
 * Mid pitch (200-600Hz) → medium (1.0x)
 * Low pitch (<200Hz) → large (1.3x)
 */
export function calculateScale(pitchRange: AudioAttributes['pitchRange']): number {
  const avgFreq = (pitchRange.min + pitchRange.max) / 2;

  if (avgFreq > HIGH_PITCH_THRESHOLD) {
    return 0.7; // Small
  }
  if (avgFreq < LOW_PITCH_THRESHOLD) {
    return 1.3; // Large
  }
  return 1.0; // Medium
}

/**
 * Calculate detail level from filter frequency
 * High filter (>2000Hz) → maximum detail (1.0)
 * Mid filter (500-2000Hz) → interpolated detail
 * Low filter (<500Hz) → minimal detail (0.2)
 * No filter (0Hz) → base shape only (0.0)
 */
export function calculateDetailLevel(filterFreq: number): number {
  if (filterFreq === 0) {
    return 0.0; // No filter = no details
  }
  if (filterFreq > HIGH_FILTER_THRESHOLD) {
    return 1.0; // Maximum detail
  }
  if (filterFreq < LOW_FILTER_THRESHOLD) {
    return 0.2; // Minimal detail
  }

  // Linear interpolation between 0.2 and 1.0
  const normalized = (filterFreq - LOW_FILTER_THRESHOLD) / (HIGH_FILTER_THRESHOLD - LOW_FILTER_THRESHOLD);
  return 0.2 + normalized * 0.8;
}

// ========================================
// INTERNAL HELPERS
// ========================================

/**
 * Darken a hex color by a given factor
 */
function darken(hex: string, factor: number): string {
  // Remove # if present
  const color = hex.replace('#', '');

  // Parse RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Apply darkening factor
  const newR = Math.round(r * (1 - factor));
  const newG = Math.round(g * (1 - factor));
  const newB = Math.round(b * (1 - factor));

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
