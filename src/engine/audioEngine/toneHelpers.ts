import * as Tone from 'tone';

/** Minimal shape used for test/runtime fallbacks where Tone classes may be absent. */
export interface MinimalToneNode {
  connect: (target?: unknown) => unknown;
  disconnect?: () => void;
  toDestination?: () => void;
  gain?: { value: number };
  pan?: { value: number };
}

/** Lightweight synth shape used for safe typed access to set/oscillator fields. */
export interface SynthWithOscillator {
  set?: (props: unknown) => void;
  oscillator?: {
    detune?: { value: number } | number;
    phase?: { value?: number } | number;
  };
  triggerAttackRelease?: (note: string, dur: string, time?: number, v?: number) => void;
  triggerAttack?: (note: string, time?: number, v?: number) => void;
  triggerRelease?: (time?: number) => void;
  dispose?: () => void;
  connect?: (t?: unknown) => unknown;
}

// Lightweight record view of Tone to access constructors safely in test/runtime.
const toneRecord = Tone as unknown as Record<string, unknown>;

/** Look up a Tone constructor by name, returning undefined when absent (test/headless envs). */
export function getToneCtor<T>(name: string): (new (...args: unknown[]) => T) | undefined {
  const ctor = toneRecord[name];
  return typeof ctor === 'function' ? (ctor as new (...args: unknown[]) => T) : undefined;
}
