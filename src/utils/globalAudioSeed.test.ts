// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, afterEach } from 'vitest';

import { generateGlobalAudioSettings, scaleUnitValue } from './globalAudioSeed';
import { evictPlanetNoiseMap } from './noiseMaps';
import { GLOBAL_AUDIO_SEED_RANGES, type GlobalAudioSeedFieldKey } from '@/data/globalAudioSeedRanges';

// ========================================
// TESTS
// ========================================

describe('scaleUnitValue', () => {
  it('maps t=0 to min and t=1 to max, for both scales', () => {
    expect(scaleUnitValue(0, { min: 20, max: 20000, scale: 'log' })).toBe(20);
    expect(scaleUnitValue(1, { min: 20, max: 20000, scale: 'log' })).toBe(20000);
    expect(scaleUnitValue(0, { min: -60, max: 0, scale: 'linear' })).toBe(-60);
    expect(scaleUnitValue(1, { min: -60, max: 0, scale: 'linear' })).toBe(0);
  });

  it('interpolates linear fields arithmetically at t=0.5', () => {
    expect(scaleUnitValue(0.5, { min: -12, max: 12, scale: 'linear' })).toBe(0);
  });

  it('interpolates log fields geometrically at t=0.5, not arithmetically', () => {
    // Geometric mean of 20 and 20000 is sqrt(20 * 20000) ≈ 632.46 — nowhere
    // near the linear midpoint of 10010. This is the concrete proof that log
    // fields are NOT sampled the same way as linear ones.
    const result = scaleUnitValue(0.5, { min: 20, max: 20000, scale: 'log' });
    expect(result).toBeCloseTo(Math.sqrt(20 * 20000), 5);
    expect(result).toBeLessThan(1000); // far below the linear midpoint (10010)
  });

  it('clamps out-of-range t instead of extrapolating', () => {
    expect(scaleUnitValue(-0.5, { min: 0, max: 1, scale: 'linear' })).toBe(0);
    expect(scaleUnitValue(1.5, { min: 0, max: 1, scale: 'linear' })).toBe(1);
  });
});

describe('generateGlobalAudioSettings', () => {
  afterEach(() => {
    evictPlanetNoiseMap('seed-test-planet');
    evictPlanetNoiseMap('seed-test-planet-b');
  });

  it('returns a fully-populated GlobalAudioSettings', () => {
    const settings = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    expect(settings.compressor).toBeDefined();
    expect(settings.eq3).toBeDefined();
    expect(settings.filterLPF).toBeDefined();
    expect(settings.filterHPF).toBeDefined();
    expect(settings.chorus).toBeDefined();
    expect(settings.delay).toBeDefined();
    expect(settings.reverb).toBeDefined();
  });

  it('fixes filterLPF/filterHPF type to their identity, not seeded', () => {
    const settings = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    expect(settings.filterLPF.type).toBe('lowpass');
    expect(settings.filterHPF.type).toBe('highpass');
  });

  it('is deterministic — same planetId + planetName always produces the same settings', () => {
    const first = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    const second = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    expect(second).toEqual(first);
  });

  it('is deterministic across a fresh noise map too, not just a cached one', () => {
    const first = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    evictPlanetNoiseMap('seed-test-planet');
    const second = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    expect(second).toEqual(first);
  });

  it('produces different values for a different planet name (non-degenerate)', () => {
    const a = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    const b = generateGlobalAudioSettings('seed-test-planet-b', 'Zenith');
    expect(b).not.toEqual(a);
  });

  it('keeps every field within its documented range', () => {
    const settings = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    const valueByKey: Record<GlobalAudioSeedFieldKey, number> = {
      'compressor.threshold': settings.compressor.threshold,
      'compressor.ratio': settings.compressor.ratio,
      'compressor.attack': settings.compressor.attack,
      'compressor.release': settings.compressor.release,
      'compressor.knee': settings.compressor.knee,
      'eq3.low': settings.eq3.low,
      'eq3.mid': settings.eq3.mid,
      'eq3.high': settings.eq3.high,
      'filterLPF.frequency': settings.filterLPF.frequency,
      'filterLPF.Q': settings.filterLPF.Q,
      'filterHPF.frequency': settings.filterHPF.frequency,
      'filterHPF.Q': settings.filterHPF.Q,
      'chorus.rate': settings.chorus.rate,
      'chorus.depth': settings.chorus.depth,
      'chorus.delayTime': settings.chorus.delayTime,
      'chorus.feedback': settings.chorus.feedback,
      'chorus.wet': settings.chorus.wet,
      'delay.delayTime': settings.delay.delayTime,
      'delay.feedback': settings.delay.feedback,
      'delay.wet': settings.delay.wet,
      'reverb.decay': settings.reverb.decay,
      'reverb.preDelay': settings.reverb.preDelay,
      'reverb.dampening': settings.reverb.dampening,
      'reverb.wet': settings.reverb.wet,
    };
    for (const key of Object.keys(GLOBAL_AUDIO_SEED_RANGES) as GlobalAudioSeedFieldKey[]) {
      const { min, max } = GLOBAL_AUDIO_SEED_RANGES[key];
      expect(valueByKey[key], `${key} should be >= ${min}`).toBeGreaterThanOrEqual(min);
      expect(valueByKey[key], `${key} should be <= ${max}`).toBeLessThanOrEqual(max);
    }
  });

  it('does not seed the enabled/globalBypass flags — they come from DEFAULT_GLOBAL_AUDIO_SETTINGS', () => {
    // Task 6 forces every effect's `enabled` to true; this task only needs to
    // NOT randomize it. Two different planets should agree on `enabled` even
    // though their numeric fields differ.
    const a = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    const b = generateGlobalAudioSettings('seed-test-planet-b', 'Zenith');
    expect(a.globalBypass).toBe(b.globalBypass);
    expect(a.reverb.enabled).toBe(b.reverb.enabled);
    expect(a.compressor.enabled).toBe(b.compressor.enabled);
  });
});
