import type { WaveformType } from './Robot'

/**
 * Canonical descriptor for a single oscillator layer. Roadmap Phase 9 collapsed per-layer ADSR
 * overrides down to one shared envelope per robot (Robot.audioAttributes.adsr) — there is no
 * per-layer `adsr` field anymore, and `'noise'` is no longer a selectable layer type (see
 * docs/specs/ROBOT_OPTIONS.md §7). `active` lets Coaxial/Harmonic (layers[1]/[2]) be muted
 * without discarding their configuration; layers[0] (Baseline) is always `true`.
 */
export interface OscillatorLayer {
  type: WaveformType
  gain: number // required: default 1.0 at creation
  detune: number // cents (required; default 0)
  phase: number // degrees (required; default 0)
  pulseWidth?: number // 0..1, meaningful for pulse/square oscillators
  active: boolean
}

/** Small set of shape parameters derived from averaged audio values */
export interface ShapeParams {
  scale: number // 0..1
  roundness: number // 0..1
  detail: number // 0..1
}

/** Visual properties for an individual audio layer (spawn-time, serializable) */
export interface LayerVisual {
  color?: string
  scale?: number // 0..1
  offset?: { x: number; y: number }
}

/**
 * Visual mapping derived from audio for spawn-time storage on robots. `averagedADSR` was removed
 * in Roadmap Phase 9 — there's only one ADSR envelope per robot now (Robot.audioAttributes.adsr),
 * nothing left to average (see docs/ROBOT_DESIGN.md).
 */
export interface VisualAudioMap {
  averagedGain?: number
  shapeParams?: ShapeParams
  layerVisuals?: LayerVisual[]
}


