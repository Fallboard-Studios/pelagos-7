/**
 * ControlSchema data for the Audio Rig drawer's 7 global effect blocks,
 * resolving docs/tasks/AUDIO_RIG.md Task 1 (V1) and docs/tasks/AUDIO_RIG_V2.md
 * Task 10 (V2 — Chorus removed, Limiter added, chain reordered). Every
 * label/unit/range/default traces field-for-field to
 * docs/reference/GLOBAL_CHAIN_GRID.md — no invented copy. Field paths
 * (`${key}.${field}`) match GlobalAudioSettings' own field names
 * (src/types/globalAudio.ts); the 7 params the grid flags `LFO?: X`
 * additionally carry a `lfoTarget` in GlobalLfoTargetId's short form
 * (src/types/lfo.ts). Neither Limiter nor Delay's delayTime carries one —
 * Limiter was never a GlobalLfoTargetId member (no LFO on the Limiter, by
 * design); delayTime's was removed after shipping (LFO judged unwanted on
 * Delay's own time param). Per docs/specs/LFO_CONSOLIDATED_DISPLAY.md,
 * AudioRigDrawer renders one shared LfoTargetGroup display per LFO-bearing
 * block instead of a nested accordion per param — this file no longer
 * carries a per-param accordion schema of its own.
 */
import type { ControlSchema, AccordionSchema, RadioButtonSchema, SliderCenteredZeroSchema, SliderLinearSchema } from '@/types/controls';
import type { GlobalLfoTargetId, DriftGroupId } from '@/types/lfo';

// ========================================
// TYPES
// ========================================

export type AudioRigEffectKey =
  | 'eq3' | 'filterLPF' | 'filterHPF' | 'delay' | 'reverb' | 'compressor' | 'limiter';

export interface AudioRigParamSchema {
  /** Matches the field path on GlobalAudioSettings[block.key], e.g. 'threshold', 'low', 'frequency'. */
  field: string;
  schema: ControlSchema;
  /** Present only for the 7 rows GLOBAL_CHAIN_GRID.md flags LFO?: X. Short form, matching GlobalLfoTargetId directly. */
  lfoTarget?: GlobalLfoTargetId;
}

export interface AudioRigEffectBlock {
  /** Matches GlobalAudioSettings' own key. */
  key: AudioRigEffectKey;
  accordion: AccordionSchema;
  params: AudioRigParamSchema[];
}

// ========================================
// HELPERS
// ========================================

function accordionSchema(key: AudioRigEffectKey, loreLabel: string, humanLabel: string): AccordionSchema {
  return { id: `audioRig.${key}`, type: 'accordion', loreLabel, humanLabel };
}

// ========================================
// CONFIG
// ========================================

export const AUDIO_RIG_CONFIG: AudioRigEffectBlock[] = [
  {
    key: 'eq3',
    accordion: accordionSchema('eq3', 'SPECTRAL FREQUENCY EQUALIZER', '3-Band EQ'),
    params: [
      {
        field: 'low',
        schema: { id: 'eq3.low', type: 'sliderCenteredZero', loreLabel: 'SUB-BAND DENSITY', humanLabel: 'Low', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.low',
      },
      {
        field: 'mid',
        schema: { id: 'eq3.mid', type: 'sliderCenteredZero', loreLabel: 'MEDIAL-BAND DENSITY', humanLabel: 'Mid', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.mid',
      },
      {
        field: 'high',
        schema: { id: 'eq3.high', type: 'sliderCenteredZero', loreLabel: 'APICAL-BAND DENSITY', humanLabel: 'High', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.high',
      },
    ],
  },
  {
    key: 'filterLPF',
    accordion: accordionSchema('filterLPF', 'HIGH-FREQUENCY MASK', 'Low-Pass Filter'),
    params: [
      {
        field: 'frequency',
        schema: { id: 'filterLPF.frequency', type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', humanLabel: 'Frequency', min: 20, max: 20000, unit: 'Hz' },
        lfoTarget: 'lpf.frequency',
      },
      {
        field: 'Q',
        schema: { id: 'filterLPF.Q', type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', humanLabel: 'Resonance', min: 0.1, max: 20 },
        lfoTarget: 'lpf.Q',
      },
    ],
  },
  {
    key: 'filterHPF',
    accordion: accordionSchema('filterHPF', 'LOW-FREQUENCY MASK', 'High-Pass Filter'),
    params: [
      {
        field: 'frequency',
        schema: { id: 'filterHPF.frequency', type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', humanLabel: 'Frequency', min: 20, max: 20000, unit: 'Hz' },
        lfoTarget: 'hpf.frequency',
      },
      {
        field: 'Q',
        schema: { id: 'filterHPF.Q', type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', humanLabel: 'Resonance', min: 0.1, max: 20 },
        lfoTarget: 'hpf.Q',
      },
    ],
  },
  {
    key: 'delay',
    accordion: accordionSchema('delay', 'TEMPORAL REFLECTION MATRIX', 'Delay'),
    params: [
      // No lfoTarget/lfoAccordion — LFO removed from delayTime; the effect
      // still seeds/edits its value normally (GlobalAudioSeedFieldKey is a
      // separate, unrelated type from GlobalLfoTargetId).
      { field: 'delayTime', schema: { id: 'delay.delayTime', type: 'sliderLinear', loreLabel: 'PROPAGATION LAG', humanLabel: 'Time', min: 0, max: 1, step: 0.01, unit: 's' } },
      { field: 'feedback', schema: { id: 'delay.feedback', type: 'sliderLinear', loreLabel: 'RECIRCULATION RATE', humanLabel: 'Feedback', min: 0, max: 0.95, step: 0.01 } },
      { field: 'wet', schema: { id: 'delay.wet', type: 'sliderLinear', loreLabel: 'REFLECTED SIGNAL BALANCE', humanLabel: 'Mix', min: 0, max: 1, step: 0.01 } },
    ],
  },
  {
    key: 'reverb',
    accordion: accordionSchema('reverb', 'SPATIAL DIFFUSION MATRIX', 'Reverb'),
    params: [
      { field: 'decay', schema: { id: 'reverb.decay', type: 'sliderLog', loreLabel: 'DISSIPATION DURATION', humanLabel: 'Decay', min: 0.1, max: 10, unit: 's' } },
      { field: 'preDelay', schema: { id: 'reverb.preDelay', type: 'sliderLinear', loreLabel: 'INITIAL LAG', humanLabel: 'Pre-Delay', min: 0, max: 0.5, step: 0.01, unit: 's' } },
      // dampening removed (V2) — Tone.Reverb has no such property; the slider
      // controlled a dead cast in globalFx.ts since Phase 0.
      { field: 'wet', schema: { id: 'reverb.wet', type: 'sliderLinear', loreLabel: 'DIFFUSED SIGNAL BALANCE', humanLabel: 'Mix', min: 0, max: 1, step: 0.01 } },
    ],
  },
  {
    key: 'compressor',
    accordion: accordionSchema('compressor', 'DYNAMIC RANGE CONDENSER', 'Compressor'),
    params: [
      { field: 'threshold', schema: { id: 'compressor.threshold', type: 'sliderLinear', loreLabel: 'ATTENUATION THRESHOLD', humanLabel: 'Threshold', min: -60, max: 0, unit: 'dB' } },
      { field: 'ratio', schema: { id: 'compressor.ratio', type: 'stepper', loreLabel: 'COMPRESSION RATIO', humanLabel: 'Ratio', min: 1, max: 20 } },
      { field: 'attack', schema: { id: 'compressor.attack', type: 'sliderLog', loreLabel: 'COMPRESSION RATE', humanLabel: 'Attack', min: 0.001, max: 1, unit: 's' } },
      { field: 'release', schema: { id: 'compressor.release', type: 'sliderLog', loreLabel: 'RAREFACTION RATE', humanLabel: 'Release', min: 0.01, max: 1, unit: 's' } },
      { field: 'knee', schema: { id: 'compressor.knee', type: 'sliderLinear', loreLabel: 'CURVATURE DAMPING', humanLabel: 'Knee', min: 0, max: 40, unit: 'dB' } },
    ],
  },
  {
    key: 'limiter',
    accordion: accordionSchema('limiter', 'TERMINAL CEILING GATE', 'Limiter'),
    params: [
      // No lfoTarget/lfoAccordion — Limiter never gets an LFO (spec: not a
      // GlobalLfoTargetId member, consistent with Compressor/Reverb having none).
      { field: 'threshold', schema: { id: 'limiter.threshold', type: 'sliderLinear', loreLabel: 'OUTPUT CEILING', humanLabel: 'Threshold', min: -20, max: 0, unit: 'dB' } },
    ],
  },
];

// ========================================
// GLOBAL CHAIN-LEVEL RADIO (not nested inside any one effect block)
// ========================================

/**
 * A two-option radio, not a toggle — 'natural' leaves Compressor after
 * Delay+Reverb (their tails ring out uncompressed, the default); 'controlled'
 * moves Compressor before both, tightening them. The drawer converts to/from
 * globalAudio.compressorBeforeDelay's boolean at the wiring point; the radio
 * schema itself only ever deals in these two string values.
 */
export const DECAY_MODE_SCHEMA: RadioButtonSchema = {
  id: 'audioRig.compressorBeforeDelay',
  type: 'radio',
  humanLabel: 'Decay Mode',
  options: [
    { value: 'natural', label: 'Natural Decay' },
    { value: 'controlled', label: 'Controlled Decay' },
  ],
};

/**
 * Global LFO drift (docs/specs/LFO_DRIFT_GROUPS.md) — 4 independent groups
 * (docs/types/lfo.ts's DriftGroupId), each its own accordion with its own
 * two bipolar sliders, standalone like DECAY_MODE_SCHEMA above: `lfoDrift`
 * is a top-level GlobalAudioSettings flag, not a per-effect object, so none
 * of these ever match an AudioRigEffectBlock key or get added to
 * AUDIO_RIG_CONFIG's own array. Sliders are UI-facing percent (-100..100);
 * the drawer wiring point converts to/from lfoEngine's internal -1..1
 * fraction, matching how Depth's own 0-100% UI already maps to lfoEngine's
 * 0-1 internal amplitude domain elsewhere in this file's consumers.
 *
 * Replaces the single flat LFO_DRIFT_ACCORDION/LFO_RATE_DRIFT_SCHEMA/
 * LFO_DEPTH_DRIFT_SCHEMA trio docs/specs/LFO_DRIFT.md originally shipped.
 */
export interface LfoDriftGroupSchema {
  group: DriftGroupId;
  accordion: AccordionSchema;
  rateSchema: SliderCenteredZeroSchema;
  depthSchema: SliderCenteredZeroSchema;
}

function driftGroupSchema(group: DriftGroupId, loreLabel: string, humanLabel: string): LfoDriftGroupSchema {
  return {
    group,
    accordion: { id: `audioRig.lfoDrift.${group}`, type: 'accordion', loreLabel, humanLabel },
    rateSchema: {
      id: `audioRig.lfoDrift.${group}.rateDrift`,
      type: 'sliderCenteredZero',
      loreLabel: 'CADENCE INSTABILITY',
      humanLabel: 'Rate Drift',
      min: -100,
      max: 100,
      unit: '%',
    },
    depthSchema: {
      id: `audioRig.lfoDrift.${group}.depthDrift`,
      type: 'sliderCenteredZero',
      loreLabel: 'AMPLITUDE INSTABILITY',
      humanLabel: 'Depth Drift',
      min: -100,
      max: 100,
      unit: '%',
    },
  };
}

// First-pass copy — no reference grid exists for this feature (10.2's own
// spec already flagged this gap; still true here). Confirm the 4 labels
// read as clearly distinct groups during the feature's manual check.
export const LFO_DRIFT_GROUPS: LfoDriftGroupSchema[] = [
  driftGroupSchema('eq3', 'SPECTRAL FLUX', 'EQ Drift'),
  driftGroupSchema('filterLPF', 'HIGH-MASK FLUX', 'Low-Pass Drift'),
  driftGroupSchema('filterHPF', 'LOW-MASK FLUX', 'High-Pass Drift'),
  driftGroupSchema('robots', 'AGENT FLUX', 'Robot Drift'),
];

/**
 * "Ping Variance Automation" — the Audio Swells master control
 * (docs/specs/PING-VARIANCE-AUTOMATION.md), replacing the former
 * audioSwellsEnabled boolean. A bare, Rig-wide meta-setting like
 * DECAY_MODE_SCHEMA above — not a per-effect param, so it never joins
 * AUDIO_RIG_CONFIG's own array. Displays 0-100%; the store's own
 * pingVarianceAutomation field is a [0, 1] fraction — the drawer wiring
 * point converts via the same *100/÷100 pattern LFO_DRIFT_GROUPS' sliders
 * already use for their own -1..1-fraction-to-percent conversion.
 */
export const PING_VARIANCE_AUTOMATION_SCHEMA: SliderLinearSchema = {
  id: 'audioRig.pingVarianceAutomation',
  type: 'sliderLinear',
  loreLabel: 'PING VARIANCE AUTOMATION',
  humanLabel: 'Automatic Effects',
  min: 0,
  max: 100,
  step: 1,
  unit: '%',
};

/**
 * "Tempo" — the Audio Rig's live BPM override (docs/specs/BPM_CONTROL.md),
 * a bare Rig-wide meta-setting like PING_VARIANCE_AUTOMATION_SCHEMA above —
 * not a per-effect param, so it never joins AUDIO_RIG_CONFIG's own array.
 * No unit conversion at the drawer wiring point: audioStore.bpm is already
 * stored in the same BPM units this slider displays (unlike
 * pingVarianceAutomation's fraction-to-percent split). [20, 200] is
 * deliberately wider than the locale seed range ([40, 100],
 * LOCALE_BPM_SEED_RANGE) on both ends — freely draggable beyond anything a
 * locale would ever seed, same "seed narrow, drag wide" convention
 * PING_VARIANCE_AUTOMATION_SCHEMA already established.
 */
export const BPM_SCHEMA: SliderLinearSchema = {
  id: 'audioRig.bpm',
  type: 'sliderLinear',
  loreLabel: 'RESONANCE CADENCE',
  humanLabel: 'Tempo',
  min: 20,
  max: 200,
  step: 1,
  unit: 'BPM',
};
