import * as Tone from 'tone';

import { getToneCtor, type MinimalToneNode, type SynthWithOscillator } from './toneHelpers';
import { devWarn } from '@/utils/helpers';
import type { ADSREnvelope, NoteDuration, WaveformType } from '@/types/Robot';
import type { OscillatorLayer } from '@/types/layeredAudio';

/** Create a per-layer gain node connected to `out`, falling back to a stub in headless/test envs. */
function createLayerGain(value: number, out: Tone.Gain): Tone.Gain {
  const GainCtor = getToneCtor<Tone.Gain>('Gain');
  if (GainCtor) return new GainCtor(value).connect(out);
  const node: MinimalToneNode = { gain: { value }, connect: function () { return node; } };
  return node as unknown as Tone.Gain;
}

/**
 * A live-update patch entry for `set({ layers })`. `adsr` is not part of the persisted
 * `OscillatorLayer` shape (Roadmap Phase 9 moved ADSR to one shared robot-level envelope,
 * see docs/specs/ROBOT_OPTIONS.md) — it's an ephemeral field this live-update RPC accepts so
 * AudioEngine.updateVoiceEnvelope can reuse this exact path for envelope edits, the same way it's
 * reused for gain/detune/phase/pulseWidth. Nothing here is ever written back to `Robot` state.
 */
export type LayerLivePatch = Partial<OscillatorLayer> & { adsr?: ADSREnvelope };

// Composite voices (created from LayeredWave descriptors) — the shape reserveVoice stores.
export interface CompositeVoice {
  output: Tone.Gain;
  triggerAttackRelease: (note: string, dur: NoteDuration | string, time?: number, velocity?: number) => void;
  set: (params: { layers?: LayerLivePatch[]; outputGain?: number }) => void;
  dispose?: () => void;
  /**
   * Per-layer live node references — synth (for oscillator.detune/width) and
   * gain node (for gain). Exposed for AudioEngine.getRobotModulationTarget
   * (docs/tasks/LFO_INTEGRATION_PLAN.md Task 9) to resolve a connectable
   * Signal without duplicating layer-construction logic outside this module.
   */
  layers?: ReadonlyArray<{
    synth: Tone.Synth | null;
    gainNode: Tone.Gain | null;
    layer: OscillatorLayer;
  }>;
}

/**
 * Build a composite voice (one or more oscillator layers summed into a
 * single output Gain) from a LayeredWave descriptor. Pure construction only —
 * does not reserve/register the voice anywhere; AudioEngine.reserveVoice owns
 * the per-robot bus (panner/busGain/busFilter) and the compositeVoices registry.
 *
 * `adsr` is the robot's one shared envelope (Roadmap Phase 9) — applied
 * identically to every layer's synth at construction, the same "one shared
 * value applied across every layer" role `phase`/`detune`/`pulseWidth` play
 * elsewhere in AudioEngine.reserveVoice. There is no per-layer override
 * anymore; live envelope edits go through the unchanged `set({ layers })`
 * path below via AudioEngine.updateVoiceEnvelope.
 */
export function createCompositeVoice(
  descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] },
  adsr: ADSREnvelope,
): CompositeVoice {
  const GainCtor = getToneCtor<Tone.Gain>('Gain');
  const OutGain = GainCtor ? new GainCtor(1) : (() => {
    // Minimal fallback gain node for test environments where Tone.Gain isn't mocked
    const node: MinimalToneNode = {
      gain: { value: 1 },
      connect: function () { return node; },
      disconnect: function () { },
      toDestination: function () { },
    };
    return node as unknown as Tone.Gain;
  })();
  const out = OutGain as unknown as Tone.Gain;

  const layers: OscillatorLayer[] = Array.isArray(descriptor)
    ? descriptor
    : (descriptor.layers && descriptor.layers.length > 0
      ? descriptor.layers
      : (descriptor.base ? [{ type: descriptor.base, gain: 1, detune: 0, phase: 0 } as OscillatorLayer] : []));

  const layerNodes = layers.map((layer) => {
    const oscConfig: Record<string, unknown> = { type: layer.type as WaveformType };
    // Apply per-layer pulse width when provided (meaningful for pulse/square)
    if (typeof layer.pulseWidth === 'number') oscConfig.width = layer.pulseWidth;

    const synth = new Tone.Synth({
      oscillator: oscConfig,
      envelope: {
        attack: adsr.attack,
        decay: adsr.decay,
        sustain: adsr.sustain,
        release: adsr.release,
      },
    });
    const layerGain = createLayerGain(layer.gain ?? 1, out);
    if (layerGain && typeof synth?.connect === 'function') synth.connect(layerGain);
    if (layer.detune !== undefined) {
      try {
        const osc = (synth as unknown as { oscillator?: { detune?: { value: number } } })?.oscillator;
        if (osc && osc.detune) {
          osc.detune.value = layer.detune;
        }
      } catch (err) {
        devWarn('[AudioEngine] Failed to apply detune on composite layer', err);
      }
    }
    if (layer.phase !== undefined) {
      try {
        const osc = (synth as unknown as { oscillator?: { phase?: number | { value?: number } } })?.oscillator;
        if (osc) {
          // Tone oscillator may accept numeric phase or an object; attempt to set directly
          try {
            // Preferred: set via set({ oscillator: { phase } }) when available
            (synth as unknown as SynthWithOscillator).set?.({ oscillator: { phase: layer.phase } });
          } catch {
            try {
              const oscPhase = (osc as unknown as { phase?: { value?: number } | number })?.phase;
              if (typeof oscPhase === 'object' && oscPhase !== null && 'value' in oscPhase) {
                (oscPhase as { value?: number }).value = layer.phase;
              } else {
                (osc as unknown as { phase?: number }).phase = layer.phase;
              }
            } catch (err) {
              devWarn('[AudioEngine] Failed to apply phase on composite layer', err);
            }
          }
        }
      } catch (err) {
        devWarn('[AudioEngine] Failed to apply phase on composite layer', err);
      }
    }
    if (layer.pulseWidth !== undefined) {
      try {
        const osc = (synth as unknown as { oscillator?: { width?: number | { value?: number } } })?.oscillator;
        if (osc) {
          try { (synth as unknown as SynthWithOscillator).set?.({ oscillator: { width: layer.pulseWidth } }); } catch {
            try {
              const oscWidth = (osc as unknown as { width?: { value?: number } | number })?.width;
              if (typeof oscWidth === 'object' && oscWidth !== null && 'value' in oscWidth) {
                (oscWidth as { value?: number }).value = layer.pulseWidth;
              } else {
                (osc as unknown as { width?: number }).width = layer.pulseWidth;
              }
            } catch (err) {
              devWarn('[AudioEngine] Failed to apply pulseWidth on composite layer', err);
            }
          }
        }
      } catch (err) {
        devWarn('[AudioEngine] Failed to apply pulseWidth on composite layer', err);
      }
    }

    return { synth, gainNode: layerGain, layer };
  });

  // Per-layer last-scheduled time tracker. Tone Source nodes (Synth, NoiseSynth) require
  // strictly increasing schedule times. We track the last time used per layer index so we
  // can always advance by at least 1ms even when multiple flurries hit the same composite
  // in the same AudioContext quantum (where Tone.now() returns the same value for all calls).
  const layerLastTime: number[] = layerNodes.map(() => -Infinity);

  const triggerAttackRelease = (note: string, dur: NoteDuration | string, time?: number, velocity?: number) => {
    const requested = (typeof time === 'number' && isFinite(time)) ? time : Tone.now();
    const durStr = String(dur);
    layerNodes.forEach(({ synth }, i) => {
      try {
        const t = Math.max(requested, Tone.now() + 0.001, layerLastTime[i] + 0.001);
        layerLastTime[i] = t;
        if (synth && typeof (synth as unknown as { triggerAttackRelease?: unknown }).triggerAttackRelease === 'function') {
          (synth as unknown as { triggerAttackRelease?: (n: string, d: string, time?: number, v?: number) => void }).triggerAttackRelease?.(note, durStr, t, velocity ?? 0.8);
        } else if (synth && typeof (synth as unknown as { triggerAttack?: unknown }).triggerAttack === 'function') {
          (synth as unknown as { triggerAttack?: (n: string, time?: number, v?: number) => void }).triggerAttack?.(note, t, velocity ?? 0.8);
          const releaseAt = t + Tone.Time(durStr).toSeconds();
          (synth as unknown as { triggerRelease?: (time?: number) => void }).triggerRelease?.(releaseAt + 0.01);
        }
      } catch (err) {
        devWarn('[AudioEngine] Composite layer trigger failed', err);
      }
    });
  };

  const set = (params: { layers?: LayerLivePatch[]; outputGain?: number }) => {
    if (params.outputGain !== undefined) out.gain.value = params.outputGain;
    if (params.layers) {
      // Match by index so multi-layer voices with duplicate waveform types are updated correctly.
      params.layers.forEach((p, i) => {
        const node = layerNodes[i];
        if (!node) return;
        const { synth, gainNode } = node;
        if (p.gain !== undefined && gainNode) {
          try {
            gainNode.gain.value = p.gain as number;
          } catch (err) {
            devWarn('[AudioEngine] Failed to set layer gain on composite', err);
          }
        }
        if (p.detune !== undefined) {
          try {
            const osc = (synth as unknown as { oscillator?: { detune?: { value: number } } })?.oscillator;
            if (osc && osc.detune) osc.detune.value = p.detune;
          } catch (err) {
            devWarn('[AudioEngine] Failed to set detune on composite layer', err);
          }
        }
        if (p.phase !== undefined) {
          try {
            const osc = (synth as unknown as SynthWithOscillator)?.oscillator;
            if (osc) {
              try { (synth as unknown as SynthWithOscillator).set?.({ oscillator: { phase: p.phase } }); } catch {
                try {
                  const oscPhase = (osc as unknown as { phase?: { value?: number } | number })?.phase;
                  if (typeof oscPhase === 'object' && oscPhase !== null && 'value' in oscPhase) {
                    (oscPhase as { value?: number }).value = p.phase;
                  } else {
                    (osc as unknown as { phase?: number }).phase = p.phase;
                  }
                } catch (err) {
                  devWarn('[AudioEngine] Failed to set phase on composite layer', err);
                }
              }
            }
          } catch (err) {
            devWarn('[AudioEngine] Failed to set phase on composite layer', err);
          }
        }
        if (p.pulseWidth !== undefined) {
          try {
            // Prefer Synth.set when available
            try { (synth as unknown as SynthWithOscillator).set?.({ oscillator: { width: p.pulseWidth } }); } catch {
              const osc = (synth as unknown as { oscillator?: { width?: { value?: number } | number } })?.oscillator;
              if (osc) {
                try {
                  const oscWidth = (osc as unknown as { width?: { value?: number } | number })?.width;
                  if (typeof oscWidth === 'object' && oscWidth !== null && 'value' in oscWidth) {
                    (oscWidth as { value?: number }).value = p.pulseWidth;
                  } else {
                    (osc as unknown as { width?: number }).width = p.pulseWidth;
                  }
                } catch (err) {
                  devWarn('[AudioEngine] Failed to set pulseWidth on composite layer', err);
                }
              }
            }
          } catch (err) {
            devWarn('[AudioEngine] Failed to set pulseWidth on composite layer', err);
          }
        }
        if (p.adsr && typeof (synth as unknown as { set?: (props: unknown) => void }).set === 'function') {
          try { (synth as unknown as { set?: (props: unknown) => void }).set?.({ envelope: p.adsr }); } catch (err) {
            devWarn('[AudioEngine] Failed to set ADSR on composite layer', err);
          }
        }
      });
    }
  };

  const dispose = () => {
    layerNodes.forEach(({ synth, gainNode }) => {
      try {
        try { (synth as unknown as { dispose?: () => void }).dispose?.(); } catch (err) { devWarn('[AudioEngine] Error disposing composite layer synth', err); }
      } catch (err) {
        devWarn('[AudioEngine] Error disposing composite layer synth', err);
      }
      try { gainNode?.disconnect(); } catch { devWarn('[AudioEngine] Failed disconnecting gainNode'); }
      try { (gainNode as unknown as { dispose?: () => void })?.dispose?.(); } catch { devWarn('[AudioEngine] Failed disposing gainNode'); }
    });
    try { out.disconnect(); } catch { devWarn('[AudioEngine] Failed disconnecting composite output'); }
    try { (out as unknown as { dispose?: () => void })?.dispose?.(); } catch { devWarn('[AudioEngine] Failed disposing composite output'); }
  };

  return { output: out, triggerAttackRelease, set, dispose, layers: layerNodes };
}
