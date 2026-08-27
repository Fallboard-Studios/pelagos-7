import type { Vec2 } from './Vec2';
import type { VisualAudioMap, OscillatorLayer } from './layeredAudio';
import type { RobotLfoTargetId, LfoSettings } from './lfo';

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
 * Docking state machine — orthogonal to RobotState. Purely battery-driven
 * (see src/systems/robotSystems.ts): Docked/Active are the two "settled"
 * states; Docking/Departing are held for up to one measure as a transition
 * buffer before landing on Active/Docked respectively.
 */
export const DockingState = {
  Docked: 'docked',
  Docking: 'docking',
  Departing: 'departing',
  Active: 'active',
} as const;
export type DockingState = (typeof DockingState)[keyof typeof DockingState];

/**
 * The four job profiles a robot can be assigned once it lands on Active.
 * Pure data/scoring — see robotSystems.ts's scoreJobAffinities/assignJob.
 */
export const JobType = {
  VentExtraction: 'ventExtraction',
  AcousticSurvey: 'acousticSurvey',
  StructuralInspection: 'structuralInspection',
  FluidMonitoring: 'fluidMonitoring',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

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
  /** Seeded octave register [min, max] — populated at spawn time via generateAudioAttributes */
  octaveRange?: [number, number];
  filterFreq: number;  // Hz (cutoff frequency, 0 = no filter)
  /** Canonical ordered list of oscillator layers (index 0 is base) */
  layers?: OscillatorLayer[];
  waveform: WaveformType; // Oscillator shape applied once at voice reservation time
  /** Phase in degrees (0..360) applied to oscillator at reservation time */
  phase?: number; // degrees (0..360)
  /** Detune in cents (e.g. -100..100) applied to synth at reservation time */
  detune?: number; // cents (e.g. -100..100)
  /** Deprecated: pulseWidth moved to per-layer `layers[].pulseWidth`. */
  /** Optional compact visual/audio mapping produced at spawn time and stored on the robot */
  visualAudioMap?: VisualAudioMap;
}

/**
 * Single melody event within a robot's one-measure, 16-sixteenth-note loop
 */
export interface MelodyEvent {
  id: string;                           // Unique identifier (UUID)
  startStep: number;                    // 1-16 (16th-note grid position)
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
  /** Docking state — see DockingState. Every robot has one from creation. */
  docking: DockingState;
  /**
   * Measure at which a Docking/Departing hold ends and the robot lands on
   * Active/Docked. Undefined when docking is Docked or Active (no hold in
   * progress). Set by robotSystems.ts on threshold crossing.
   */
  dockingHoldUntilMeasure?: number;
  /** 0-100. Drains while Active, recharges while Docked. Seeded at spawn. */
  batteryLevel: number;
  /** Assigned automatically when a robot lands on Active. Undefined while Docked/Docking/Departing. */
  job?: { type: JobType; assignedAtMeasure: number };
  /**
   * Solo/mute/highlight mode set by the Robot Audio editor.
   * Runtime semantics (enforced by AudioEngine):
   * - `none` (Off): no special routing.
   * - `mute` (Mute): scheduled notes for this robot are suppressed.
   * - `solo` (Solo): other robots in the same locale are suppressed.
   * - `highlight` (Highlight): other robots are attenuated by ~50% at mix/scheduling time.
   * Default: 'none'
   */
  audioMode?: 'none' | 'solo' | 'mute' | 'highlight';
  /**
   * Number of melody events (4–12). Maps to `onsetCount` in generateMelodyForRobot().
   * Default: derived from initial melody length at spawn.
   */
  rhythmicDensity?: number;
  /**
   * Motif length in 16th-note subdivisions, with an on/off toggle. `value` is 1-8.
   * When `active` is false, onsets scatter freely across the measure and `value` is
   * inert; when true, a `value`-length cell tiles across the measure and truncates
   * at measure end. Default: { active: true, value: 8 }.
   */
  rhythmicMotifLength?: { active: boolean; value: number };
  /**
   * Weighted note-selection toggle, with a 1-8 slice-size `value`. When `active` is
   * false, notes are picked unweighted from all 8 indices and `value` is inert; when
   * true, selection is a weighted slice of `value` notes from the pitch array.
   * Default: { active: false, value: 1 }.
   */
  noteVariance?: { active: boolean; value: number };
  /**
   * Seeded LFO settings for all 13 RobotLfoTargetId modulation targets,
   * generated once at spawn time (src/systems/spawnSystem.ts) the same way
   * as the rest of audioAttributes. `active` mirrors audioStore.ts's
   * `globalLfo` shape (`LfoSettings & { active: boolean }`) — each target is
   * independently seeded on or off (Roadmap Phase 9), not universally inert;
   * `active: false` means the target isn't currently connected (see
   * src/engine/lfoEngine.ts), not that it never will be.
   */
  lfoSettings?: Record<RobotLfoTargetId, LfoSettings & { active: boolean }>;
}
