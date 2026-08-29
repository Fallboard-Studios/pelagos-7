// ========================================
// IMPORTS
// ========================================
import type { NoiseFunction2D } from 'simplex-noise';

import { getPlanetNoiseMap } from './noiseMaps';
import { getSeededVal } from './getSeededVal';

import type { GlobalAudioSettings } from '@/types/globalAudio';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';
import { GLOBAL_AUDIO_LOADING_RANGES } from '@/data/globalAudioLoadingRanges';
import { GLOBAL_AUDIO_SEED_RANGES, type GlobalAudioSeedFieldKey, type SeedRange } from '@/data/globalAudioSeedRanges';
import {
  GLOBAL_LFO_TARGET_IDS,
  type GlobalLfoTargetId,
  type LfoSettings,
  type LfoShape,
} from '@/types/lfo';

// ========================================
// FUNCTIONS
// ========================================

/**
 * Map a seeded [0, 1] draw to a field's real range, honoring its scale.
 * Linear fields interpolate arithmetically; log fields interpolate
 * geometrically (min * (max/min)^t), matching how the rest of the UI
 * already treats logarithmic sliders (see GLOBAL_CHAIN_GRID.md). `t` is
 * clamped rather than extrapolated in case of floating-point overshoot.
 */
export function scaleUnitValue(t: number, range: SeedRange): number {
  const clamped = Math.min(1, Math.max(0, t));
  if (range.scale === 'log') {
    return range.min * Math.pow(range.max / range.min, clamped);
  }
  return range.min + (range.max - range.min) * clamped;
}

function sampleField(noiseMap: NoiseFunction2D, key: GlobalAudioSeedFieldKey): number {
  // Sample within the narrower LOADING range (initial-seed sub-window), but
  // honor the full range's log/linear scale — GLOBAL_AUDIO_LOADING_RANGES
  // doesn't carry its own `scale`, it's purely a narrower min/max over the
  // same field GLOBAL_AUDIO_SEED_RANGES already describes.
  const range: SeedRange = { ...GLOBAL_AUDIO_LOADING_RANGES[key], scale: GLOBAL_AUDIO_SEED_RANGES[key].scale };
  // getSeededVal handles the seeded noise → [0, 1] draw; scaleUnitValue owns
  // range + log/linear mapping, so the two concerns stay separately testable.
  const t = getSeededVal(noiseMap, `globalAudio.${key}`, 0, 0, 1);
  return scaleUnitValue(t, range);
}

/**
 * Probability threshold Delay's `enabled` seed draw ([0, 1]) must clear to
 * seed `true` — spec §5: a 25% chance, the sole exception among global
 * effects (every other effect always seeds enabled: true). Mirrors the
 * shipped LFO_ACTIVE_THRESHOLD pattern below, just a different field/odds.
 */
const DELAY_ENABLED_THRESHOLD = 0.75;

/**
 * Generate deterministic GlobalAudioSettings for a planet, sampled from the
 * planet noise map — a new direct sample; previously the planet map was only
 * used to derive locale maps (see PROCEDURAL_GENERATION.md).
 *
 * `type`/`globalBypass` are NOT seeded — carried over from
 * DEFAULT_GLOBAL_AUDIO_SETTINGS unchanged. `enabled` IS seeded (V2 — see
 * spec §5, superseding the Phase 0 force-true shim that used to live in
 * audioStore.ts's regenerateGlobalAudioFromSeed): every effect seeds
 * enabled: true unconditionally except Delay, which gets a real ~25% chance
 * via DELAY_ENABLED_THRESHOLD — the sole global effect a fresh planet can
 * load with off.
 */
export function generateGlobalAudioSettings(planetId: string, planetName: string): GlobalAudioSettings {
  const noiseMap = getPlanetNoiseMap(planetId, planetName);
  const defaults = DEFAULT_GLOBAL_AUDIO_SETTINGS;
  const delayEnabledT = getSeededVal(noiseMap, 'globalAudio.delay.enabled', 0, 0, 1);

  return {
    globalBypass: defaults.globalBypass,
    compressorBeforeDelay: defaults.compressorBeforeDelay,
    // Stopgap — Task 3/4 (docs/tasks/LFO_DRIFT_GROUPS.md) gives each of the 4
    // groups its own independent seed key; this reuses one shared draw across
    // all 4 for now, just to keep the reshaped Record<DriftGroupId, ...> type
    // satisfied until then.
    lfoDrift: {
      eq3: { rateDrift: sampleField(noiseMap, 'lfoDrift.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.depthDrift') },
      filterLPF: { rateDrift: sampleField(noiseMap, 'lfoDrift.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.depthDrift') },
      filterHPF: { rateDrift: sampleField(noiseMap, 'lfoDrift.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.depthDrift') },
      robots: { rateDrift: sampleField(noiseMap, 'lfoDrift.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.depthDrift') },
    },
    compressor: {
      enabled: true,
      threshold: sampleField(noiseMap, 'compressor.threshold'),
      ratio: sampleField(noiseMap, 'compressor.ratio'),
      attack: sampleField(noiseMap, 'compressor.attack'),
      release: sampleField(noiseMap, 'compressor.release'),
      knee: sampleField(noiseMap, 'compressor.knee'),
    },
    eq3: {
      enabled: true,
      low: sampleField(noiseMap, 'eq3.low'),
      mid: sampleField(noiseMap, 'eq3.mid'),
      high: sampleField(noiseMap, 'eq3.high'),
    },
    filterLPF: {
      enabled: true,
      type: 'lowpass',
      frequency: sampleField(noiseMap, 'filterLPF.frequency'),
      Q: sampleField(noiseMap, 'filterLPF.Q'),
    },
    filterHPF: {
      enabled: true,
      type: 'highpass',
      frequency: sampleField(noiseMap, 'filterHPF.frequency'),
      Q: sampleField(noiseMap, 'filterHPF.Q'),
    },
    delay: {
      enabled: delayEnabledT >= DELAY_ENABLED_THRESHOLD,
      delayTime: sampleField(noiseMap, 'delay.delayTime'),
      feedback: sampleField(noiseMap, 'delay.feedback'),
      wet: sampleField(noiseMap, 'delay.wet'),
    },
    reverb: {
      enabled: true,
      decay: sampleField(noiseMap, 'reverb.decay'),
      preDelay: sampleField(noiseMap, 'reverb.preDelay'),
      wet: sampleField(noiseMap, 'reverb.wet'),
    },
    limiter: {
      enabled: true,
      threshold: sampleField(noiseMap, 'limiter.threshold'),
    },
  };
}

/**
 * Probability threshold an `active` seed draw ([0, 1]) must clear to seed
 * `true` — ~66% chance per target (not a flat 50/50), so a typical planet
 * seeds roughly 5 active LFOs out of 7.
 */
const LFO_ACTIVE_THRESHOLD = 0.34;

/**
 * Loading-range sub-window for global-chain LFO rate/depth — narrower than
 * LFO_RATE_MIN/MAX and LFO_DEPTH_MIN/MAX (the full/UI-facing range every
 * other LFO consumer still uses unchanged: the Rate/Depth sliders in
 * Lfo.tsx, and lfoEngine.ts's setLfoRate/setLfoDepth clamp bounds). Mirrors
 * globalAudioLoadingRanges.ts's pattern for effect params — bounds what a
 * FRESH SEED can roll, never what the UI exposes or what the app can do.
 * Robot-level LFO seeding (spawnSystem.ts) has no equivalent split and keeps
 * sampling the full range; this only narrows the global-chain seed.
 */
export const LFO_RATE_LOADING_MIN = 1;
export const LFO_RATE_LOADING_MAX = 4;
export const LFO_DEPTH_LOADING_MIN = 20;
export const LFO_DEPTH_LOADING_MAX = 50;

/**
 * Loading-set restriction for global-chain LFO shape — narrower than
 * LFO_SHAPES (all 4: triangle/sine/square/sawtooth, still the full set the
 * Shape radio in Lfo.tsx offers). A fresh seed only ever rolls the two
 * smoothest shapes; square/sawtooth stay reachable, just not as a starting
 * state. Same loading-vs-full split as rate/depth above, applied to a
 * discrete set instead of a numeric range.
 */
const LFO_LOADING_SHAPES: readonly LfoShape[] = ['triangle', 'sine'];

/**
 * Generate deterministic global-chain LFO settings for a planet, sampled
 * from the planet noise map (same source as generateGlobalAudioSettings).
 * Unlike the per-field GLOBAL_AUDIO_SEED_RANGES table, every target shares
 * the same single global rate/depth loading bounds (LFO_RATE_LOADING_MIN/MAX,
 * LFO_DEPTH_LOADING_MIN/MAX) — GLOBAL_CHAIN_GRID.md's LFO? column is a flat
 * flag, not per-field bounds. `active` is seeded too, unlike the robot-level
 * precedent (spawnSystem.ts's generateRobotLfoSettings, where connected/
 * active is a runtime UI concern never part of the generated data) — a
 * freshly loaded planet can already have real, audible modulation running.
 */
export function generateGlobalLfoSettings(
  planetId: string,
  planetName: string,
): Record<GlobalLfoTargetId, LfoSettings & { active: boolean }> {
  const noiseMap = getPlanetNoiseMap(planetId, planetName);
  const result = {} as Record<GlobalLfoTargetId, LfoSettings & { active: boolean }>;

  for (const target of GLOBAL_LFO_TARGET_IDS) {
    const rateT = getSeededVal(noiseMap, `globalLfo.${target}.rate`, 0, 0, 1);
    const depthT = getSeededVal(noiseMap, `globalLfo.${target}.depth`, 0, 0, 1);
    const shapeT = getSeededVal(noiseMap, `globalLfo.${target}.shape`, 0, 0, 1);
    const activeT = getSeededVal(noiseMap, `globalLfo.${target}.active`, 0, 0, 1);

    result[target] = {
      rate: scaleUnitValue(rateT, { min: LFO_RATE_LOADING_MIN, max: LFO_RATE_LOADING_MAX, scale: 'linear' }),
      depth: scaleUnitValue(depthT, { min: LFO_DEPTH_LOADING_MIN, max: LFO_DEPTH_LOADING_MAX, scale: 'linear' }),
      shape: LFO_LOADING_SHAPES[Math.min(LFO_LOADING_SHAPES.length - 1, Math.floor(shapeT * LFO_LOADING_SHAPES.length))],
      active: activeT >= LFO_ACTIVE_THRESHOLD,
    };
  }
  return result;
}
