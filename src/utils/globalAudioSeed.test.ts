// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, afterEach } from 'vitest';

import {
  generateGlobalAudioSettings,
  generateGlobalLfoSettings,
  scaleUnitValue,
  LFO_RATE_LOADING_MIN,
  LFO_RATE_LOADING_MAX,
  LFO_DEPTH_LOADING_MIN,
  LFO_DEPTH_LOADING_MAX,
} from './globalAudioSeed';
import { evictPlanetNoiseMap } from './noiseMaps';
import { GLOBAL_AUDIO_LOADING_RANGES } from '@/data/globalAudioLoadingRanges';
import { type GlobalAudioSeedFieldKey } from '@/data/globalAudioSeedRanges';
import { GLOBAL_LFO_TARGET_IDS, LFO_SHAPES, LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '@/types/lfo';

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
    expect(settings.delay).toBeDefined();
    expect(settings.reverb).toBeDefined();
    expect(settings.limiter).toBeDefined();
  });

  it('returns no chorus field and no reverb.dampening field', () => {
    const settings = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    expect('chorus' in settings).toBe(false);
    expect('dampening' in settings.reverb).toBe(false);
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

  it('keeps every sampled field within its narrower LOADING range, not just the wider full range', () => {
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
      'delay.delayTime': settings.delay.delayTime,
      'delay.feedback': settings.delay.feedback,
      'delay.wet': settings.delay.wet,
      'reverb.decay': settings.reverb.decay,
      'reverb.preDelay': settings.reverb.preDelay,
      'reverb.wet': settings.reverb.wet,
      'limiter.threshold': settings.limiter.threshold,
      // Stopgap — Task 2 reshaped lfoDrift to Record<DriftGroupId, ...> and
      // Task 3 gave each group its own key; Task 4 gives each group its own
      // independently-sampled value (all 4 currently share one draw).
      'lfoDrift.eq3.rateDrift': settings.lfoDrift.eq3.rateDrift,
      'lfoDrift.eq3.depthDrift': settings.lfoDrift.eq3.depthDrift,
      'lfoDrift.filterLPF.rateDrift': settings.lfoDrift.filterLPF.rateDrift,
      'lfoDrift.filterLPF.depthDrift': settings.lfoDrift.filterLPF.depthDrift,
      'lfoDrift.filterHPF.rateDrift': settings.lfoDrift.filterHPF.rateDrift,
      'lfoDrift.filterHPF.depthDrift': settings.lfoDrift.filterHPF.depthDrift,
      'lfoDrift.robots.rateDrift': settings.lfoDrift.robots.rateDrift,
      'lfoDrift.robots.depthDrift': settings.lfoDrift.robots.depthDrift,
    };
    for (const key of Object.keys(GLOBAL_AUDIO_LOADING_RANGES) as GlobalAudioSeedFieldKey[]) {
      const { min, max } = GLOBAL_AUDIO_LOADING_RANGES[key];
      expect(valueByKey[key], `${key} should be >= ${min}`).toBeGreaterThanOrEqual(min);
      expect(valueByKey[key], `${key} should be <= ${max}`).toBeLessThanOrEqual(max);
    }
  });

  it('does not seed globalBypass — it comes from DEFAULT_GLOBAL_AUDIO_SETTINGS unchanged', () => {
    const a = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    const b = generateGlobalAudioSettings('seed-test-planet-b', 'Zenith');
    expect(a.globalBypass).toBe(b.globalBypass);
  });

  it('seeds enabled: true unconditionally for every effect except delay', () => {
    // Two differently-seeded planets should agree on every non-delay effect's
    // `enabled` (always true) even though their numeric fields differ.
    const a = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    const b = generateGlobalAudioSettings('seed-test-planet-b', 'Zenith');
    expect(a.compressor.enabled).toBe(true);
    expect(a.eq3.enabled).toBe(true);
    expect(a.filterLPF.enabled).toBe(true);
    expect(a.filterHPF.enabled).toBe(true);
    expect(a.reverb.enabled).toBe(true);
    expect(a.limiter.enabled).toBe(true);
    expect(b.compressor.enabled).toBe(true);
    expect(b.eq3.enabled).toBe(true);
    expect(b.filterLPF.enabled).toBe(true);
    expect(b.filterHPF.enabled).toBe(true);
    expect(b.reverb.enabled).toBe(true);
    expect(b.limiter.enabled).toBe(true);
  });

  it('seeds delay.enabled true for roughly 1-in-4 planets, not roughly all or none (>= 0.75 threshold)', () => {
    const SAMPLE_PLANETS = 40;
    let enabledCount = 0;
    for (let i = 0; i < SAMPLE_PLANETS; i++) {
      const settings = generateGlobalAudioSettings(`seed-delay-sample-${i}`, `DelaySample${i}`);
      if (settings.delay.enabled) enabledCount++;
      evictPlanetNoiseMap(`seed-delay-sample-${i}`);
    }
    const enabledRate = enabledCount / SAMPLE_PLANETS;
    // ~25% expected; a wide tolerance band avoids flakiness while still
    // clearly distinguishing this from "always true" or "always false".
    expect(enabledRate).toBeGreaterThan(0.05);
    expect(enabledRate).toBeLessThan(0.5);
  });

  it('is deterministic for delay.enabled too — same planetId + planetName always agrees', () => {
    const first = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    const second = generateGlobalAudioSettings('seed-test-planet', 'Nova');
    expect(second.delay.enabled).toBe(first.delay.enabled);
  });

  describe('lfoDrift', () => {
    it('is deterministic — same planetId + planetName always produces the same lfoDrift', () => {
      const first = generateGlobalAudioSettings('seed-test-planet', 'Nova');
      const second = generateGlobalAudioSettings('seed-test-planet', 'Nova');
      expect(second.lfoDrift).toEqual(first.lfoDrift);
    });

    it('produces different lfoDrift values for a different planet name (non-degenerate)', () => {
      const a = generateGlobalAudioSettings('seed-test-planet', 'Nova');
      const b = generateGlobalAudioSettings('seed-test-planet-b', 'Zenith');
      expect(b.lfoDrift).not.toEqual(a.lfoDrift);
    });

    it('samples rateDrift and depthDrift independently, not the same draw for both', () => {
      // A shared draw fed into both fields would be an easy copy/paste bug —
      // this catches it directly rather than relying on the non-degenerate
      // check above, which would still pass if both fields moved in lockstep.
      const settings = generateGlobalAudioSettings('seed-test-planet', 'Nova');
      expect(settings.lfoDrift.robots.rateDrift).not.toBe(settings.lfoDrift.robots.depthDrift);
    });

    it('keeps both fields within the -0.4..0.4 loading range on every call, across many planets', () => {
      const SAMPLE_PLANETS = 20;
      for (let i = 0; i < SAMPLE_PLANETS; i++) {
        const settings = generateGlobalAudioSettings(`seed-drift-sample-${i}`, `DriftSample${i}`);
        const { rateDrift, depthDrift } = settings.lfoDrift.robots;
        expect(rateDrift, `planet ${i} rateDrift`).toBeGreaterThanOrEqual(-0.4);
        expect(rateDrift, `planet ${i} rateDrift`).toBeLessThanOrEqual(0.4);
        expect(depthDrift, `planet ${i} depthDrift`).toBeGreaterThanOrEqual(-0.4);
        expect(depthDrift, `planet ${i} depthDrift`).toBeLessThanOrEqual(0.4);
        evictPlanetNoiseMap(`seed-drift-sample-${i}`);
      }
    });

    it('actually produces both negative and positive values across many planets (non-degenerate)', () => {
      const SAMPLE_PLANETS = 20;
      let sawNegative = false;
      let sawPositive = false;
      for (let i = 0; i < SAMPLE_PLANETS; i++) {
        const settings = generateGlobalAudioSettings(`seed-drift-sign-${i}`, `DriftSign${i}`);
        if (settings.lfoDrift.robots.rateDrift < 0) sawNegative = true;
        if (settings.lfoDrift.robots.rateDrift > 0) sawPositive = true;
        evictPlanetNoiseMap(`seed-drift-sign-${i}`);
      }
      expect(sawNegative, 'expected at least one sampled planet with rateDrift < 0').toBe(true);
      expect(sawPositive, 'expected at least one sampled planet with rateDrift > 0').toBe(true);
    });
  });
});

describe('generateGlobalLfoSettings', () => {
  afterEach(() => {
    evictPlanetNoiseMap('seed-test-planet');
    evictPlanetNoiseMap('seed-test-planet-b');
    for (let i = 0; i < 40; i++) evictPlanetNoiseMap(`seed-lfo-sample-${i}`);
    for (let i = 0; i < 40; i++) evictPlanetNoiseMap(`seed-lfo-shape-${i}`);
  });

  it('returns a fully-populated record for all 8 GlobalLfoTargetIds', () => {
    const settings = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    expect(Object.keys(settings).sort()).toEqual([...GLOBAL_LFO_TARGET_IDS].sort());
  });

  it('is deterministic — same planetId + planetName always produces the same settings', () => {
    const first = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    const second = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    expect(second).toEqual(first);
  });

  it('is deterministic across a fresh noise map too, not just a cached one', () => {
    const first = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    evictPlanetNoiseMap('seed-test-planet');
    const second = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    expect(second).toEqual(first);
  });

  it('produces different values for a different planet name (non-degenerate)', () => {
    const a = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    const b = generateGlobalLfoSettings('seed-test-planet-b', 'Zenith');
    expect(b).not.toEqual(a);
  });

  it('samples rate/depth from their narrower loading range (1-4Hz, 20-50%), not the full LFO_RATE/DEPTH_MIN/MAX range', () => {
    const settings = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    for (const target of GLOBAL_LFO_TARGET_IDS) {
      const { rate, depth, shape } = settings[target];
      expect(rate, `${target}.rate`).toBeGreaterThanOrEqual(LFO_RATE_LOADING_MIN);
      expect(rate, `${target}.rate`).toBeLessThanOrEqual(LFO_RATE_LOADING_MAX);
      expect(depth, `${target}.depth`).toBeGreaterThanOrEqual(LFO_DEPTH_LOADING_MIN);
      expect(depth, `${target}.depth`).toBeLessThanOrEqual(LFO_DEPTH_LOADING_MAX);
      expect(LFO_SHAPES, `${target}.shape`).toContain(shape);
    }
  });

  it('the LFO rate/depth loading range is a genuine subset of the full LFO_RATE/DEPTH_MIN/MAX range', () => {
    expect(LFO_RATE_LOADING_MIN).toBeGreaterThanOrEqual(LFO_RATE_MIN);
    expect(LFO_RATE_LOADING_MAX).toBeLessThanOrEqual(LFO_RATE_MAX);
    expect(LFO_DEPTH_LOADING_MIN).toBeGreaterThanOrEqual(LFO_DEPTH_MIN);
    expect(LFO_DEPTH_LOADING_MAX).toBeLessThanOrEqual(LFO_DEPTH_MAX);
  });

  it('only ever seeds triangle or sine for shape, never square or sawtooth', () => {
    const SAMPLE_PLANETS = 40;
    for (let i = 0; i < SAMPLE_PLANETS; i++) {
      const settings = generateGlobalLfoSettings(`seed-lfo-shape-${i}`, `ShapeSample${i}`);
      for (const target of GLOBAL_LFO_TARGET_IDS) {
        expect(['triangle', 'sine'], `${target}.shape (planet ${i})`).toContain(settings[target].shape);
      }
    }
  });

  it('actually produces both triangle and sine across many planets, not always just one (non-degenerate)', () => {
    const SAMPLE_PLANETS = 40;
    const seenShapes = new Set<string>();
    for (let i = 0; i < SAMPLE_PLANETS; i++) {
      const settings = generateGlobalLfoSettings(`seed-lfo-shape-${i}`, `ShapeSample${i}`);
      for (const target of GLOBAL_LFO_TARGET_IDS) {
        seenShapes.add(settings[target].shape);
      }
    }
    expect(seenShapes).toEqual(new Set(['triangle', 'sine']));
  });

  it('seeds active as a real boolean for every target', () => {
    const settings = generateGlobalLfoSettings('seed-test-planet', 'Nova');
    for (const target of GLOBAL_LFO_TARGET_IDS) {
      expect(typeof settings[target].active).toBe('boolean');
    }
  });

  it('seeds active true for roughly 2-in-3 targets across many planets, not roughly half (>= 0.34 threshold, not a flat 50/50)', () => {
    const SAMPLE_PLANETS = 40;
    let activeCount = 0;
    let totalCount = 0;
    for (let i = 0; i < SAMPLE_PLANETS; i++) {
      const settings = generateGlobalLfoSettings(`seed-lfo-sample-${i}`, `Sample${i}`);
      for (const target of GLOBAL_LFO_TARGET_IDS) {
        totalCount++;
        if (settings[target].active) activeCount++;
      }
    }
    const activeRate = activeCount / totalCount;
    // ~66% expected; a wide tolerance band avoids flakiness while still
    // clearly distinguishing this from both a ~50% flat coin-flip and ~100%.
    expect(activeRate).toBeGreaterThan(0.5);
    expect(activeRate).toBeLessThan(0.8);
  });
});
