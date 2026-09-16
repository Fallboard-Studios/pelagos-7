/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tone.js the same way AudioEngine.test.ts does, scoped to what compositeVoice.ts uses.
vi.mock('tone', () => ({
  now: vi.fn(() => 0),
  Time: vi.fn((duration: string) => ({
    toSeconds: () => {
      const map: Record<string, number> = { '8n': 0.5, '4n': 1.0, '2n': 2.0 };
      return map[duration] || 1.0;
    },
  })),
  Synth: vi.fn((config?: { oscillator?: { type?: string }; envelope?: Record<string, number> }) => ({
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    triggerAttackRelease: vi.fn(),
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    set: vi.fn(),
    oscillator: { type: config?.oscillator?.type, detune: { value: 0 } },
    envelope: config?.envelope,
  })),
  Gain: vi.fn(() => ({
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    toDestination: vi.fn(),
    gain: { value: 1 },
  })),
}));

import * as Tone from 'tone';
import { createCompositeVoice } from './compositeVoice';
import type { OscillatorLayer } from '@/types/layeredAudio';
import type { ADSREnvelope } from '@/types/Robot';

const SHARED_ADSR: ADSREnvelope = { attack: 0.2, decay: 0.3, sustain: 0.6, release: 1.5 };

function makeLayer(overrides: Partial<OscillatorLayer> = {}): OscillatorLayer {
  return { type: 'sine', gain: 1, detune: 0, phase: 0, ...overrides };
}

describe('createCompositeVoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies the shared ADSR to a single layer synth at construction', () => {
    createCompositeVoice([makeLayer()], SHARED_ADSR);

    expect(Tone.Synth).toHaveBeenCalledTimes(1);
    const config = (Tone.Synth as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as {
      envelope: ADSREnvelope;
    };
    expect(config.envelope).toEqual(SHARED_ADSR);
  });

  it('applies the identical shared ADSR to every layer, not a per-layer value', () => {
    const layers = [
      makeLayer({ type: 'sine' }),
      makeLayer({ type: 'square' }),
      makeLayer({ type: 'sawtooth' }),
    ];

    createCompositeVoice(layers, SHARED_ADSR);

    expect(Tone.Synth).toHaveBeenCalledTimes(3);
    const calls = (Tone.Synth as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    calls.forEach((call) => {
      const config = call[0] as { envelope: ADSREnvelope };
      expect(config.envelope).toEqual(SHARED_ADSR);
    });
  });

  it('reflects a different shared ADSR on the next construction (not cached/stale)', () => {
    createCompositeVoice([makeLayer()], SHARED_ADSR);
    const otherAdsr: ADSREnvelope = { attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.2 };
    createCompositeVoice([makeLayer()], otherAdsr);

    const calls = (Tone.Synth as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect((calls[0][0] as { envelope: ADSREnvelope }).envelope).toEqual(SHARED_ADSR);
    expect((calls[1][0] as { envelope: ADSREnvelope }).envelope).toEqual(otherAdsr);
  });

  it('live-update set({ layers }) still applies a per-entry adsr patch to the synth (unchanged path)', () => {
    const voice = createCompositeVoice([makeLayer()], SHARED_ADSR);
    const synthInstance = (Tone.Synth as unknown as { mock: { results: { value: { set: ReturnType<typeof vi.fn> } }[] } })
      .mock.results[0].value;

    const newAdsr: ADSREnvelope = { attack: 0.5, decay: 0.5, sustain: 0.5, release: 0.5 };
    voice.set({ layers: [{ adsr: newAdsr } as Partial<OscillatorLayer> & { adsr: ADSREnvelope }] });

    expect(synthInstance.set).toHaveBeenCalledWith({ envelope: newAdsr });
  });

  it('every layer builds a Tone.Synth — no NoiseSynth construction path remains', () => {
    createCompositeVoice([makeLayer({ type: 'square' }), makeLayer({ type: 'pulse' })], SHARED_ADSR);
    expect(Tone.Synth).toHaveBeenCalledTimes(2);
  });

  describe('detune/phase/pulseWidth application (docs/tasks/AUDIO_ENGINE_CLEANUP.md Task 4) — characterizes today\'s behavior before extracting a shared helper, so the refactor has a real safety net', () => {
    describe('at construction', () => {
      it('applies detune directly onto oscillator.detune.value', () => {
        createCompositeVoice([makeLayer({ detune: 37 })], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { oscillator: { detune: { value: number } } } }[] } }).mock.results[0].value;
        expect(synth.oscillator.detune.value).toBe(37);
      });

      it('applies phase via synth.set() when it succeeds', () => {
        createCompositeVoice([makeLayer({ phase: 90 })], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { set: ReturnType<typeof vi.fn> } }[] } }).mock.results[0].value;
        expect(synth.set).toHaveBeenCalledWith({ oscillator: { phase: 90 } });
      });

      it('falls back to oscillator.phase.value when synth.set() throws and phase is Signal-shaped', () => {
        (Tone.Synth as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
          connect: vi.fn().mockReturnThis(), disconnect: vi.fn(), dispose: vi.fn(),
          triggerAttackRelease: vi.fn(), triggerAttack: vi.fn(), triggerRelease: vi.fn(),
          set: vi.fn(() => { throw new Error('set unsupported'); }),
          oscillator: { detune: { value: 0 }, phase: { value: 0 } },
        }));
        createCompositeVoice([makeLayer({ phase: 45 })], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { oscillator: { phase: { value: number } } } }[] } }).mock.results[0].value;
        expect(synth.oscillator.phase.value).toBe(45);
      });

      it('falls back to a raw oscillator.phase assignment when synth.set() throws and phase is a plain number', () => {
        (Tone.Synth as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
          connect: vi.fn().mockReturnThis(), disconnect: vi.fn(), dispose: vi.fn(),
          triggerAttackRelease: vi.fn(), triggerAttack: vi.fn(), triggerRelease: vi.fn(),
          set: vi.fn(() => { throw new Error('set unsupported'); }),
          oscillator: { detune: { value: 0 }, phase: 0 },
        }));
        createCompositeVoice([makeLayer({ phase: 45 })], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { oscillator: { phase: number } } }[] } }).mock.results[0].value;
        expect(synth.oscillator.phase).toBe(45);
      });

      it('applies pulseWidth via synth.set({ oscillator: { width } }) when it succeeds', () => {
        createCompositeVoice([makeLayer({ type: 'pulse', pulseWidth: 0.3 })], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { set: ReturnType<typeof vi.fn> } }[] } }).mock.results[0].value;
        expect(synth.set).toHaveBeenCalledWith({ oscillator: { width: 0.3 } });
      });
    });

    describe('via the live-update set({ layers }) path', () => {
      it('applies detune directly onto oscillator.detune.value', () => {
        const voice = createCompositeVoice([makeLayer()], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { oscillator: { detune: { value: number } } } }[] } }).mock.results[0].value;
        voice.set({ layers: [{ detune: 12 }] });
        expect(synth.oscillator.detune.value).toBe(12);
      });

      it('applies phase via synth.set() when it succeeds', () => {
        const voice = createCompositeVoice([makeLayer()], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { set: ReturnType<typeof vi.fn> } }[] } }).mock.results[0].value;
        voice.set({ layers: [{ phase: 180 }] });
        expect(synth.set).toHaveBeenCalledWith({ oscillator: { phase: 180 } });
      });

      it('falls back to oscillator.phase.value when synth.set() throws and phase is Signal-shaped', () => {
        const voice = createCompositeVoice([makeLayer()], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { set: ReturnType<typeof vi.fn>; oscillator: { phase: { value: number } } } }[] } }).mock.results[0].value;
        synth.oscillator.phase = { value: 0 };
        synth.set = vi.fn(() => { throw new Error('set unsupported'); });
        voice.set({ layers: [{ phase: 270 }] });
        expect(synth.oscillator.phase.value).toBe(270);
      });

      it('falls back to a raw width assignment when synth.set() throws and width is a plain number', () => {
        const voice = createCompositeVoice([makeLayer()], SHARED_ADSR);
        const synth = (Tone.Synth as unknown as { mock: { results: { value: { set: ReturnType<typeof vi.fn>; oscillator: { width?: number } } }[] } }).mock.results[0].value;
        synth.oscillator.width = 0;
        synth.set = vi.fn(() => { throw new Error('set unsupported'); });
        voice.set({ layers: [{ pulseWidth: 0.75 }] });
        expect(synth.oscillator.width).toBe(0.75);
      });
    });
  });
});
