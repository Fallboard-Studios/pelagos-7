// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { GLOBAL_AUDIO_SEED_RANGES } from './globalAudioSeedRanges';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';

// ========================================
// TESTS
// ========================================

// Every seedable field across all 7 global effects, per docs/specs/LFO_INTEGRATION.md
// Task 4 and the doc-comment ranges in src/types/globalAudio.ts. `enabled`, `type`,
// and `globalBypass` are excluded — they're not seeded (see spec §3/§7.2).
const EXPECTED_KEYS = [
  'compressor.threshold', 'compressor.ratio', 'compressor.attack', 'compressor.release', 'compressor.knee',
  'eq3.low', 'eq3.mid', 'eq3.high',
  'filterLPF.frequency', 'filterLPF.Q',
  'filterHPF.frequency', 'filterHPF.Q',
  'chorus.rate', 'chorus.depth', 'chorus.delayTime', 'chorus.feedback', 'chorus.wet',
  'delay.delayTime', 'delay.feedback', 'delay.wet',
  'reverb.decay', 'reverb.preDelay', 'reverb.dampening', 'reverb.wet',
] as const;

// Fields that GLOBAL_CHAIN_GRID.md's UI column marks "SLIDER (Logarithmic)" —
// everything else (including EQ's center-zero sliders) is linear.
const EXPECTED_LOG_KEYS = new Set([
  'compressor.attack', 'compressor.release',
  'filterLPF.frequency', 'filterLPF.Q',
  'filterHPF.frequency', 'filterHPF.Q',
  'reverb.decay', 'reverb.dampening',
]);

describe('GLOBAL_AUDIO_SEED_RANGES', () => {
  it('has an entry for every seedable field, and no extras', () => {
    expect(Object.keys(GLOBAL_AUDIO_SEED_RANGES).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it('matches the documented ranges in src/types/globalAudio.ts', () => {
    expect(GLOBAL_AUDIO_SEED_RANGES['compressor.threshold']).toMatchObject({ min: -60, max: 0 });
    expect(GLOBAL_AUDIO_SEED_RANGES['compressor.ratio']).toMatchObject({ min: 1, max: 20 });
    expect(GLOBAL_AUDIO_SEED_RANGES['compressor.attack']).toMatchObject({ min: 0.001, max: 1 });
    expect(GLOBAL_AUDIO_SEED_RANGES['compressor.release']).toMatchObject({ min: 0.01, max: 1 });
    expect(GLOBAL_AUDIO_SEED_RANGES['compressor.knee']).toMatchObject({ min: 0, max: 40 });
    expect(GLOBAL_AUDIO_SEED_RANGES['eq3.low']).toMatchObject({ min: -12, max: 12 });
    expect(GLOBAL_AUDIO_SEED_RANGES['eq3.mid']).toMatchObject({ min: -12, max: 12 });
    expect(GLOBAL_AUDIO_SEED_RANGES['eq3.high']).toMatchObject({ min: -12, max: 12 });
    expect(GLOBAL_AUDIO_SEED_RANGES['filterLPF.frequency']).toMatchObject({ min: 20, max: 20000 });
    expect(GLOBAL_AUDIO_SEED_RANGES['filterLPF.Q']).toMatchObject({ min: 0.1, max: 20 });
    expect(GLOBAL_AUDIO_SEED_RANGES['filterHPF.frequency']).toMatchObject({ min: 20, max: 20000 });
    expect(GLOBAL_AUDIO_SEED_RANGES['filterHPF.Q']).toMatchObject({ min: 0.1, max: 20 });
    expect(GLOBAL_AUDIO_SEED_RANGES['chorus.rate']).toMatchObject({ min: 0.1, max: 10 });
    expect(GLOBAL_AUDIO_SEED_RANGES['chorus.depth']).toMatchObject({ min: 0, max: 1 });
    expect(GLOBAL_AUDIO_SEED_RANGES['chorus.delayTime']).toMatchObject({ min: 2, max: 20 });
    expect(GLOBAL_AUDIO_SEED_RANGES['chorus.feedback']).toMatchObject({ min: 0, max: 1 });
    expect(GLOBAL_AUDIO_SEED_RANGES['chorus.wet']).toMatchObject({ min: 0, max: 1 });
    expect(GLOBAL_AUDIO_SEED_RANGES['delay.delayTime']).toMatchObject({ min: 0, max: 1 });
    expect(GLOBAL_AUDIO_SEED_RANGES['delay.feedback']).toMatchObject({ min: 0, max: 0.95 });
    expect(GLOBAL_AUDIO_SEED_RANGES['delay.wet']).toMatchObject({ min: 0, max: 1 });
    expect(GLOBAL_AUDIO_SEED_RANGES['reverb.decay']).toMatchObject({ min: 0.1, max: 10 });
    expect(GLOBAL_AUDIO_SEED_RANGES['reverb.preDelay']).toMatchObject({ min: 0, max: 0.5 });
    expect(GLOBAL_AUDIO_SEED_RANGES['reverb.dampening']).toMatchObject({ min: 100, max: 8000 });
    expect(GLOBAL_AUDIO_SEED_RANGES['reverb.wet']).toMatchObject({ min: 0, max: 1 });
  });

  it('marks only the GLOBAL_CHAIN_GRID.md-flagged fields as log-scaled', () => {
    for (const key of EXPECTED_KEYS) {
      const expectedScale = EXPECTED_LOG_KEYS.has(key) ? 'log' : 'linear';
      expect(GLOBAL_AUDIO_SEED_RANGES[key].scale, `${key} should be ${expectedScale}`).toBe(expectedScale);
    }
  });

  it('marks EQ3 bands linear despite being center-zero sliders', () => {
    // Center-zero is a UI presentation detail (0 in the middle), not a log/linear
    // sampling concern — worth asserting explicitly since it's the one field group
    // that could plausibly be miscategorized as log by analogy to frequency fields.
    expect(GLOBAL_AUDIO_SEED_RANGES['eq3.low'].scale).toBe('linear');
    expect(GLOBAL_AUDIO_SEED_RANGES['eq3.mid'].scale).toBe('linear');
    expect(GLOBAL_AUDIO_SEED_RANGES['eq3.high'].scale).toBe('linear');
  });

  it('never has min >= max for any field', () => {
    for (const key of EXPECTED_KEYS) {
      const { min, max } = GLOBAL_AUDIO_SEED_RANGES[key];
      expect(min, `${key}: min should be < max`).toBeLessThan(max);
    }
  });

  it('bounds every DEFAULT_GLOBAL_AUDIO_SETTINGS numeric value within its own range, inclusive', () => {
    // Cross-checks the two data sources against each other — catches drift if
    // either the defaults or the ranges are edited without the other. Inclusive
    // because filterLPF.frequency's default (20000) sits exactly at its own max.
    const defaults = DEFAULT_GLOBAL_AUDIO_SETTINGS;
    const valueByKey: Record<string, number> = {
      'compressor.threshold': defaults.compressor.threshold,
      'compressor.ratio': defaults.compressor.ratio,
      'compressor.attack': defaults.compressor.attack,
      'compressor.release': defaults.compressor.release,
      'compressor.knee': defaults.compressor.knee,
      'eq3.low': defaults.eq3.low,
      'eq3.mid': defaults.eq3.mid,
      'eq3.high': defaults.eq3.high,
      'filterLPF.frequency': defaults.filterLPF.frequency,
      'filterLPF.Q': defaults.filterLPF.Q,
      'filterHPF.frequency': defaults.filterHPF.frequency,
      'filterHPF.Q': defaults.filterHPF.Q,
      'chorus.rate': defaults.chorus.rate,
      'chorus.depth': defaults.chorus.depth,
      'chorus.delayTime': defaults.chorus.delayTime,
      'chorus.feedback': defaults.chorus.feedback,
      'chorus.wet': defaults.chorus.wet,
      'delay.delayTime': defaults.delay.delayTime,
      'delay.feedback': defaults.delay.feedback,
      'delay.wet': defaults.delay.wet,
      'reverb.decay': defaults.reverb.decay,
      'reverb.preDelay': defaults.reverb.preDelay,
      'reverb.dampening': defaults.reverb.dampening,
      'reverb.wet': defaults.reverb.wet,
    };
    for (const key of EXPECTED_KEYS) {
      const { min, max } = GLOBAL_AUDIO_SEED_RANGES[key];
      const value = valueByKey[key];
      expect(value, `${key} default should be >= its range min`).toBeGreaterThanOrEqual(min);
      expect(value, `${key} default should be <= its range max`).toBeLessThanOrEqual(max);
    }
  });
});
