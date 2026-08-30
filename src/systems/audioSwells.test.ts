// ========================================
// IMPORTS
// ========================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NoiseFunction2D } from 'simplex-noise';

vi.mock('@/engine/beatClock', () => ({
  subscribeToMeasure: vi.fn(() => vi.fn()),
  getCurrentMeasure: vi.fn(() => 0),
}));

// Wraps the REAL getAttenuationStyleNoiseMap by default (real, deterministic
// simplex noise — "prefer real implementations over mocks") so tests that
// don't care about forcing a specific draw still get genuine seeded
// determinism. Individual tests force a single draw via
// `.mockReturnValueOnce(...)`, which self-consumes and falls back to the
// real implementation on the next call — no manual restore needed.
vi.mock('@/utils/noiseMaps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/noiseMaps')>();
  return { ...actual, getAttenuationStyleNoiseMap: vi.fn(actual.getAttenuationStyleNoiseMap) };
});

import {
  startAudioSwells,
  stopAudioSwells,
  tickAudioSwells,
  getActiveSwellSnapshot,
  pickSwellPeakDelta,
  MAX_CONCURRENT_SWELLS_PER_POOL,
  DEFAULT_SWELL_DURATION_RANGE,
  MIX_SWELL_DURATION_RANGE,
} from './audioSwells';
import { subscribeToMeasure } from '@/engine/beatClock';
import { getAttenuationStyleNoiseMap } from '@/utils/noiseMaps';
import { useAudioStore } from '@/stores/audioStore';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';

// ========================================
// TEST HELPERS
// ========================================

/** Maps EVERY getSeededVal draw (any dataId/offset) to a fixed fraction of
 *  whatever [min, max] that particular call passes: raw -1 -> min, 0 ->
 *  midpoint, 1 -> max. Matches spawnSystem.test.ts's deterministicNoiseMap
 *  convention, generalized to any fixed raw value. */
function constantNoiseMap(raw: number): NoiseFunction2D {
  return () => raw;
}
const ALWAYS_MIN = constantNoiseMap(-1);
const ALWAYS_MID = constantNoiseMap(0);
const ALWAYS_MAX = constantNoiseMap(1);

const LOCALE_ID = 'pelagos-default';

function enableAllGlobalEffects(): void {
  useAudioStore.setState((s) => ({
    globalAudio: {
      ...s.globalAudio,
      eq3: { ...s.globalAudio.eq3, enabled: true },
      filterLPF: { ...s.globalAudio.filterLPF, enabled: true },
      filterHPF: { ...s.globalAudio.filterHPF, enabled: true },
      delay: { ...s.globalAudio.delay, enabled: true },
      reverb: { ...s.globalAudio.reverb, enabled: true },
    },
  }));
}

beforeEach(() => {
  vi.mocked(getAttenuationStyleNoiseMap).mockClear();
  stopAudioSwells(); // idempotent — clears any leftover activeSwells + subscription state
  useAudioStore.setState({ globalAudio: { ...DEFAULT_GLOBAL_AUDIO_SETTINGS } });
  enableAllGlobalEffects();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ========================================
// TESTS
// ========================================

describe('startAudioSwells / stopAudioSwells', () => {
  it('subscribes exactly once to BeatClock measure ticks', () => {
    startAudioSwells(LOCALE_ID);
    expect(subscribeToMeasure).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — a second start call does not double-subscribe', () => {
    startAudioSwells(LOCALE_ID);
    startAudioSwells(LOCALE_ID);
    expect(subscribeToMeasure).toHaveBeenCalledTimes(1);
  });

  it('stop is idempotent — a second stop call does not throw or unsubscribe twice', () => {
    const unsubscribe = vi.fn();
    vi.mocked(subscribeToMeasure).mockReturnValueOnce(unsubscribe);
    startAudioSwells(LOCALE_ID);
    stopAudioSwells();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(() => stopAudioSwells()).not.toThrow();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('clears all in-flight swells — a fresh start begins from zero active swells', () => {
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0);
    expect(getActiveSwellSnapshot('global').length).toBeGreaterThan(0);

    stopAudioSwells();
    expect(getActiveSwellSnapshot('global')).toEqual([]);
  });
});

describe('trigger gating (SWELL_TRIGGER_CHANCE)', () => {
  it('does not start a swell when the seeded trigger draw lands well above the trigger chance', () => {
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MID); // draw = 0.5
    tickAudioSwells(LOCALE_ID, 10);
    expect(getActiveSwellSnapshot('global')).toEqual([]);
  });

  it('starts a swell when the seeded trigger draw lands at the bottom of the range', () => {
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN); // draw = 0
    tickAudioSwells(LOCALE_ID, 10);
    expect(getActiveSwellSnapshot('global')).toHaveLength(1);
  });
});

describe('eligibility', () => {
  it('never picks a target belonging to a disabled effect — first eligible becomes lpf.frequency when eq3 is disabled', () => {
    useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, eq3: { ...s.globalAudio.eq3, enabled: false } } }));
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 3);
    const targets = getActiveSwellSnapshot('global').map((s) => s.globalTarget);
    expect(targets).toEqual(['lpf.frequency']);
  });

  it('excludes a target already mid-swell from being picked again — a second forced trigger picks the next eligible target', () => {
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 1); // picks eq3.low (index 0, all enabled)
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 2); // eq3.low now excluded -> picks eq3.mid
    const targets = getActiveSwellSnapshot('global').map((s) => s.globalTarget).sort();
    expect(targets).toEqual(['eq3.low', 'eq3.mid']);
  });
});

describe('concurrency cap', () => {
  it('enforces the 5-cap — a 6th global swell does not start while 5 are already active', () => {
    for (let i = 0; i < 5; i++) {
      vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
      tickAudioSwells(LOCALE_ID, i);
    }
    expect(getActiveSwellSnapshot('global')).toHaveLength(MAX_CONCURRENT_SWELLS_PER_POOL);

    // measure 5 — still well inside every one of the 5 swells' own window (each
    // totals rising(3)+falling(3)=6 measures, started at measures 0-4, so none
    // completes before measure 6); a measure far enough out that they've all
    // auto-completed and freed the cap would prove nothing about the cap itself.
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 5);
    expect(getActiveSwellSnapshot('global')).toHaveLength(MAX_CONCURRENT_SWELLS_PER_POOL);
  });
});

describe('ramp lifecycle', () => {
  it('has phase "rising" then "falling" only — the tick right after risingMeasures elapses is already falling, no hold tick', () => {
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0); // eq3.low: base 0, peak 12, rising 3, falling 3 (all draws forced to their floor)

    let snap = getActiveSwellSnapshot('global').find((s) => s.globalTarget === 'eq3.low')!;
    expect(snap.phase).toBe('rising');

    tickAudioSwells(LOCALE_ID, 2); // elapsed 2 < rising 3 -> still rising
    snap = getActiveSwellSnapshot('global').find((s) => s.globalTarget === 'eq3.low')!;
    expect(snap.phase).toBe('rising');

    tickAudioSwells(LOCALE_ID, 3); // elapsed 3 >= rising 3 -> already falling
    snap = getActiveSwellSnapshot('global').find((s) => s.globalTarget === 'eq3.low')!;
    expect(snap.phase).toBe('falling');
  });

  it('interpolates during rising/falling and returns to exactly baseValue on completion, removing the swell', () => {
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0); // eq3.low: base 0, peak 12, rising 3, falling 3

    tickAudioSwells(LOCALE_ID, 3); // falling phase's first tick — progress 0 -> value === peak
    expect(useAudioStore.getState().globalAudio.eq3.low).toBeCloseTo(12);
    expect(getActiveSwellSnapshot('global').some((s) => s.globalTarget === 'eq3.low')).toBe(true);

    tickAudioSwells(LOCALE_ID, 6); // falling completes
    expect(useAudioStore.getState().globalAudio.eq3.low).toBe(0);
    expect(getActiveSwellSnapshot('global').some((s) => s.globalTarget === 'eq3.low')).toBe(false);
  });

  it('cancels a swell immediately and snaps back to base when its effect is disabled mid-swell', () => {
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0); // starts eq3.low
    expect(getActiveSwellSnapshot('global').some((s) => s.globalTarget === 'eq3.low')).toBe(true);

    useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, eq3: { ...s.globalAudio.eq3, enabled: false } } }));

    tickAudioSwells(LOCALE_ID, 1); // mid-swell, now disabled
    expect(useAudioStore.getState().globalAudio.eq3.low).toBe(0);
    expect(getActiveSwellSnapshot('global').some((s) => s.globalTarget === 'eq3.low')).toBe(false);
  });

  it('writes every value via useAudioStore.getState().setGlobalAudio, never a bare AudioEngine call', () => {
    const spy = vi.spyOn(useAudioStore.getState(), 'setGlobalAudio');
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0); // creation tick — no write yet
    tickAudioSwells(LOCALE_ID, 2); // advance tick — writes the interpolated value

    expect(spy).toHaveBeenCalledWith('eq3', expect.objectContaining({ low: expect.any(Number) }));
  });
});

describe('duration ranges (full pipeline, real seeded noise)', () => {
  it('draws risingMeasures/fallingMeasures independently, within [3,6] for non-mix targets and [6,12] for delay.wet/reverb.wet', () => {
    const samples: { target: string; rising: number; falling: number }[] = [];
    for (let measure = 0; measure < 300 && samples.length < MAX_CONCURRENT_SWELLS_PER_POOL; measure++) {
      tickAudioSwells(LOCALE_ID, measure);
      for (const swell of getActiveSwellSnapshot('global')) {
        if (!samples.some((s) => s.target === swell.globalTarget)) {
          samples.push({ target: swell.globalTarget!, rising: swell.risingMeasures, falling: swell.fallingMeasures });
        }
      }
    }

    expect(samples.length).toBeGreaterThan(0);
    for (const { target, rising, falling } of samples) {
      const isMix = target === 'delay.wet' || target === 'reverb.wet';
      const range = isMix ? MIX_SWELL_DURATION_RANGE : DEFAULT_SWELL_DURATION_RANGE;
      expect(rising, `${target} rising`).toBeGreaterThanOrEqual(range.min);
      expect(rising, `${target} rising`).toBeLessThanOrEqual(range.max);
      expect(falling, `${target} falling`).toBeGreaterThanOrEqual(range.min);
      expect(falling, `${target} falling`).toBeLessThanOrEqual(range.max);
    }
    // Independence: real 2D noise sampled at two different x-coordinates
    // (different dataId strings) essentially never ties exactly.
    expect(samples.some((s) => s.rising !== s.falling)).toBe(true);
  });
});

describe('determinism and zero Math.random()', () => {
  it('never calls Math.random() anywhere in this module (source-scan regression guard)', () => {
    const thisFile = fileURLToPath(import.meta.url);
    const source = readFileSync(join(dirname(thisFile), 'audioSwells.ts'), 'utf-8');
    expect(source).not.toMatch(/Math\.random/);
  });

  it('two identical ticks (same store state, same measure, real seeded noise) produce identical trigger/target/direction/duration decisions', () => {
    const runOnce = () => {
      stopAudioSwells();
      useAudioStore.setState({ globalAudio: { ...DEFAULT_GLOBAL_AUDIO_SETTINGS } });
      enableAllGlobalEffects();
      tickAudioSwells(LOCALE_ID, 17);
      return { snapshot: getActiveSwellSnapshot('global'), audio: { ...useAudioStore.getState().globalAudio } };
    };

    const first = runOnce();
    const second = runOnce();

    expect(second.snapshot).toEqual(first.snapshot);
    expect(second.audio).toEqual(first.audio);
  });
});

describe('pickSwellPeakDelta — direction & magnitude rule (spec §1.5)', () => {
  it('swells up, landing in [83%, 100%] of range, for a field at 33% of its range', () => {
    const range = { min: 0, max: 100 };
    const current = 33;
    const delta = pickSwellPeakDelta(ALWAYS_MIN, 'test.key', 0, range, current);
    const peak = current + delta;
    expect(peak).toBeGreaterThanOrEqual(83);
    expect(peak).toBeLessThanOrEqual(100);
  });

  it('swells down, landing in [0%, 20%] of range, for a field at 70% of its range', () => {
    const range = { min: 0, max: 100 };
    const current = 70;
    const delta = pickSwellPeakDelta(ALWAYS_MIN, 'test.key', 0, range, current);
    const peak = current + delta;
    expect(peak).toBeGreaterThanOrEqual(0);
    expect(peak).toBeLessThanOrEqual(20);
  });

  it('can land either direction when exactly at the midpoint (seeded coin-flip tie-break)', () => {
    const range = { min: 0, max: 100 };
    const current = 50;
    const upDelta = pickSwellPeakDelta(ALWAYS_MIN, 'test.key', 0, range, current);
    const downDelta = pickSwellPeakDelta(ALWAYS_MAX, 'test.key', 0, range, current);
    expect(current + upDelta).toBeGreaterThan(current);
    expect(current + downDelta).toBeLessThan(current);
  });

  it('never produces a peak outside the field\'s own [min, max] range', () => {
    const range = { min: -50, max: 50 };
    for (const current of [-50, -25, 0, 25, 50]) {
      for (const noiseMap of [ALWAYS_MIN, ALWAYS_MID, ALWAYS_MAX]) {
        const delta = pickSwellPeakDelta(noiseMap, 'test.key', 0, range, current);
        const peak = current + delta;
        expect(peak).toBeGreaterThanOrEqual(range.min);
        expect(peak).toBeLessThanOrEqual(range.max);
      }
    }
  });
});
