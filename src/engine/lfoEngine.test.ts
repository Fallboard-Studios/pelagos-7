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
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  })),
  getTransport: vi.fn(() => ({ get state() { return mockTransportState; } })),
}));

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
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
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

// ========================================
// TESTS
// ========================================

describe('lfoEngine', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockTransportState = 'stopped';
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
      lfoEngine.setLfoRate('chorus.delayTime', 3);
      lfoEngine.setLfoDepth('chorus.delayTime', 75);
      lfoEngine.setLfoShape('chorus.delayTime', 'square');
      expect(lfoEngine.getLfoSettings('chorus.delayTime')).toEqual({ shape: 'square', rate: 3, depth: 75 });
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
});
