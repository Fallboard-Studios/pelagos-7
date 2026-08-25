import { describe, it, expect, beforeEach, vi } from 'vitest';

// ========================================
// MOCKS
// ========================================
// Mutable so individual tests can flip transport/context state without
// re-mocking per test.
let mockTransportState: 'started' | 'stopped' = 'stopped';
// start() gates on the AudioContext itself being 'running', not Transport
// state — the Transport can still be mid-startup (loading instruments,
// waiting on reverb) well after Tone.start() has already made the context
// running, and gating on Transport left a real window where an LFO could
// connect to a live target but never actually start oscillating, stuck
// forever outputting Tone.LFO's raw, undepth-scaled "stopped" value.
let mockContextState: 'running' | 'suspended' = 'suspended';

// Tags a fakeParam() object as "Param-like" for the mocked LFO.connect()
// below, independent of whatever plain properties our own production code
// happens to assign onto the object (a Symbol key can't collide with the
// string-keyed `.override` our fix writes onto every resolved signal).
const fakeParamMarker = Symbol('fakeParamMarker');

vi.mock('tone', () => ({
  LFO: vi.fn((frequency?: number) => {
    const instance = {
      frequency: { value: frequency ?? 1 },
      amplitude: { value: 1 },
      type: 'sine',
      min: 0, // Tone.LFO's real default (LFO.getDefaults())
      max: 1, // Tone.LFO's real default — modulating a target with these left unset is functionally inaudible
      start: vi.fn(),
      stop: vi.fn(),
      // Faithfully mirrors Tone.js's own connectSignal() (verified against
      // signal/Signal.ts): a Tone.Param destination is ALWAYS reset to 0 the
      // instant something connects to it, regardless of any `override`
      // property (Param has no such concept — connectSignal's real check is
      // `instanceof Param`, not a property value); a Tone.Signal destination
      // is reset only while its own `override` flag (default true) is still
      // true. fakeParamMarker identifies a "Param-like" fake independent of
      // whatever plain properties our own code happens to assign onto it
      // (e.g. our fix below deliberately writes `.override = false` onto
      // EVERY resolved signal, Param-shaped or not — that write must not be
      // able to fool this simulation into skipping the Param reset).
      connect: vi.fn((dest: unknown) => {
        if (dest && typeof dest === 'object' && 'value' in dest) {
          const d = dest as { value: number; override?: boolean };
          const isParamLike = fakeParamMarker in (d as object);
          if (isParamLike || d.override !== false) {
            d.value = 0;
          }
        }
        return instance;
      }),
      disconnect: vi.fn(),
      dispose: vi.fn(),
    };
    return instance;
  }),
  getTransport: vi.fn(() => ({ get state() { return mockTransportState; } })),
  getContext: vi.fn(() => ({ get state() { return mockContextState; } })),
  now: vi.fn(() => mockToneNow),
}));

vi.mock('./AudioEngine', () => ({
  AudioEngine: {
    getRobotModulationTarget: vi.fn(),
    getGlobalModulationTarget: vi.fn(),
    updateVoiceLayerParams: vi.fn(),
  },
}));

// Shares captured schedule callbacks between the hoisted beatClock mock
// factory and test bodies, so a test can manually fire a "tick" — this is
// the "mocked LFO ticks" mechanism the phase-fallback tests need, since the
// real scheduleRepeat only actually fires once a real transport is running.
const { scheduleCallbacks, mockScheduleRepeat, mockCancelSchedule } = vi.hoisted(() => {
  const callbacks = new Map<string, () => void>();
  let counter = 0;
  return {
    scheduleCallbacks: callbacks,
    mockScheduleRepeat: (_interval: string, callback: () => void): string => {
      const id = `mock-schedule-${counter++}`;
      callbacks.set(id, callback);
      return id;
    },
    mockCancelSchedule: (id: string): void => {
      callbacks.delete(id);
    },
  };
});

vi.mock('./beatClock', () => ({
  scheduleRepeat: vi.fn(mockScheduleRepeat),
  cancelSchedule: vi.fn(mockCancelSchedule),
}));

let mockToneNow = 0;

// ========================================
// HELPERS
// ========================================
// NOTE: the 'tone' mock is hoisted once for this whole file — vi.resetModules()
// in beforeEach gives lfoEngine.ts a fresh module instance (fresh internal
// Maps), but Tone.LFO's own mock.calls/mock.results keep accumulating across
// every test in the file (same constraint AudioEngine.test.ts documents and
// works around with `.at(-1)`/`.at(-2)`). So: assert call-count *deltas*
// around an action, and grab the most-recently-constructed instance via
// `.at(-1)`, never an absolute count or `[0]`.

/** Shape of the mocked Tone.LFO instance above — enough to assert against, not the real Tone.LFO type. */
interface MockLfoInstance {
  frequency: { value: number };
  amplitude: { value: number };
  type: string;
  min: number;
  max: number;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

async function callCountDelta(action: () => void): Promise<number> {
  const Tone = await import('tone');
  const before = (Tone.LFO as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
  action();
  const after = (Tone.LFO as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
  return after - before;
}

async function latestLfoInstance(): Promise<MockLfoInstance> {
  const Tone = await import('tone');
  return (Tone.LFO as unknown as ReturnType<typeof vi.fn>).mock.results.at(-1)!.value;
}

/** A minimal fake Signal-like object, distinct per call so tests can assert
 * connect() received the right one. `override` defaults to `true`, matching
 * Tone.Signal's own real default (verified against Tone's source). */
function fakeSignal(value = 0): { value: number; override: boolean } {
  return { value, override: true };
}

/** A minimal fake Param-like object — deliberately no `override` field at
 * all, matching Tone.Param's real shape (unlike Tone.Signal, Param has no
 * such property), tagged with fakeParamMarker so the mocked LFO.connect()
 * above can tell the two destination shapes apart and simulate each one's
 * real reset behavior, even after our own code writes a plain `.override`
 * property onto it. */
function fakeParam(value = 0): { value: number; [fakeParamMarker]: true } {
  return { value, [fakeParamMarker]: true };
}

// ========================================
// TESTS
// ========================================

describe('lfoEngine', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockTransportState = 'stopped';
    mockContextState = 'suspended';
    mockToneNow = 0;
    scheduleCallbacks.clear();
  });

  describe('lazy instantiation', () => {
    it('does not construct a Tone.LFO on module load', async () => {
      const Tone = await import('tone');
      const before = (Tone.LFO as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
      await import('./lfoEngine'); // the action under test: importing the module itself
      const after = (Tone.LFO as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(after).toBe(before);
    });

    it('does not construct a Tone.LFO when only reading settings', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      const delta = await callCountDelta(() => {
        lfoEngine.getLfoSettings('volume');
        lfoEngine.getLfoSettings('eq3.low', undefined);
      });
      expect(delta).toBe(0);
    });

    it('constructs exactly one Tone.LFO on the first setter call for a given target', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      const delta = await callCountDelta(() => {
        lfoEngine.setLfoRate('volume', 2);
      });
      expect(delta).toBe(1);
    });

    it('reuses the same Tone.LFO instance across multiple setter calls for the same target', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      const delta = await callCountDelta(() => {
        lfoEngine.setLfoRate('volume', 2);
        lfoEngine.setLfoDepth('volume', 50);
        lfoEngine.setLfoShape('volume', 'square');
      });
      expect(delta).toBe(1); // only the first setter call constructs; the other two reuse it
    });
  });

  describe('getLfoSettings', () => {
    it('returns DEFAULT_LFO_SETTINGS for a target with no explicit settings yet', async () => {
      const { DEFAULT_LFO_SETTINGS } = await import('../data/lfoConfig');
      const { lfoEngine } = await import('./lfoEngine');
      expect(lfoEngine.getLfoSettings('layer0.gain')).toEqual(DEFAULT_LFO_SETTINGS['layer0.gain']);
    });

    it('reflects a previously-set rate/depth/shape', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('hpf.Q', 3);
      lfoEngine.setLfoDepth('hpf.Q', 75);
      lfoEngine.setLfoShape('hpf.Q', 'square');
      expect(lfoEngine.getLfoSettings('hpf.Q')).toEqual({ shape: 'square', rate: 3, depth: 75 });
    });
  });

  describe('setLfoRate', () => {
    it('updates both the persisted settings and the live node\'s frequency', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 4);
      expect(lfoEngine.getLfoSettings('volume').rate).toBe(4);
      expect((await latestLfoInstance()).frequency.value).toBe(4);
    });

    it('sets the raw Hz value directly — no Time-string/BeatClock conversion involved', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 2.5);
      expect((await latestLfoInstance()).frequency.value).toBe(2.5);
    });

    it('clamps below LFO_RATE_MIN', async () => {
      const { LFO_RATE_MIN } = await import('../types/lfo');
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 0);
      expect(lfoEngine.getLfoSettings('volume').rate).toBe(LFO_RATE_MIN);
    });

    it('clamps above LFO_RATE_MAX', async () => {
      const { LFO_RATE_MAX } = await import('../types/lfo');
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 999);
      expect(lfoEngine.getLfoSettings('volume').rate).toBe(LFO_RATE_MAX);
    });
  });

  describe('setLfoDepth', () => {
    it('updates both the persisted settings and the live node\'s amplitude (depth / 100)', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoDepth('volume', 40);
      expect(lfoEngine.getLfoSettings('volume').depth).toBe(40);
      expect((await latestLfoInstance()).amplitude.value).toBeCloseTo(0.4);
    });

    it('clamps below LFO_DEPTH_MIN', async () => {
      const { LFO_DEPTH_MIN } = await import('../types/lfo');
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoDepth('volume', -10);
      expect(lfoEngine.getLfoSettings('volume').depth).toBe(LFO_DEPTH_MIN);
    });

    it('clamps above LFO_DEPTH_MAX', async () => {
      const { LFO_DEPTH_MAX } = await import('../types/lfo');
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoDepth('volume', 500);
      expect(lfoEngine.getLfoSettings('volume').depth).toBe(LFO_DEPTH_MAX);
    });
  });

  describe('setLfoShape', () => {
    it('updates both the persisted settings and the live node\'s type', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoShape('volume', 'sawtooth');
      expect(lfoEngine.getLfoSettings('volume').shape).toBe('sawtooth');
      expect((await latestLfoInstance()).type).toBe('sawtooth');
    });
  });

  describe('per-instance isolation', () => {
    it('keeps two different robots\' settings for the same target independent', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('layer0.gain', 5, 'robot-a');
      lfoEngine.setLfoRate('layer0.gain', 1, 'robot-b');
      expect(lfoEngine.getLfoSettings('layer0.gain', 'robot-a').rate).toBe(5);
      expect(lfoEngine.getLfoSettings('layer0.gain', 'robot-b').rate).toBe(1);
    });

    it('constructs a separate Tone.LFO per robot for the same target', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      const delta = await callCountDelta(() => {
        lfoEngine.setLfoRate('layer0.gain', 5, 'robot-a');
        lfoEngine.setLfoRate('layer0.gain', 1, 'robot-b');
      });
      expect(delta).toBe(2);
    });

    it('does not let a robot-scoped target collide with the same target id used globally (no robotId)', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('layer0.gain', 5, 'robot-a');
      // 'layer0.gain' with no robotId is a distinct instance key from 'robot-a:layer0.gain'
      expect(lfoEngine.getLfoSettings('layer0.gain').rate).not.toBe(5);
    });
  });

  describe('start (audio-context-gated)', () => {
    it('does not construct a node and does not throw when nothing has been set/connected yet', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      let threw = false;
      const delta = await callCountDelta(() => {
        try {
          lfoEngine.start('volume');
        } catch {
          threw = true;
        }
      });
      expect(threw).toBe(false);
      expect(delta).toBe(0);
    });

    it('starts the node when the AudioContext is running', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 2); // creates the node
      const instance = await latestLfoInstance();
      mockContextState = 'running';
      lfoEngine.start('volume');
      expect(instance.start).toHaveBeenCalledTimes(1);
    });

    it('does not start the node when the AudioContext is suspended', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 2); // creates the node
      const instance = await latestLfoInstance();
      mockContextState = 'suspended';
      lfoEngine.start('volume');
      expect(instance.start).not.toHaveBeenCalled();
    });

    it('starts the node based on the AudioContext, independent of Transport state — the real bug: Transport can still be starting up well after the context itself is already running', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 2); // creates the node
      const instance = await latestLfoInstance();
      mockContextState = 'running';
      mockTransportState = 'stopped'; // Transport not yet started
      lfoEngine.start('volume');
      expect(instance.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('does not throw when nothing has been set/connected yet', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      expect(() => lfoEngine.stop('volume')).not.toThrow();
    });

    it('stops an existing node regardless of transport state', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 2); // creates the node
      const instance = await latestLfoInstance();
      mockTransportState = 'stopped';
      lfoEngine.stop('volume');
      expect(instance.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('connectLfoTarget', () => {
    it('connects to the real Signal for a robot-scoped Gain target', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      const signal = fakeSignal();
      (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(signal);

      const { lfoEngine } = await import('./lfoEngine');
      const result = lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');

      expect(result).toBe(true);
      expect(AudioEngine.getRobotModulationTarget).toHaveBeenLastCalledWith('robot-a', 'layer0.gain');
      const instance = await latestLfoInstance();
      expect(instance.connect).toHaveBeenCalledWith(signal);
    });

    it('connects to the real Signal for a robot-scoped Detune target', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      const signal = fakeSignal();
      (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(signal);

      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.connectLfoTarget('layer1.detune', 'robot-a');

      const instance = await latestLfoInstance();
      expect(instance.connect).toHaveBeenCalledWith(signal);
    });

    it('connects to the real Signal for a global-chain target — no robotId involved', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      const signal = fakeSignal();
      (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(signal);

      const { lfoEngine } = await import('./lfoEngine');
      const result = lfoEngine.connectLfoTarget('eq3.low');

      expect(result).toBe(true);
      expect(AudioEngine.getGlobalModulationTarget).toHaveBeenLastCalledWith('eq3.low');
      const instance = await latestLfoInstance();
      expect(instance.connect).toHaveBeenCalledWith(signal);
    });

    it('connects to the real Signal for pulseWidth on a \'pulse\'-type layer', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      const signal = fakeSignal();
      (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(signal);

      const { lfoEngine } = await import('./lfoEngine');
      const result = lfoEngine.connectLfoTarget('layer0.pulseWidth', 'robot-a');

      expect(result).toBe(true);
      const instance = await latestLfoInstance();
      expect(instance.connect).toHaveBeenCalledWith(signal);
    });

    it('is idempotent when called twice in a row on the same target/signal — never issues a second .connect(), so the same LFO can never double-modulate a target', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      const signal = fakeSignal();
      (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValue(signal);

      const { lfoEngine } = await import('./lfoEngine');
      const first = lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');
      const second = lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');

      expect(first).toBe(true);
      expect(second).toBe(true);
      const instance = await latestLfoInstance();
      expect(instance.connect).toHaveBeenCalledTimes(1);
    });

    it('reconnects (disconnect + connect) rather than silently ignoring a change when the resolved signal differs from what was last connected — e.g. a rebuilt composite voice', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      const firstSignal = fakeSignal();
      const secondSignal = fakeSignal();
      (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(firstSignal)
        .mockReturnValueOnce(secondSignal);

      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');
      const instance = await latestLfoInstance();
      lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');

      expect(instance.disconnect).toHaveBeenCalledTimes(1);
      expect(instance.connect).toHaveBeenNthCalledWith(1, firstSignal);
      expect(instance.connect).toHaveBeenNthCalledWith(2, secondSignal);
    });

    describe('output range scaling — an ADDITIVE delta bounded by the CURRENT base value\'s position, not a fixed constant', () => {
      // Tone.LFO.connect() sums onto the destination Param's existing value
      // (native Web Audio AudioParam behavior — connecting an input ADDS to
      // whatever the param's own intrinsic value is, it never overrides it).
      // A first fix used a FIXED zero-centered swing (half the field's own
      // total span) — better than the raw range, but still a constant,
      // independent of where the base value actually sits. That reintroduced
      // the same class of bug from the other direction: for a base value
      // anywhere off-center (e.g. LPF frequency left low, as a workaround for
      // the original crash), a fixed swing still large enough to swing the
      // OTHER way pushed the combined value below the field's own minimum for
      // roughly half of every cycle — reported as "mutes all audio half the
      // time". The real fix: the swing is bounded by the CURRENT base value's
      // own distance to whichever edge of the range is nearer
      // (min(value-rangeMin, rangeMax-value)) — base +- swing can now never
      // leave [rangeMin, rangeMax], for any starting position. A value sitting
      // exactly at the range's midpoint still gets the same "half the total
      // span" swing as before (both distances are then equal) — no regression
      // for already-centered fields (EQ dB, robot detune, whose typical
      // resting value is 0, itself the midpoint of a symmetric range).
      it('derives a swing bounded by the base value\'s own distance to the nearer edge, for a robot Gain target (0-2, base 0.5 -> +-0.5, not +-1)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(0.5));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(-0.5);
        expect(instance.max).toBe(0.5);
      });

      it('gets the full half-span swing when the base value sits at the range\'s own midpoint, for a robot Detune target (-50..50 cents, base 0)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(0));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('layer0.detune', 'robot-a');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(-50);
        expect(instance.max).toBe(50);
      });

      it('shrinks the swing when the base value sits near the top of its range, for the robot Volume target (0-1, base 0.8 -> +-0.2, not +-0.5)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(0.8));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('volume', 'robot-a');
        const instance = await latestLfoInstance();
        // toBeCloseTo, not toBe — 1 - 0.8 is a well-known floating-point
        // representation artifact (0.19999999999999996), not a logic bug.
        expect(instance.min).toBeCloseTo(-0.2, 10);
        expect(instance.max).toBeCloseTo(0.2, 10);
      });

      it('gets the full half-span swing when the base value sits at the range\'s own midpoint, for a global EQ3 band (-12..12 dB, base 0)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(0));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('eq3.low');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(-12);
        expect(instance.max).toBe(12);
      });

      it('shrinks the swing for LPF frequency (20-20000) when the base value sits low (base 3000 -> +-2980, not a constant +-9990), translating the lpf.* short-form target id to filterLPF.* seed-range key', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(3000));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('lpf.frequency');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(-2980);
        expect(instance.max).toBe(2980);
      });

      it('shrinks the swing for HPF Q (0.1-20) when the base value sits low (base 5 -> +-4.9), translating hpf.* to filterHPF.*', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(5));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('hpf.Q');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(-4.9);
        expect(instance.max).toBe(4.9);
      });

      it('regression: base + swing never leaves the field\'s own [min, max] range, for any base position — the direct fix for "mutes audio half the time"', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        const baseValue = 3000; // low in LPF frequency's 20-20000 range, exactly the kind of position that used to dip negative at the trough
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(baseValue));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('lpf.frequency');
        const instance = await latestLfoInstance();
        expect(baseValue + instance.min).toBeGreaterThanOrEqual(20);
        expect(baseValue + instance.max).toBeLessThanOrEqual(20000);
      });

      it('never assigns NaN to lfo.min/lfo.max when the resolved signal\'s current value is non-finite — a NaN Param value would silence the whole downstream chain, not just this target', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal(NaN));
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('lpf.frequency');
        const instance = await latestLfoInstance();
        expect(Number.isNaN(instance.min)).toBe(false);
        expect(Number.isNaN(instance.max)).toBe(false);
      });
    });

    describe('disabling Signal.override before connecting — the real "explosion" root cause', () => {
      // Verified directly against Tone.js's own source (signal/Signal.ts,
      // connectSignal()): connecting ANYTHING to a Signal whose `override`
      // flag is true (the default) makes Tone immediately
      // cancelScheduledValues + setValueAtTime(0, 0) on the destination and
      // permanently mark it "overridden" — BEFORE the connected source (the
      // LFO) has even started oscillating, and regardless of what lfo.min/
      // lfo.max are set to. For a filter's frequency Signal, that's a
      // step-change to an invalid 0 Hz cutoff the instant the LFO connects
      // — independent of every previous swing-math fix, since none of them
      // touch this. This is the actual, complete explanation for the
      // reported "explosion, then nothing, reproducible on a fresh reload,
      // regardless of how long you wait first" — a structural side effect
      // of calling .connect() at all, not a timing race. Disabling
      // `override` first restores plain additive Web Audio summing, which
      // the swing math above is designed for.
      it('sets override to false on the resolved global Signal before connecting', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        const signal = fakeSignal(3000);
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(signal);
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('lpf.frequency');
        expect(signal.override).toBe(false);
      });

      it('sets override to false on the resolved robot Signal before connecting too', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        const signal = fakeSignal(1);
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(signal);
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');
        expect(signal.override).toBe(false);
      });

      it('restores a Tone.Param destination\'s own current value immediately after connecting — Param has no override escape hatch and always resets to 0 on connect, but (unlike Signal) is never permanently locked, so a plain restore write fixes it going forward', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        const param = fakeParam(1.5); // e.g. a robot layer's current gain
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(param);
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');
        expect(param.value).toBe(1.5);
      });

      it('restoring the Param\'s value is a harmless no-op for a Signal destination — override is already disabled by then, so the mocked connect() never zeroed it in the first place', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        const signal = fakeSignal(5000);
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(signal);
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('lpf.frequency');
        expect(signal.value).toBe(5000);
      });
    });

    it('returns false (not throw) for pulseWidth on a non-\'pulse\' layer — AudioEngine already returns null for that case', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      const { lfoEngine } = await import('./lfoEngine');
      let result: boolean | undefined;
      expect(() => { result = lfoEngine.connectLfoTarget('layer0.pulseWidth', 'robot-a'); }).not.toThrow();
      expect(result).toBe(false);
    });

    it('returns false (not throw) for a robot-scoped target called without a robotId', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      let result: boolean | undefined;
      expect(() => { result = lfoEngine.connectLfoTarget('layer0.gain'); }).not.toThrow();
      expect(result).toBe(false);
    });

    describe('phase — manual polling fallback', () => {
      it('does not call .connect() — no live Signal exists for phase', async () => {
        const { lfoEngine } = await import('./lfoEngine');
        const delta = await callCountDelta(() => {
          lfoEngine.connectLfoTarget('layer0.phase', 'robot-a');
        });
        // a Tone.LFO IS still constructed (for rate/depth/shape bookkeeping,
        // matching every other target), but nothing should be connected.
        expect(delta).toBe(1);
        const instance = await latestLfoInstance();
        expect(instance.connect).not.toHaveBeenCalled();
      });

      it('returns true and registers a scheduleRepeat tick', async () => {
        const { lfoEngine } = await import('./lfoEngine');
        const before = scheduleCallbacks.size;
        const result = lfoEngine.connectLfoTarget('layer0.phase', 'robot-a');
        expect(result).toBe(true);
        expect(scheduleCallbacks.size).toBe(before + 1);
      });

      it('returns false (not throw) when called without a robotId — phase fallback needs to know which robot\'s voice to update', async () => {
        const { lfoEngine } = await import('./lfoEngine');
        let result: boolean | undefined;
        expect(() => { result = lfoEngine.connectLfoTarget('layer0.phase'); }).not.toThrow();
        expect(result).toBe(false);
      });

      it('mutates phase over time — each simulated tick produces a different value applied via AudioEngine.updateVoiceLayerParams', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.setLfoRate('layer0.phase', 1, 'robot-a');
        lfoEngine.setLfoDepth('layer0.phase', 100, 'robot-a');
        lfoEngine.connectLfoTarget('layer0.phase', 'robot-a');

        const callback = [...scheduleCallbacks.values()].at(-1)!;

        mockToneNow = 0;
        callback();
        const firstCall = (AudioEngine.updateVoiceLayerParams as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
        const firstPhase = (firstCall[1] as Array<{ phase?: number }>)[0]?.phase;

        mockToneNow = 0.25; // a quarter-period later at 1 Hz
        callback();
        const secondCall = (AudioEngine.updateVoiceLayerParams as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
        const secondPhase = (secondCall[1] as Array<{ phase?: number }>)[0]?.phase;

        expect(firstCall[0]).toBe('robot-a');
        expect(typeof firstPhase).toBe('number');
        expect(typeof secondPhase).toBe('number');
        expect(secondPhase).not.toBe(firstPhase);
      });

      it('only patches the target layer index, leaving other layers untouched (sparse array)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('layer2.phase', 'robot-a');
        const callback = [...scheduleCallbacks.values()].at(-1)!;
        callback();

        const call = (AudioEngine.updateVoiceLayerParams as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
        const layers = call[1] as Array<{ phase?: number } | undefined>;
        expect(layers[0]).toBeUndefined();
        expect(layers[1]).toBeUndefined();
        expect(layers[2]?.phase).toBeTypeOf('number');
      });
    });
  });

  describe('disconnectLfoTarget', () => {
    it('disconnects a Signal-connected target', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal());

      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');
      const instance = await latestLfoInstance();

      lfoEngine.disconnectLfoTarget('layer0.gain', 'robot-a');
      expect(instance.disconnect).toHaveBeenCalledTimes(1);
    });

    it('cancels the phase-polling fallback schedule', async () => {
      const { cancelSchedule } = await import('./beatClock');
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.connectLfoTarget('layer0.phase', 'robot-a');
      const sizeBeforeDisconnect = scheduleCallbacks.size;

      lfoEngine.disconnectLfoTarget('layer0.phase', 'robot-a');

      expect(cancelSchedule).toHaveBeenCalled();
      expect(scheduleCallbacks.size).toBe(sizeBeforeDisconnect - 1);
    });

    it('does not throw when nothing was ever connected', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      expect(() => lfoEngine.disconnectLfoTarget('volume')).not.toThrow();
      expect(() => lfoEngine.disconnectLfoTarget('layer0.phase', 'robot-a')).not.toThrow();
    });
  });
});
