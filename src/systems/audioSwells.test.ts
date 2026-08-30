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
  VOLUME_SWELL_DOWNWARD_FLOOR,
} from './audioSwells';
import * as robotOptionsActions from './robotOptionsActions';
import { subscribeToMeasure } from '@/engine/beatClock';
import { getAttenuationStyleNoiseMap } from '@/utils/noiseMaps';
import { useAudioStore } from '@/stores/audioStore';
import { useLocaleStore } from '@/stores/localeStore';
import { AudioEngine } from '@/engine/AudioEngine';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

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

/** Mirrors robotOptionsActions.test.ts's own makeRobot fixture. Defaults to a
 *  single active layer (layer0/Baseline only) — layer1/layer2 absent, so
 *  every layer1.* / layer2.* attribute is ineligible by construction (no
 *  parent OscillatorLayer to be active), matching a real 1-layer robot. */
function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'r1',
    name: 'Test Robot',
    state: 'idle',
    position: { x: 0, y: 0 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: {
      adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
      filterFreq: 0,
      waveform: 'sine',
      layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }],
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 100,
    rhythmicDensity: 50,
    rhythmicMotifLength: { active: true, value: 8 },
    noteVariance: { active: false, value: 1 },
    ...overrides,
  } as Robot;
}

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
  useLocaleStore.getState().setLocaleData(LOCALE_ID, { robots: [] } as unknown as Partial<Locale>);
  // Real AudioEngine voice calls need a live Tone context this jsdom test
  // environment doesn't have — no-op them, matching robotOptionsActions.test.ts's
  // own established convention for these exact three methods.
  vi.spyOn(AudioEngine, 'updateRobotMasterVolume').mockImplementation(() => {});
  vi.spyOn(AudioEngine, 'updateVoiceLayerParams').mockImplementation(() => {});
  vi.spyOn(AudioEngine, 'updateVoiceEnvelope').mockImplementation(() => {});
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

// ========================================
// ROBOT POOL (Task 4 — single-robot swells)
// ========================================

describe('robot pool — trigger and selection', () => {
  it('starts a single-robot swell (one SwellMember) when the trigger draw succeeds', () => {
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot());
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN); // trigger succeeds; index 0 -> 'volume'

    tickAudioSwells(LOCALE_ID, 0);

    const snap = getActiveSwellSnapshot('robot');
    expect(snap).toHaveLength(1);
    expect(snap[0].robotAttribute).toBe('volume');
    expect(snap[0].members).toHaveLength(1);
    expect(snap[0].members![0].robotId).toBe('r1');
  });

  it('does not start a robot swell when the trigger draw lands well above the trigger chance', () => {
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot());
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MID); // draw = 0.5

    tickAudioSwells(LOCALE_ID, 0);

    expect(getActiveSwellSnapshot('robot')).toEqual([]);
  });

  it('fills its first 5 (=cap) picks with exactly volume + layer0\'s 4 continuous fields — layer0.phase reachable, an explicitly-present-but-inactive layer1 never picked', () => {
    const robot = makeRobot({
      audioAttributes: {
        adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
        filterFreq: 0,
        waveform: 'sine',
        layers: [
          { type: 'sine', gain: 1, detune: 0, phase: 0, active: true },
          { type: 'sine', gain: 1, detune: 0, phase: 0, active: false }, // present, inactive
        ],
      },
    });
    useLocaleStore.getState().addRobot(LOCALE_ID, robot);

    const picked = new Set<string>();
    for (let measure = 0; measure < 5; measure++) {
      vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN); // index 0 of the shrinking eligible list
      tickAudioSwells(LOCALE_ID, measure);
      for (const s of getActiveSwellSnapshot('robot')) picked.add(s.robotAttribute!);
    }

    expect([...picked].sort()).toEqual(
      ['volume', 'layer0.gain', 'layer0.detune', 'layer0.phase', 'layer0.pulseWidth'].sort()
    );
  });

  it('fills its first 5 (=cap) picks with exactly volume + all 4 ADSR fields when every layer is inactive', () => {
    const robot = makeRobot({
      audioAttributes: {
        adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
        filterFreq: 0,
        waveform: 'sine',
        layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: false }],
      },
    });
    useLocaleStore.getState().addRobot(LOCALE_ID, robot);

    const picked = new Set<string>();
    for (let measure = 0; measure < 5; measure++) {
      vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
      tickAudioSwells(LOCALE_ID, measure);
      for (const s of getActiveSwellSnapshot('robot')) picked.add(s.robotAttribute!);
    }

    expect([...picked].sort()).toEqual(['volume', 'adsr.attack', 'adsr.decay', 'adsr.sustain', 'adsr.release'].sort());
  });
});

describe('robot pool — Volume\'s downward-swell clamp', () => {
  it('clamps a downward Volume swell so it never lands below 50% of Volume\'s own range', () => {
    // masterVolume 0.9 is above the [0,1] midpoint -> direction picks down
    // automatically; the unclamped default rule alone would allow the peak
    // down to floor = max(0.9 - 0.5, 0) = 0.4, well below the 0.5 clamp.
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot({ masterVolume: 0.9 }));
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN); // index 0 -> 'volume'; peak draw -> its own floor (0.4, pre-clamp)

    tickAudioSwells(LOCALE_ID, 0);

    const swell = getActiveSwellSnapshot('robot').find((s) => s.robotAttribute === 'volume')!;
    const peak = swell.members![0].baseValue + swell.members![0].peakDelta;
    expect(peak).toBeGreaterThanOrEqual(VOLUME_SWELL_DOWNWARD_FLOOR);
  });

  it('leaves an upward Volume swell unaffected by the downward clamp', () => {
    // masterVolume 0.1 is below the midpoint -> direction picks up; floor =
    // min(0.1 + 0.5, 1) = 0.6, entirely above the downward-only clamp.
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot({ masterVolume: 0.1 }));
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);

    tickAudioSwells(LOCALE_ID, 0);

    const swell = getActiveSwellSnapshot('robot').find((s) => s.robotAttribute === 'volume')!;
    const peak = swell.members![0].baseValue + swell.members![0].peakDelta;
    expect(peak).toBeCloseTo(0.6);
  });
});

describe('robot pool — concurrency cap', () => {
  it('enforces the 5-cap across the whole roster (not per-robot) — a 6th robot swell does not start while 5 are active', () => {
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot());
    for (let i = 0; i < 5; i++) {
      vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
      tickAudioSwells(LOCALE_ID, i);
    }
    expect(getActiveSwellSnapshot('robot')).toHaveLength(MAX_CONCURRENT_SWELLS_PER_POOL);

    // measure 5 — inside every one of the 5 swells' own 6-measure (3+3) window.
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 5);
    expect(getActiveSwellSnapshot('robot')).toHaveLength(MAX_CONCURRENT_SWELLS_PER_POOL);
  });

  it('never blocks the global pool and is never blocked by it — independent caps', () => {
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot());
    for (let i = 0; i < 5; i++) {
      vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
      tickAudioSwells(LOCALE_ID, i); // fills the ROBOT pool to its cap
    }
    // Each of those same 5 ticks also independently rolls (and, under
    // ALWAYS_MIN, succeeds at) a global-pool attempt — proving the robot
    // pool's own cap being full didn't throttle the global pool at all: both
    // reach their own independent 5-cap from the very same 5 ticks.
    expect(getActiveSwellSnapshot('robot')).toHaveLength(MAX_CONCURRENT_SWELLS_PER_POOL);
    expect(getActiveSwellSnapshot('global')).toHaveLength(MAX_CONCURRENT_SWELLS_PER_POOL);
  });
});

describe('robot pool — ramp lifecycle and write path', () => {
  it('interpolates and returns to exactly baseValue on completion, removing the swell', () => {
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot({ masterVolume: 0.1 })); // up: floor 0.6, peak 0.6 via ALWAYS_MIN
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0); // creates the swell only

    tickAudioSwells(LOCALE_ID, 3); // falling phase's first tick -> value === peak
    expect(useLocaleStore.getState().getRobotById(LOCALE_ID, 'r1')!.masterVolume).toBeCloseTo(0.6);
    expect(getActiveSwellSnapshot('robot').some((s) => s.robotAttribute === 'volume')).toBe(true);

    tickAudioSwells(LOCALE_ID, 6); // falling completes
    expect(useLocaleStore.getState().getRobotById(LOCALE_ID, 'r1')!.masterVolume).toBe(0.1);
    expect(getActiveSwellSnapshot('robot').some((s) => s.robotAttribute === 'volume')).toBe(false);
  });

  it('writes a Volume swell through applyVolume, never a bare updateRobot/AudioEngine call', () => {
    const spy = vi.spyOn(robotOptionsActions, 'applyVolume');
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot({ masterVolume: 0.1 }));
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0);
    tickAudioSwells(LOCALE_ID, 1); // advance -> writes

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].id).toBe('r1');
  });

  it('writes a layer swell through applyLayersContinuous, never a bare updateRobot/AudioEngine call', () => {
    const spy = vi.spyOn(robotOptionsActions, 'applyLayersContinuous');
    useLocaleStore.getState().addRobot(LOCALE_ID, makeRobot());
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0); // picks 'volume' (index 0)
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 1); // 'volume' now excluded -> picks 'layer0.gain'
    tickAudioSwells(LOCALE_ID, 2); // advance -> writes

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].id).toBe('r1');
  });

  it('writes an ADSR swell through applyAdsr, never a bare updateRobot/AudioEngine call', () => {
    const spy = vi.spyOn(robotOptionsActions, 'applyAdsr');
    // layer0 inactive too (synthetic — Baseline is always active in the real
    // app) narrows the eligible pool to exactly volume + the 4 ADSR fields,
    // so excluding 'volume' alone (already-active) leaves adsr.attack as the
    // very next index-0 pick — no layer noise to walk past.
    useLocaleStore.getState().addRobot(
      LOCALE_ID,
      makeRobot({ audioAttributes: { adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 }, filterFreq: 0, waveform: 'sine', layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: false }] } })
    );
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 0); // picks 'volume'
    vi.mocked(getAttenuationStyleNoiseMap).mockReturnValueOnce(ALWAYS_MIN);
    tickAudioSwells(LOCALE_ID, 1); // 'volume' now excluded -> picks 'adsr.attack'
    tickAudioSwells(LOCALE_ID, 2); // advance -> writes

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].id).toBe('r1');
  });

  it('never calls useLocaleStore\'s updateRobot or an AudioEngine.updateVoice*/updateRobotMasterVolume method directly (source-scan regression guard)', () => {
    const thisFile = fileURLToPath(import.meta.url);
    const source = readFileSync(join(dirname(thisFile), 'audioSwells.ts'), 'utf-8');
    // Requires an actual call site (trailing paren) so a doc comment merely
    // NAMING one of these functions in prose (e.g. "never a bare
    // AudioEngine.updateVoice* pairing") doesn't trip this guard.
    expect(source).not.toMatch(/\.updateRobot\(/);
    expect(source).not.toMatch(/AudioEngine\.(updateVoice\w*|updateRobotMasterVolume)\(/);
  });
});
