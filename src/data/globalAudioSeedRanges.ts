/**
 * Per-field FULL/UI-matching ranges for GlobalAudioSettings — this is the
 * "Unit / Range" column, not the narrower "Loading Range" column
 * (src/data/globalAudioLoadingRanges.ts). docs/reference/GLOBAL_CHAIN_GRID.md
 * is the source of truth for both; this file is a mechanical transcription.
 *
 * min/max mirror the doc-comment ranges already in src/types/globalAudio.ts —
 * do not change one without the other. `scale` is 'log' only for the fields
 * GLOBAL_CHAIN_GRID.md's UI column marks "SLIDER (Logarithmic)"; everything
 * else (including EQ3's center-zero sliders, which are a UI presentation
 * choice, not a sampling one) is 'linear'.
 *
 * Consumed by globalAudioSeed.ts to seed-generate the global FX chain from
 * the planet noise map, and by lfoEngine.ts's resolveLfoOutputRange (the full
 * range an LFO can swing a modulated parameter across — never the narrower
 * loading range).
 */

export type SeedScale = 'log' | 'linear';

export interface SeedRange {
  min: number;
  max: number;
  scale: SeedScale;
}

export type GlobalAudioSeedFieldKey =
  | 'compressor.threshold'
  | 'compressor.ratio'
  | 'compressor.attack'
  | 'compressor.release'
  | 'compressor.knee'
  | 'eq3.low'
  | 'eq3.mid'
  | 'eq3.high'
  | 'filterLPF.frequency'
  | 'filterLPF.Q'
  | 'filterHPF.frequency'
  | 'filterHPF.Q'
  | 'delay.delayTime'
  | 'delay.feedback'
  | 'delay.wet'
  | 'reverb.decay'
  | 'reverb.preDelay'
  | 'reverb.wet'
  | 'limiter.threshold'
  | 'lfoDrift.eq3.rateDrift' | 'lfoDrift.eq3.depthDrift'
  | 'lfoDrift.filterLPF.rateDrift' | 'lfoDrift.filterLPF.depthDrift'
  | 'lfoDrift.filterHPF.rateDrift' | 'lfoDrift.filterHPF.depthDrift'
  | 'lfoDrift.robots.rateDrift' | 'lfoDrift.robots.depthDrift';

// V2: Chorus (rate/depth/delayTime/feedback/wet) removed entirely — the
// effect doesn't suit this music. reverb.dampening removed — Tone.Reverb has
// no such property; it was a dead cast in globalFx.ts since Phase 0.
// limiter.threshold added — Tone.Limiter's only controllable param.
// See docs/reference/GLOBAL_CHAIN_GRID.md, the source of truth for every
// value below.
export const GLOBAL_AUDIO_SEED_RANGES: Record<GlobalAudioSeedFieldKey, SeedRange> = {
  'compressor.threshold': { min: -60, max: 0, scale: 'linear' },
  'compressor.ratio': { min: 1, max: 20, scale: 'linear' },
  'compressor.attack': { min: 0.001, max: 1, scale: 'log' },
  'compressor.release': { min: 0.01, max: 1, scale: 'log' },
  'compressor.knee': { min: 0, max: 40, scale: 'linear' },

  'eq3.low': { min: -12, max: 12, scale: 'linear' },
  'eq3.mid': { min: -12, max: 12, scale: 'linear' },
  'eq3.high': { min: -12, max: 12, scale: 'linear' },

  'filterLPF.frequency': { min: 20, max: 20000, scale: 'log' },
  'filterLPF.Q': { min: 0.1, max: 20, scale: 'log' },
  'filterHPF.frequency': { min: 20, max: 20000, scale: 'log' },
  'filterHPF.Q': { min: 0.1, max: 20, scale: 'log' },

  'delay.delayTime': { min: 0, max: 1, scale: 'linear' },
  'delay.feedback': { min: 0, max: 0.95, scale: 'linear' },
  'delay.wet': { min: 0, max: 1, scale: 'linear' },

  'reverb.decay': { min: 0.1, max: 10, scale: 'log' },
  'reverb.preDelay': { min: 0, max: 0.5, scale: 'linear' },
  'reverb.wet': { min: 0, max: 1, scale: 'linear' },

  'limiter.threshold': { min: -20, max: 0, scale: 'linear' },

  // Global LFO drift amounts, one independent pair per drift group
  // (docs/specs/LFO_DRIFT_GROUPS.md) — bipolar, not sourced from
  // GLOBAL_CHAIN_GRID.md (drift didn't exist when that doc was written).
  'lfoDrift.eq3.rateDrift': { min: -1, max: 1, scale: 'linear' },
  'lfoDrift.eq3.depthDrift': { min: -1, max: 1, scale: 'linear' },
  'lfoDrift.filterLPF.rateDrift': { min: -1, max: 1, scale: 'linear' },
  'lfoDrift.filterLPF.depthDrift': { min: -1, max: 1, scale: 'linear' },
  'lfoDrift.filterHPF.rateDrift': { min: -1, max: 1, scale: 'linear' },
  'lfoDrift.filterHPF.depthDrift': { min: -1, max: 1, scale: 'linear' },
  'lfoDrift.robots.rateDrift': { min: -1, max: 1, scale: 'linear' },
  'lfoDrift.robots.depthDrift': { min: -1, max: 1, scale: 'linear' },
};
