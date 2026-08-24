import { describe, it, expect, beforeEach, vi } from 'vitest';

// ========================================
// MOCKS
// ========================================
// Mutable so individual tests can flip transport state to exercise the
// start-is-gated-by-transport behavior without re-mocking per test.
let mockTransportState: 'started' | 'stopped' = 'stopped';

vi.mock('tone', () => ({
  LFO: vi.fn((frequency?: number) => ({
    frequency: { value: frequency ?? 1 },
    amplitude: { value: 1 },
    type: 'sine',
    min: 0, // Tone.LFO's real default (LFO.getDefaults())
    max: 1, // Tone.LFO's real default — modulating a target with these left unset is functionally inaudible
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
  })),
  getTransport: vi.fn(() => ({ get state() { return mockTransportState; } })),
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

/** A minimal fake Signal-like object, distinct per call so tests can assert connect() received the right one. */
function fakeSignal(): { value: number } {
  return { value: 0 };
}

// ========================================
// TESTS
// ========================================

describe('lfoEngine', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockTransportState = 'stopped';
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

  describe('start (transport-gated)', () => {
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

    it('starts the node when the transport is running', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 2); // creates the node
      const instance = await latestLfoInstance();
      mockTransportState = 'started';
      lfoEngine.start('volume');
      expect(instance.start).toHaveBeenCalledTimes(1);
    });

    it('does not start the node when the transport is stopped', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      lfoEngine.setLfoRate('volume', 2); // creates the node
      const instance = await latestLfoInstance();
      mockTransportState = 'stopped';
      lfoEngine.start('volume');
      expect(instance.start).not.toHaveBeenCalled();
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

    describe('output range scaling — Tone.LFO defaults to min:0/max:1, which is functionally inaudible against any real target', () => {
      it('scales min/max to the target\'s real range for a robot Gain target (0-2, per ROBOT_DATA_GRID.md)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal());
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('layer0.gain', 'robot-a');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(0);
        expect(instance.max).toBe(2);
      });

      it('scales min/max to the target\'s real range for a robot Detune target (-50..50 cents)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal());
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('layer0.detune', 'robot-a');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(-50);
        expect(instance.max).toBe(50);
      });

      it('scales min/max to the target\'s real range for the robot Volume target (0-1)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getRobotModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal());
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('volume', 'robot-a');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(0);
        expect(instance.max).toBe(1);
      });

      it('scales min/max to the target\'s real range for a global EQ3 band (-12..12 dB, from GLOBAL_AUDIO_SEED_RANGES)', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal());
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('eq3.low');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(-12);
        expect(instance.max).toBe(12);
      });

      it('scales min/max to the target\'s real range for LPF frequency, translating the lpf.* short-form target id to filterLPF.* seed-range key', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal());
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('lpf.frequency');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(20);
        expect(instance.max).toBe(20000);
      });

      it('scales min/max to the target\'s real range for HPF Q, translating hpf.* to filterHPF.*', async () => {
        const { AudioEngine } = await import('./AudioEngine');
        (AudioEngine.getGlobalModulationTarget as ReturnType<typeof vi.fn>).mockReturnValueOnce(fakeSignal());
        const { lfoEngine } = await import('./lfoEngine');
        lfoEngine.connectLfoTarget('hpf.Q');
        const instance = await latestLfoInstance();
        expect(instance.min).toBe(0.1);
        expect(instance.max).toBe(20);
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
