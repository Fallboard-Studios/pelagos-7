/**
 * Narrower per-field seed-sampling sub-ranges — bounds what a FRESH SEED can
 * roll, never what the UI exposes or what the app can do.
 * GLOBAL_AUDIO_SEED_RANGES (globalAudioSeedRanges.ts) stays the full/UI-
 * matching range and is what lfoEngine.ts's resolveLfoOutputRange keeps
 * using — never this table. An LFO modulating a parameter needs to swing
 * across that parameter's entire usable range, not just the narrower window
 * a fresh planet is allowed to start in.
 *
 * Values are a direct transcription of docs/reference/GLOBAL_CHAIN_GRID.md's
 * "Loading Range" column — that doc is the source of truth; this file
 * mirrors it, it doesn't decide it. If a value here and the grid ever
 * disagree, the grid is right and this file has drifted.
 */
import type { GlobalAudioSeedFieldKey } from './globalAudioSeedRanges';

export interface LoadingRange {
  min: number;
  max: number;
}

export const GLOBAL_AUDIO_LOADING_RANGES: Record<GlobalAudioSeedFieldKey, LoadingRange> = {
  'eq3.low': { min: -6, max: 6 },
  'eq3.mid': { min: -6, max: 6 },
  'eq3.high': { min: -6, max: 6 },

  'filterLPF.frequency': { min: 2000, max: 20000 },
  'filterLPF.Q': { min: 0.1, max: 5 },
  'filterHPF.frequency': { min: 20, max: 500 },
  'filterHPF.Q': { min: 0.1, max: 5 },

  'delay.delayTime': { min: 0.05, max: 0.5 },
  'delay.feedback': { min: 0, max: 0.4 },
  'delay.wet': { min: 0, max: 0.3 },

  'reverb.decay': { min: 0.5, max: 4 },
  'reverb.preDelay': { min: 0, max: 0.1 },
  'reverb.wet': { min: 0.1, max: 0.4 },

  'compressor.threshold': { min: -55, max: -45 },
  'compressor.ratio': { min: 10, max: 20 },
  'compressor.attack': { min: 0.003, max: 0.05 },
  'compressor.release': { min: 0.05, max: 0.3 },
  'compressor.knee': { min: 1, max: 15 },

  'limiter.threshold': { min: -3, max: -1 },

  // First-pass defaults, NOT a GLOBAL_CHAIN_GRID.md transcription — that doc
  // predates lfoDrift entirely (docs/specs/LFO_DRIFT.md §7). Same window
  // carried forward unchanged per group into docs/specs/LFO_DRIFT_GROUPS.md;
  // confirm it still reads as "subtly alive" per group during that feature's
  // manual/audible check, now that all 4 roll independently.
  'lfoDrift.eq3.rateDrift': { min: -0.4, max: 0.4 },
  'lfoDrift.eq3.depthDrift': { min: -0.4, max: 0.4 },
  'lfoDrift.filterLPF.rateDrift': { min: -0.4, max: 0.4 },
  'lfoDrift.filterLPF.depthDrift': { min: -0.4, max: 0.4 },
  'lfoDrift.filterHPF.rateDrift': { min: -0.4, max: 0.4 },
  'lfoDrift.filterHPF.depthDrift': { min: -0.4, max: 0.4 },
  'lfoDrift.robots.rateDrift': { min: -0.4, max: 0.4 },
  'lfoDrift.robots.depthDrift': { min: -0.4, max: 0.4 },
};
