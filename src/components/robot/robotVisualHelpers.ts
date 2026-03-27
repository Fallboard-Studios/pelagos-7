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

// Base hue per synth type (degrees)
const BASE_HUE: Record<SynthType, number> = {
  AMSynth: 210,
  FMSynth: 24,
  PolySynth: 140,
  DuoSynth: 280,
};

// Safety guard to avoid divide-by-zero
const MIN_DENOMINATOR = 1e-4;

// ========================================
// EXPORTS
// ========================================

/**
 * Select robot shape component based on synth type
 * AMSynth → Sleek, FMSynth → Angular, PolySynth → Organic, DuoSynth → Industrial
 */
export function selectRobotShape(synthType: SynthType): RobotSVGComponent {
  switch (synthType) {
    case 'AMSynth':
      return RobotSleek;
    case 'FMSynth':
      return RobotAngular;
    case 'PolySynth':
      return RobotOrganic;
    case 'DuoSynth':
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
/**
 * Compute a hue offset (degrees) from ADSR components.
 * Uses decay/release and attack/sustain ratios to produce a small deterministic offset.
 */
export function hueOffset(adsr: AudioAttributes['adsr']): number {
  const { attack, decay, sustain, release } = adsr;
  const denomDR = Math.max(MIN_DENOMINATOR, decay + release);
  const denomAS = Math.max(MIN_DENOMINATOR, attack + sustain);

  const drComponent = (decay / denomDR - release / denomDR) * 18; // ±18°
  const asComponent = (attack / denomAS - sustain / denomAS) * 9; // ±9°

  return drComponent + asComponent;
}

export function toSaturation(attack: number): number {
  const MIN_ATTACK = 0.01;
  const MAX_ATTACK = 1.0;
  const MIN_SAT = 30;
  const MAX_SAT = 100;

  const norm = clamp01((attack - MIN_ATTACK) / (MAX_ATTACK - MIN_ATTACK));
  // Fast attack (small value) -> higher saturation
  return Math.round(MIN_SAT + (1 - norm) * (MAX_SAT - MIN_SAT));
}

export function toLuminance(sustain: number): number {
  const MIN_L = 20;
  const MAX_L = 72;
  const norm = clamp01(sustain); // sustain expected in 0..1
  return Math.round(MIN_L + norm * (MAX_L - MIN_L));
}

/**
 * Generate colors from full AudioAttributes
 */
export function generateColors(attrs: AudioAttributes): RobotColors {
  const { synthType, adsr } = attrs;

  const baseHue = BASE_HUE[synthType] ?? 200;
  const offset = hueOffset(adsr);
  const primaryHue = ((baseHue + offset) % 360 + 360) % 360; // normalized
  const secondaryHue = ((primaryHue + 14) % 360 + 360) % 360;
  const accentHue = ((primaryHue - 22) % 360 + 360) % 360;

  const sat = toSaturation(adsr.attack);
  const lum = toLuminance(adsr.sustain);

  return {
    primary: `hsl(${Math.round(primaryHue)}, ${sat}%, ${lum}%)`,
    secondary: `hsl(${Math.round(secondaryHue)}, ${Math.round(sat * 0.9)}%, ${Math.max(8, Math.round(lum * 0.9))}%)`,
    accent: `hsl(${Math.round(accentHue)}, ${Math.round(Math.min(100, sat * 1.1))}%, ${Math.max(6, Math.round(lum * 0.95))}%)`,
  };
}

// ========================================
// Shape params
// ========================================

export interface ShapeParams {
  torsoAspect: number;      // horizontal stretch (0.7..1.3)
  appendageLength: number;  // multiplier for propeller/strut lengths (0.6..1.4)
  scaleBias: number;        // additive bias applied to overall scale (-0.3..0.3)
}

export interface MicroVariants {
  stripes?: boolean;
  smooth?: boolean;
  spikes?: boolean;
}

/**
 * Deterministically derive visual shape parameters from AudioAttributes.
 * Keeps values clamped to safe visual ranges.
 */
export function shapeParamsFromAudio(attrs: AudioAttributes & { octaveOffset?: number }) {
  const { pitchRange, filterFreq, waveform, adsr, octaveOffset } = attrs;

  const avgPitch = (pitchRange.min + pitchRange.max) / 2;

  // torsoAspect: map avgPitch (LOW..HIGH) to 0.85..1.15 (lower pitch -> wider)
  const pitchNorm = clamp01((avgPitch - LOW_PITCH_THRESHOLD) / (HIGH_PITCH_THRESHOLD - LOW_PITCH_THRESHOLD));
  const torsoAspect = 1.15 - pitchNorm * 0.3; // 1.15 -> 0.85

  // appendageLength: use filterFreq (more detail -> longer appendages)
  const detailNorm = calculateDetailLevel(filterFreq); // 0..1
  const appendageLength = 0.7 + detailNorm * 0.8; // 0.7..1.5

  // scaleBias: derived from pitch (reuse calculateScale as anchor)
  const baseScale = calculateScale(pitchRange); // 0.7|1|1.3
  const scaleBias = Math.round((baseScale - 1) * 100) / 100; // -0.3|0|0.3

  // octaveOffset nudges scale if provided (0 = fastest/smallest -> slight negative bias)
  let octaveBias = 0;
  if (typeof octaveOffset === 'number') {
    // map 0->-0.06, 1->0, 2->+0.06
    octaveBias = (octaveOffset - 1) * 0.06;
  }

  const finalScaleBias = clamp01(0.5 + (scaleBias + octaveBias)) - 0.5; // keep within roughly -0.5..0.5 then recentre

  // MicroVariants from waveform and ADSR attack
  const micro: MicroVariants = {};
  if (waveform === 'square') micro.stripes = true;
  if (waveform === 'sine') micro.smooth = true;
  if (waveform === 'triangle' || waveform === 'sawtooth') micro.spikes = true;
  // fast attack -> highlight micro variant
  if (adsr.attack < FAST_ATTACK_THRESHOLD) micro.stripes = true;

  // Clamp ergonomics
  const clamped: ShapeParams = {
    torsoAspect: Math.max(0.7, Math.min(1.3, torsoAspect)),
    appendageLength: Math.max(0.6, Math.min(1.4, appendageLength)),
    scaleBias: Math.max(-0.4, Math.min(0.4, finalScaleBias)),
  };

  return { shapeParams: clamped, microVariants: micro };
}

// ========================================
// Greeble calculations
// ========================================

/**
 * Deterministic greeble count driven by filterFreq, detailLevel, waveform, and ADSR
 * Caps at 16 and returns an integer >= 0
 */
export function calculateGreebleCount(
  filterFreq: number,
  detailLevel: number,
  waveform: AudioAttributes['waveform'],
  adsr: AudioAttributes['adsr']
): number {
  const freqDetail = calculateDetailLevel(filterFreq); // 0..1
  const sustainFactor = clamp01(adsr.sustain); // 0..1

  // Weighted combination: favor filter freq and explicit detailLevel
  const base = freqDetail * 0.6 + clamp01(detailLevel) * 0.25 + sustainFactor * 0.15;

  // waveform bias: sawtooth & square produce slightly more greebles
  const waveformBias = waveform === 'sawtooth' || waveform === 'square' ? 1 : 0;

  const raw = Math.round(base * 15) + waveformBias; // 0..15 + bias -> up to 16
  return Math.max(0, Math.min(16, raw));
}

/**
 * Map sustain (0..1) to greeble visual size (px)
 */
export function calculateGreebleSize(sustain: number): number {
  const s = clamp01(sustain);
  // 1px (staccato) -> 6px (sustained)
  return Math.max(1, Math.round(1 + s * 5));
}

/**
 * Map release (seconds) to greeble persistence (seconds), clamped
 */
export function calculateGreeblePersistence(release: number): number {
  const clamped = Math.max(0.05, Math.min(3.0, release));
  // Visual safety clamp to 0.1..3.0
  return Math.max(0.1, Math.min(3.0, clamped));
}

/**
 * Placement bias derived from decay/release ratio (0..1)
 * Higher decay relative to release biases placement toward front (value closer to 1)
 */
export function calculateGreeblePlacementBias(decay: number, release: number): number {
  const denom = Math.max(MIN_DENOMINATOR, decay + release);
  const ratio = decay / denom; // 0..1
  return clamp01(ratio);
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
