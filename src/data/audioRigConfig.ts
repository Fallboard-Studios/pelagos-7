/**
 * ControlSchema data for the Audio Rig drawer's 7 global effect blocks,
 * resolving docs/tasks/AUDIO_RIG.md Task 1 (V1) and docs/tasks/AUDIO_RIG_V2.md
 * Task 10 (V2 — Chorus removed, Limiter added, chain reordered). Every
 * label/unit/range/default traces field-for-field to
 * docs/reference/GLOBAL_CHAIN_GRID.md — no invented copy. Field paths
 * (`${key}.${field}`) match GlobalAudioSettings' own field names
 * (src/types/globalAudio.ts); the 8 params the grid flags `LFO?: X`
 * additionally carry a `lfoTarget` in GlobalLfoTargetId's short form
 * (src/types/lfo.ts) and their own nested `lfoAccordion` schema. Limiter
 * never carries one — it's not a GlobalLfoTargetId member (spec: no LFO on
 * the Limiter, by design).
 */
import type { ControlSchema, ToggleSchema, AccordionSchema } from '@/types/controls';
import type { GlobalLfoTargetId } from '@/types/lfo';

// ========================================
// TYPES
// ========================================

export type AudioRigEffectKey =
  | 'eq3' | 'filterLPF' | 'filterHPF' | 'delay' | 'reverb' | 'compressor' | 'limiter';

export interface AudioRigParamSchema {
  /** Matches the field path on GlobalAudioSettings[block.key], e.g. 'threshold', 'low', 'frequency'. */
  field: string;
  schema: ControlSchema;
  /** Present only for the 9 rows GLOBAL_CHAIN_GRID.md flags LFO?: X. Short form, matching GlobalLfoTargetId directly. */
  lfoTarget?: GlobalLfoTargetId;
  /** The nested accordion wrapping this param's Lfo control — present iff lfoTarget is. */
  lfoAccordion?: AccordionSchema;
}

export interface AudioRigEffectBlock {
  /** Matches GlobalAudioSettings' own key. */
  key: AudioRigEffectKey;
  accordion: AccordionSchema;
  enabledSchema: ToggleSchema;
  params: AudioRigParamSchema[];
}

// ========================================
// HELPERS
// ========================================

function accordionSchema(key: AudioRigEffectKey, loreLabel: string, humanLabel: string): AccordionSchema {
  return { id: `audioRig.${key}`, type: 'accordion', loreLabel, humanLabel };
}

// humanLabel is "${effect name} Enabled", not a shared "Enabled" — all 7 toggles
// would otherwise resolve to the identical accessible name via
// resolveAccessibleName, indistinguishable to a screen reader.
function enabledSchema(key: AudioRigEffectKey, effectHumanName: string): ToggleSchema {
  return { id: `audioRig.${key}.enabled`, type: 'toggle', humanLabel: `${effectHumanName} Enabled` };
}

function lfoAccordionSchema(key: AudioRigEffectKey, field: string): AccordionSchema {
  return { id: `audioRig.${key}.${field}.lfo`, type: 'accordion', humanLabel: 'Modulation' };
}

// ========================================
// CONFIG
// ========================================

export const AUDIO_RIG_CONFIG: AudioRigEffectBlock[] = [
  {
    key: 'eq3',
    accordion: accordionSchema('eq3', 'SPECTRAL FREQUENCY EQUALIZER', '3-Band EQ'),
    enabledSchema: enabledSchema('eq3', '3-Band EQ'),
    params: [
      {
        field: 'low',
        schema: { id: 'eq3.low', type: 'sliderCenteredZero', loreLabel: 'SUB-BAND DENSITY', humanLabel: 'Low', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.low',
        lfoAccordion: lfoAccordionSchema('eq3', 'low'),
      },
      {
        field: 'mid',
        schema: { id: 'eq3.mid', type: 'sliderCenteredZero', loreLabel: 'MEDIAL-BAND DENSITY', humanLabel: 'Mid', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.mid',
        lfoAccordion: lfoAccordionSchema('eq3', 'mid'),
      },
      {
        field: 'high',
        schema: { id: 'eq3.high', type: 'sliderCenteredZero', loreLabel: 'APICAL-BAND DENSITY', humanLabel: 'High', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.high',
        lfoAccordion: lfoAccordionSchema('eq3', 'high'),
      },
    ],
  },
  {
    key: 'filterLPF',
    accordion: accordionSchema('filterLPF', 'HIGH-FREQUENCY MASK', 'Low-Pass Filter'),
    enabledSchema: enabledSchema('filterLPF', 'Low-Pass Filter'),
    params: [
      {
        field: 'frequency',
        schema: { id: 'filterLPF.frequency', type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', humanLabel: 'Frequency', min: 20, max: 20000, unit: 'Hz' },
        lfoTarget: 'lpf.frequency',
        lfoAccordion: lfoAccordionSchema('filterLPF', 'frequency'),
      },
      {
        field: 'Q',
        schema: { id: 'filterLPF.Q', type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', humanLabel: 'Resonance', min: 0.1, max: 20 },
        lfoTarget: 'lpf.Q',
        lfoAccordion: lfoAccordionSchema('filterLPF', 'Q'),
      },
    ],
  },
  {
    key: 'filterHPF',
    accordion: accordionSchema('filterHPF', 'LOW-FREQUENCY MASK', 'High-Pass Filter'),
    enabledSchema: enabledSchema('filterHPF', 'High-Pass Filter'),
    params: [
      {
        field: 'frequency',
        schema: { id: 'filterHPF.frequency', type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', humanLabel: 'Frequency', min: 20, max: 20000, unit: 'Hz' },
        lfoTarget: 'hpf.frequency',
        lfoAccordion: lfoAccordionSchema('filterHPF', 'frequency'),
      },
      {
        field: 'Q',
        schema: { id: 'filterHPF.Q', type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', humanLabel: 'Resonance', min: 0.1, max: 20 },
        lfoTarget: 'hpf.Q',
        lfoAccordion: lfoAccordionSchema('filterHPF', 'Q'),
      },
    ],
  },
  {
    key: 'delay',
    accordion: accordionSchema('delay', 'TEMPORAL REFLECTION MATRIX', 'Delay'),
    enabledSchema: enabledSchema('delay', 'Delay'),
    params: [
      {
        field: 'delayTime',
        schema: { id: 'delay.delayTime', type: 'sliderLinear', loreLabel: 'PROPAGATION LAG', humanLabel: 'Time', min: 0, max: 1, unit: 's' },
        lfoTarget: 'delay.delayTime',
        lfoAccordion: lfoAccordionSchema('delay', 'delayTime'),
      },
      { field: 'feedback', schema: { id: 'delay.feedback', type: 'sliderLinear', loreLabel: 'RECIRCULATION RATE', humanLabel: 'Feedback', min: 0, max: 0.95 } },
      { field: 'wet', schema: { id: 'delay.wet', type: 'sliderLinear', loreLabel: 'REFLECTED SIGNAL BALANCE', humanLabel: 'Mix', min: 0, max: 1 } },
    ],
  },
  {
    key: 'reverb',
    accordion: accordionSchema('reverb', 'SPATIAL DIFFUSION MATRIX', 'Reverb'),
    enabledSchema: enabledSchema('reverb', 'Reverb'),
    params: [
      { field: 'decay', schema: { id: 'reverb.decay', type: 'sliderLog', loreLabel: 'DISSIPATION DURATION', humanLabel: 'Decay', min: 0.1, max: 10, unit: 's' } },
      { field: 'preDelay', schema: { id: 'reverb.preDelay', type: 'sliderLinear', loreLabel: 'INITIAL LAG', humanLabel: 'Pre-Delay', min: 0, max: 0.5, unit: 's' } },
      // dampening removed (V2) — Tone.Reverb has no such property; the slider
      // controlled a dead cast in globalFx.ts since Phase 0.
      { field: 'wet', schema: { id: 'reverb.wet', type: 'sliderLinear', loreLabel: 'DIFFUSED SIGNAL BALANCE', humanLabel: 'Mix', min: 0, max: 1 } },
    ],
  },
  {
    key: 'compressor',
    accordion: accordionSchema('compressor', 'DYNAMIC RANGE CONDENSER', 'Compressor'),
    enabledSchema: enabledSchema('compressor', 'Compressor'),
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
    enabledSchema: enabledSchema('limiter', 'Limiter'),
    params: [
      // No lfoTarget/lfoAccordion — Limiter never gets an LFO (spec: not a
      // GlobalLfoTargetId member, consistent with Compressor/Reverb having none).
      { field: 'threshold', schema: { id: 'limiter.threshold', type: 'sliderLinear', loreLabel: 'OUTPUT CEILING', humanLabel: 'Threshold', min: -20, max: 0, unit: 'dB' } },
    ],
  },
];

// ========================================
// GLOBAL CHAIN-LEVEL TOGGLE (not nested inside any one effect block)
// ========================================

/** Both schemas share this id — the drawer swaps which one it passes to
 *  <Toggle> based on the CURRENT globalAudio.compressorBeforeDelay value, so
 *  the visible label always names the current state, not the target/action. */
const COMPRESSOR_BEFORE_DELAY_TOGGLE_ID = 'audioRig.compressorBeforeDelay';

/** Shown when compressorBeforeDelay is false (default) — Compressor sits
 *  after Delay+Reverb, so their tails ring out uncompressed. */
export const NATURAL_DECAY_SCHEMA: ToggleSchema = {
  id: COMPRESSOR_BEFORE_DELAY_TOGGLE_ID,
  type: 'toggle',
  humanLabel: 'Natural Decay',
};

/** Shown when compressorBeforeDelay is true — Compressor moved before both
 *  Delay and Reverb, tightening their tails. */
export const CONTROLLED_DECAY_SCHEMA: ToggleSchema = {
  id: COMPRESSOR_BEFORE_DELAY_TOGGLE_ID,
  type: 'toggle',
  humanLabel: 'Controlled Decay',
};
