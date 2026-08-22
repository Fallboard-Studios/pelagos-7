// ========================================
// IMPORTS
// ========================================
import type { NoiseFunction2D } from 'simplex-noise';

import { getPlanetNoiseMap } from './noiseMaps';
import { getSeededVal } from './getSeededVal';

import type { GlobalAudioSettings } from '@/types/globalAudio';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';
import { GLOBAL_AUDIO_SEED_RANGES, type GlobalAudioSeedFieldKey, type SeedRange } from '@/data/globalAudioSeedRanges';
import {
  GLOBAL_LFO_TARGET_IDS,
  LFO_RATE_MIN,
  LFO_RATE_MAX,
  LFO_DEPTH_MIN,
  LFO_DEPTH_MAX,
  LFO_SHAPES,
  type GlobalLfoTargetId,
  type LfoSettings,
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
  const range = GLOBAL_AUDIO_SEED_RANGES[key];
  // getSeededVal handles the seeded noise → [0, 1] draw; scaleUnitValue owns
  // range + log/linear mapping, so the two concerns stay separately testable.
  const t = getSeededVal(noiseMap, `globalAudio.${key}`, 0, 0, 1);
  return scaleUnitValue(t, range);
}

/**
 * Generate deterministic GlobalAudioSettings for a planet, sampled from the
 * planet noise map — a new direct sample; previously the planet map was only
 * used to derive locale maps (see PROCEDURAL_GENERATION.md).
 *
 * `enabled`/`type`/`globalBypass` are NOT seeded — they're carried over from
 * DEFAULT_GLOBAL_AUDIO_SETTINGS unchanged. Task 6 forces every effect's
 * `enabled` to true when wiring this into audioStore; this function only
 * needs to not randomize it.
 */
export function generateGlobalAudioSettings(planetId: string, planetName: string): GlobalAudioSettings {
  const noiseMap = getPlanetNoiseMap(planetId, planetName);
  const defaults = DEFAULT_GLOBAL_AUDIO_SETTINGS;

  return {
    globalBypass: defaults.globalBypass,
    compressor: {
      enabled: defaults.compressor.enabled,
      threshold: sampleField(noiseMap, 'compressor.threshold'),
      ratio: sampleField(noiseMap, 'compressor.ratio'),
      attack: sampleField(noiseMap, 'compressor.attack'),
      release: sampleField(noiseMap, 'compressor.release'),
      knee: sampleField(noiseMap, 'compressor.knee'),
    },
    eq3: {
      enabled: defaults.eq3.enabled,
      low: sampleField(noiseMap, 'eq3.low'),
      mid: sampleField(noiseMap, 'eq3.mid'),
      high: sampleField(noiseMap, 'eq3.high'),
    },
    filterLPF: {
      enabled: defaults.filterLPF.enabled,
      type: 'lowpass',
      frequency: sampleField(noiseMap, 'filterLPF.frequency'),
      Q: sampleField(noiseMap, 'filterLPF.Q'),
    },
    filterHPF: {
      enabled: defaults.filterHPF.enabled,
      type: 'highpass',
      frequency: sampleField(noiseMap, 'filterHPF.frequency'),
      Q: sampleField(noiseMap, 'filterHPF.Q'),
    },
    chorus: {
      enabled: defaults.chorus.enabled,
      rate: sampleField(noiseMap, 'chorus.rate'),
      depth: sampleField(noiseMap, 'chorus.depth'),
      delayTime: sampleField(noiseMap, 'chorus.delayTime'),
      feedback: sampleField(noiseMap, 'chorus.feedback'),
      wet: sampleField(noiseMap, 'chorus.wet'),
    },
    delay: {
      enabled: defaults.delay.enabled,
      delayTime: sampleField(noiseMap, 'delay.delayTime'),
      feedback: sampleField(noiseMap, 'delay.feedback'),
      wet: sampleField(noiseMap, 'delay.wet'),
    },
    reverb: {
      enabled: defaults.reverb.enabled,
      decay: sampleField(noiseMap, 'reverb.decay'),
      preDelay: sampleField(noiseMap, 'reverb.preDelay'),
      dampening: sampleField(noiseMap, 'reverb.dampening'),
      wet: sampleField(noiseMap, 'reverb.wet'),
    },
  };
}

/**
 * Probability threshold an `active` seed draw ([0, 1]) must clear to seed
 * `true` — docs/tasks/AUDIO_RIG.md's Architecture Decisions: ~20% chance per
 * target (not a flat 50/50), so a typical planet seeds roughly 1-2 active
 * LFOs out of 9, not 4-5.
 */
const LFO_ACTIVE_THRESHOLD = 0.8;

/**
 * Generate deterministic global-chain LFO settings for a planet, sampled
 * from the planet noise map (same source as generateGlobalAudioSettings).
 * Unlike the per-field GLOBAL_AUDIO_SEED_RANGES table, every target shares
 * the same single global rate/depth bounds (LFO_RATE_MIN/MAX,
 * LFO_DEPTH_MIN/MAX) — GLOBAL_CHAIN_GRID.md's LFO? column is a flat flag,
 * not per-field bounds. `active` is seeded too, unlike the robot-level
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
      rate: scaleUnitValue(rateT, { min: LFO_RATE_MIN, max: LFO_RATE_MAX, scale: 'linear' }),
      depth: scaleUnitValue(depthT, { min: LFO_DEPTH_MIN, max: LFO_DEPTH_MAX, scale: 'linear' }),
      shape: LFO_SHAPES[Math.min(LFO_SHAPES.length - 1, Math.floor(shapeT * LFO_SHAPES.length))],
      active: activeT >= LFO_ACTIVE_THRESHOLD,
    };
  }
  return result;
}
