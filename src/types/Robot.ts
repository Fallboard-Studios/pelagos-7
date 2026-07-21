import type { Vec2 } from './Vec2';
import type { VisualAudioMap, OscillatorLayer } from './layeredAudio';

/**
 * Note duration values for Tone.js scheduling
 * Standard musical note lengths: 32nd, 16th, 8th, quarter, half
 */
export type NoteDuration = '32n' | '16n' | '8n' | '4n' | '2n' | '1n' | '2m' | '4m';

/**
 * Robot state machine states
 */
export const RobotState = {
  Idle: 'idle',
  Moving: 'moving',
  Selected: 'selected',
  Interacting: 'interacting',
  Leaving: 'leaving',
} as const;
export type RobotState = (typeof RobotState)[keyof typeof RobotState];

/**
 * Synth type identifier (kept generic)
 * Use a single generic synth label; detailed voice type is handled inside AudioEngine
 */
/**
 * Oscillator waveform shapes for timbral variety
 */
export type WaveformType = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse';

/**
 * ADSR envelope parameters for synth
 */
export interface ADSREnvelope {
  attack: number;      // seconds
  decay: number;       // seconds
  sustain: number;     // 0-1
  release: number;     // seconds
}

/**
 * Audio attributes determine both sound synthesis and visual appearance
 * Visual appearance is derived from these at render time, not stored separately
 */
export interface AudioAttributes {
  adsr: ADSREnvelope;
  /** @deprecated Use robot.octaveRange instead. Kept for test fixture compatibility; not populated at spawn time. */
  pitchRange?: {
    min: number;       // Hz
    max: number;       // Hz
  };
  /** Seeded octave register [min, max] — populated at spawn time via generateAudioAttributes */
  octaveRange?: [number, number];
  filterFreq: number;  // Hz (cutoff frequency, 0 = no filter)
  /** Canonical ordered list of oscillator layers (index 0 is base) */
  layers?: OscillatorLayer[];
  waveform: WaveformType; // Oscillator shape applied once at voice reservation time
  /** Phase in degrees (0..360) applied to oscillator at reservation time */
  /** Phase in degrees (0..360) applied to oscillator at reservation time */
  phase?: number; // degrees (0..360)
  /** Detune in cents (e.g. -100..100) applied to synth at reservation time */
  detune?: number; // cents (e.g. -100..100)
  /** Deprecated: pulseWidth moved to per-layer `layers[].pulseWidth`. */
  // pulseWidth?: number; // removed in favor of per-layer pulseWidth
  /** Optional compact visual/audio mapping produced at spawn time and stored on the robot */
  visualAudioMap?: VisualAudioMap;
}

/**
 * Single melody event within a robot's 16-step, 2-measure loop
 */
export interface MelodyEvent {
  id: string;                           // Unique identifier (UUID)
  startStep: number;                    // 1-16 (8th-note grid position)
  length: NoteDuration;                 // Note duration
  noteIndex: number;                    // 0-7 (index into available harmony palette)
  octave: number;                       // Concrete octave assigned at spawn time
}

/**
 * Main Robot entity
 * All fields are serializable (JSON-compatible) for Zustand state management
 * Visual appearance is derived from audioAttributes at render time
 */
export interface Robot {
  id: string;
  /** Human-readable display name (generated at spawn) */
  name?: string;
  state: RobotState;
  position: Vec2;
  destination: Vec2 | null;
  direction: 'left' | 'right';     // Facing direction (horizontal orientation)
  melody: MelodyEvent[];
  audioAttributes: AudioAttributes;
  /** Octave range [min, max] this robot plays within. Melody events store concrete octaves within this range. */
  octaveRange: [number, number];
  layer?: 'background' | 'foreground'; // SVG rendering layer (default: foreground)
  createdAt: number;            // timestamp used for removal ordering
  /** Transport measure at which this robot last interacted (for cooldown tracking). */
  lastInteractionMeasure?: number;
  /** Base velocity (0–1) controlling average note loudness. Per-note variance is applied at scheduling time, not stored. */
  masterVolume: number;
  /** When true, this robot survives a power-off cycle and is not removed. */
  persists?: boolean;
  /**
  /** Solo/mute/highlight mode set by the Robot Audio editor.
   * Runtime semantics (enforced by AudioEngine):
   * - `none` (Off): no special routing.
   * - `mute` (Mute): scheduled notes for this robot are suppressed.
   * - `solo` (Solo): other robots in the same locale are suppressed.
   * - `highlight` (Highlight): other robots are attenuated by ~50% at mix/scheduling time.
   * Default: 'none'
   */
  audioMode?: 'none' | 'solo' | 'mute' | 'highlight';
  /**
   * Number of melody events (4–12). Maps to `events` in generateMelodyForRobot().
   * Default: derived from initial melody length at spawn.
   */
  rhythmicDensity?: number;
  /**
   * Motif length in 16th-note subdivisions (1–16).
   * Stored for the melody editor; passed to generator when supported.
   * Default: 8
   */
  rhythmicMotifLength?: number;
  // Note: Visual appearance (shape, colors, scale, detail level) is derived
  // from audioAttributes and NOT stored in state - calculated at render time
  /** When >0, constrains unique notes used during melody generation (0 = no constraint). */
  noteVariance?: number;
}
