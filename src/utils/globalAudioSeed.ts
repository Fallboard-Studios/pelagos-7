// ========================================
// IMPORTS
// ========================================
import type { NoiseFunction2D } from 'simplex-noise';

import { getAttenuationStyleNoiseMap } from './noiseMaps';
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
 * Probability threshold Delay's own "start quiet" seed draw ([0, 1]) must
 * clear to force wet to 0 — spec §5's original ~25% chance, now expressed
 * directly on wet since there's no separate enabled flag left to carry it.
 * The sole global effect a fresh Attenuation Style can load silent; every
 * other effect's wet/level always seeds a real, audible value. Mirrors the
 * shipped LFO_ACTIVE_THRESHOLD pattern below, just a different field/odds.
 */
const DELAY_QUIET_THRESHOLD = 0.25;

/**
 * Generate deterministic GlobalAudioSettings for an Attenuation Style, sampled from the
 * Attenuation Style noise map — a new direct sample; previously that map was only
 * used to derive locale maps (see PROCEDURAL_GENERATION.md).
 *
 * `type`/`compressorBeforeDelay` are NOT seeded — carried over from
 * DEFAULT_GLOBAL_AUDIO_SETTINGS unchanged. Every effect's params always seed
 * a real, audible value except Delay's `wet`, which has a real ~25% chance
 * (DELAY_QUIET_THRESHOLD) of forcing to 0 instead of its otherwise-sampled
 * value — the sole global effect a fresh Attenuation Style can load
 * effectively silent. This replaces the old per-effect `enabled` boolean
 * (removed entirely, along with `globalBypass` — off states are expressed
 * purely through the params themselves now).
 */
export function generateGlobalAudioSettings(attenuationStyleId: string, attenuationStyleName: string): GlobalAudioSettings {
  const noiseMap = getAttenuationStyleNoiseMap(attenuationStyleId, attenuationStyleName);
  const defaults = DEFAULT_GLOBAL_AUDIO_SETTINGS;
  const delayQuietT = getSeededVal(noiseMap, 'globalAudio.delay.quiet', 0, 0, 1);

  return {
    compressorBeforeDelay: defaults.compressorBeforeDelay,
    lfoDrift: {
      eq3: { rateDrift: sampleField(noiseMap, 'lfoDrift.eq3.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.eq3.depthDrift') },
      filterLPF: { rateDrift: sampleField(noiseMap, 'lfoDrift.filterLPF.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.filterLPF.depthDrift') },
      filterHPF: { rateDrift: sampleField(noiseMap, 'lfoDrift.filterHPF.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.filterHPF.depthDrift') },
      robots: { rateDrift: sampleField(noiseMap, 'lfoDrift.robots.rateDrift'), depthDrift: sampleField(noiseMap, 'lfoDrift.robots.depthDrift') },
    },
    compressor: {
      threshold: sampleField(noiseMap, 'compressor.threshold'),
      ratio: sampleField(noiseMap, 'compressor.ratio'),
      attack: sampleField(noiseMap, 'compressor.attack'),
      release: sampleField(noiseMap, 'compressor.release'),
      knee: sampleField(noiseMap, 'compressor.knee'),
    },
    eq3: {
      low: sampleField(noiseMap, 'eq3.low'),
      mid: sampleField(noiseMap, 'eq3.mid'),
      high: sampleField(noiseMap, 'eq3.high'),
    },
    filterLPF: {
      type: 'lowpass',
      frequency: sampleField(noiseMap, 'filterLPF.frequency'),
      Q: sampleField(noiseMap, 'filterLPF.Q'),
    },
    filterHPF: {
      type: 'highpass',
      frequency: sampleField(noiseMap, 'filterHPF.frequency'),
      Q: sampleField(noiseMap, 'filterHPF.Q'),
    },
    delay: {
      delayTime: sampleField(noiseMap, 'delay.delayTime'),
      feedback: sampleField(noiseMap, 'delay.feedback'),
      // Quiet ~25% of the time (DELAY_QUIET_THRESHOLD) — wet forces to 0
      // instead of its own sampled value, replacing the old enabled:false roll.
      wet: delayQuietT < DELAY_QUIET_THRESHOLD ? 0 : sampleField(noiseMap, 'delay.wet'),
    },
    reverb: {
      decay: sampleField(noiseMap, 'reverb.decay'),
      preDelay: sampleField(noiseMap, 'reverb.preDelay'),
      wet: sampleField(noiseMap, 'reverb.wet'),
    },
    limiter: {
      threshold: sampleField(noiseMap, 'limiter.threshold'),
    },
  };
}

/**
 * Probability threshold an `active` seed draw ([0, 1]) must clear to seed
 * `true` — ~66% chance per target (not a flat 50/50), so a typical Attenuation Style
 * seeds roughly 5 active LFOs out of 7.
 */
const LFO_ACTIVE_THRESHOLD = 0.34;

/**
 * Ping Variance Automation's own seeded-default range — [33%, 66%] as a
 * fraction — same "bounded/legible default, freely draggable afterward"
 * convention every other seeded Rig field follows (e.g. DELAY_ENABLED_THRESHOLD
 * above). docs/specs/PING-VARIANCE-AUTOMATION.md §1.2.
 */
const PING_VARIANCE_AUTOMATION_SEED_RANGE = { min: 0.33, max: 0.66 };

/**
 * Seeded starting value for audioStore's pingVarianceAutomation, [0.33, 0.66]
 * as a fraction. Sampled once per session, not once per Attenuation Style
 * switch — audioStore.ts's regenerateGlobalAudioFromSeed is responsible for
 * only calling this on the very first seed and carrying the value forward on
 * every later call (docs/specs/PING-VARIANCE-AUTOMATION.md §1.2); this
 * function itself is a plain, stateless seeded draw, same shape as every
 * other function in this file.
 */
export function generatePingVarianceAutomation(attenuationStyleId: string, attenuationStyleName: string): number {
  const noiseMap = getAttenuationStyleNoiseMap(attenuationStyleId, attenuationStyleName);
  return getSeededVal(
    noiseMap, 'globalAudio.pingVarianceAutomation', 0,
    PING_VARIANCE_AUTOMATION_SEED_RANGE.min, PING_VARIANCE_AUTOMATION_SEED_RANGE.max
  );
}

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
 * Generate deterministic global-chain LFO settings for an Attenuation Style, sampled
 * from the same Attenuation Style noise map generateGlobalAudioSettings uses.
 * Unlike the per-field GLOBAL_AUDIO_SEED_RANGES table, every target shares
 * the same single global rate/depth loading bounds (LFO_RATE_LOADING_MIN/MAX,
 * LFO_DEPTH_LOADING_MIN/MAX) — GLOBAL_CHAIN_GRID.md's LFO? column is a flat
 * flag, not per-field bounds. `active` is seeded too, unlike the robot-level
 * precedent (spawnSystem.ts's generateRobotLfoSettings, where connected/
 * active is a runtime UI concern never part of the generated data) — a
 * freshly loaded Attenuation Style can already have real, audible modulation running.
 */
export function generateGlobalLfoSettings(
  attenuationStyleId: string,
  attenuationStyleName: string,
): Record<GlobalLfoTargetId, LfoSettings & { active: boolean }> {
  const noiseMap = getAttenuationStyleNoiseMap(attenuationStyleId, attenuationStyleName);
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
