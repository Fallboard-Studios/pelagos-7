/**
 * Per-field seed ranges for GlobalAudioSettings, resolving
 * docs/specs/LFO_INTEGRATION.md Task 4.
 *
 * min/max mirror the doc-comment ranges already in src/types/globalAudio.ts —
 * do not change one without the other. `scale` is 'log' only for the fields
 * docs/reference/GLOBAL_CHAIN_GRID.md's UI column marks "SLIDER (Logarithmic)";
 * everything else (including EQ3's center-zero sliders, which are a UI
 * presentation choice, not a sampling one) is 'linear'.
 *
 * Consumed by globalAudioSeed.ts (Task 5) to seed-generate the global FX
 * chain from the planet noise map.
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
  | 'chorus.rate'
  | 'chorus.depth'
  | 'chorus.delayTime'
  | 'chorus.feedback'
  | 'chorus.wet'
  | 'delay.delayTime'
  | 'delay.feedback'
  | 'delay.wet'
  | 'reverb.decay'
  | 'reverb.preDelay'
  | 'reverb.dampening'
  | 'reverb.wet';

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

  'chorus.rate': { min: 0.1, max: 10, scale: 'linear' },
  'chorus.depth': { min: 0, max: 1, scale: 'linear' },
  'chorus.delayTime': { min: 2, max: 20, scale: 'linear' },
  'chorus.feedback': { min: 0, max: 1, scale: 'linear' },
  'chorus.wet': { min: 0, max: 1, scale: 'linear' },

  'delay.delayTime': { min: 0, max: 1, scale: 'linear' },
  'delay.feedback': { min: 0, max: 0.95, scale: 'linear' },
  'delay.wet': { min: 0, max: 1, scale: 'linear' },

  'reverb.decay': { min: 0.1, max: 10, scale: 'log' },
  'reverb.preDelay': { min: 0, max: 0.5, scale: 'linear' },
  'reverb.dampening': { min: 100, max: 8000, scale: 'log' },
  'reverb.wet': { min: 0, max: 1, scale: 'linear' },
};
