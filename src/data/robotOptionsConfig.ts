/**
 * ControlSchema data for Robot Options' 4 sections (Roadmap Phase 9), following
 * audioRigConfig.ts's structural pattern — typed block/param arrays, not one flat schema list.
 * Field-for-field from docs/reference/ROBOT_DATA_GRID.md, with the numeric-range/behavior
 * corrections confirmed via /interview-me and recorded in docs/specs/ROBOT_OPTIONS.md §7:
 * Density uses RHYTHMIC_DENSITY_MIN/MAX (0-100, not the grid's stale 1-16), Audio Setting
 * includes a 4th "Off" option, Signature Array has no 'noise' Type option, and Detune is ±50
 * cents (the grid's number — the removed per-layer editor's ±100 was the stale one).
 *
 * Robot Display's Name/Job/Battery/Docking rows reuse robotSelectionConfig.ts's
 * ROBOT_SELECTION_ROW_SCHEMAS/label maps directly (Phase 8) rather than duplicating them — see
 * RobotDisplaySection.tsx.
 */
import type {
  AccordionSchema,
  ButtonSchema,
  ControlSchema,
  RadioButtonSchema,
  SliderCenteredZeroSchema,
  SliderLinearSchema,
  SliderLogSchema,
  StepperSchema,
  StepperWithToggleSchema,
  ToggleSchema,
} from '@/types/controls';
import type { RobotLfoTargetId } from '@/types/lfo';
import {
  RHYTHMIC_DENSITY_MIN,
  RHYTHMIC_DENSITY_MAX,
  RHYTHMIC_MOTIF_LENGTH_MIN,
  RHYTHMIC_MOTIF_LENGTH_MAX,
  NOTE_VARIANCE_MIN,
  NOTE_VARIANCE_MAX,
  OCTAVE_RANGE_MIN,
  OCTAVE_RANGE_MAX,
} from '@/constants';

// ========================================
// ROBOT DISPLAY (not an AccordionContainer — always-visible header content)
// ========================================

/** Confirmed during /interview-me: all 4 audioMode values, not the grid prose's stale 3 — a
 *  radio group that can turn Mute/Solo/Highlight on but never back off would be unusable. */
export const AUDIO_SETTING_SCHEMA: RadioButtonSchema = {
  id: 'robotOptions.audioSetting',
  type: 'radio',
  loreLabel: 'PROBE DIAGNOSTICS',
  humanLabel: 'Audio Setting',
  options: [
    { value: 'none', label: 'Off' },
    { value: 'mute', label: 'Mute' },
    { value: 'solo', label: 'Solo' },
    { value: 'highlight', label: 'Highlight' },
  ],
};

/**
 * Display-only 0-100% in 1% steps; the stored value is 0..1 (Robot.masterVolume). Same
 * display-vs-storage split as Sustain (PING_CONTOUR's SUSTAIN_SCHEMA) — the component consuming
 * this one must convert pct/100 on write and value*100 on read.
 */
export const VOLUME_SCHEMA: SliderLinearSchema = {
  id: 'robotOptions.volume',
  type: 'sliderLinear',
  loreLabel: 'TRANSDUCER PRESSURE INDEX',
  humanLabel: 'Volume',
  min: 0,
  max: 100,
  step: 1,
  unit: '%',
};

/** LFO-modulatable per src/types/lfo.ts's RobotLfoTargetId — editable, per /interview-me
 *  correcting the roadmap's earlier "read-only" framing. */
export const VOLUME_LFO_TARGET: RobotLfoTargetId = 'volume';
export const VOLUME_LFO_ACCORDION_SCHEMA: AccordionSchema = {
  id: 'robotOptions.volume.lfo',
  type: 'accordion',
  humanLabel: 'Modulation',
};

// ========================================
// PING CONTROLS
// ========================================

export const PING_CONTROLS_ACCORDION_SCHEMA: AccordionSchema = {
  id: 'robotOptions.pingControls',
  type: 'accordion',
  loreLabel: 'PING CONTROLS',
  humanLabel: 'Ping Controls',
};

/**
 * Testing-only toggle (see PingControlsDrawer.tsx's clickTrackActive value field and
 * robotOptionsActions.ts's applyClickTrackActive) — overrides the robot's real melody with a
 * fixed 4-quarter-note downbeat pattern so tempo/BPM changes are easy to track by ear. Available
 * in both robot mode (RobotOptionsTab) and company/All broadcast mode (CompanyOptionsSection) —
 * broadcasting it puts every member's playback into click-track mode at once. Rendered first,
 * above Density, so it reads as a mode switch for the rest of the accordion rather than one
 * control among many. PingControlsDrawer.tsx only renders it behind `DEV_TUNING` — same dev-only
 * gate as the Skipped Notes debug counter (App.tsx) — so it never reaches a production build.
 */
export const CLICK_TRACK_SCHEMA: ToggleSchema = {
  id: 'robotOptions.clickTrack',
  type: 'toggle',
  loreLabel: 'CALIBRATION PULSE',
  humanLabel: 'Click Track',
};

/**
 * A SliderLinear, not a Stepper — the grid originally called for a Stepper, but clicking through
 * a 0-100 range one increment at a time was too slow to be usable; a drag/keyboard slider covers
 * the same range in one gesture.
 */
export const DENSITY_SCHEMA: SliderLinearSchema = {
  id: 'robotOptions.density',
  type: 'sliderLinear',
  loreLabel: 'PING DENSITY',
  humanLabel: 'Density',
  min: RHYTHMIC_DENSITY_MIN,
  max: RHYTHMIC_DENSITY_MAX,
  unit: '%',
};

export const MOTIF_LENGTH_SCHEMA: StepperWithToggleSchema = {
  id: 'robotOptions.motifLength',
  type: 'stepperToggle',
  loreLabel: 'PING LENGTH',
  humanLabel: 'Motif Length',
  min: RHYTHMIC_MOTIF_LENGTH_MIN,
  max: RHYTHMIC_MOTIF_LENGTH_MAX,
};

export const OCTAVE_RANGE_MIN_SCHEMA: StepperSchema = {
  id: 'robotOptions.octaveRangeMin',
  type: 'stepper',
  loreLabel: 'PING FREQUENCY RANGES (MIN)',
  humanLabel: 'Octave Range Min',
  min: OCTAVE_RANGE_MIN,
  max: OCTAVE_RANGE_MAX,
};

export const OCTAVE_RANGE_MAX_SCHEMA: StepperSchema = {
  id: 'robotOptions.octaveRangeMax',
  type: 'stepper',
  loreLabel: 'PING FREQUENCY RANGES (MAX)',
  humanLabel: 'Octave Range Max',
  min: OCTAVE_RANGE_MIN,
  max: OCTAVE_RANGE_MAX,
};

export const NOTE_VARIANCE_SCHEMA: StepperWithToggleSchema = {
  id: 'robotOptions.noteVariance',
  type: 'stepperToggle',
  loreLabel: 'PING FREQUENCY VARIANCE',
  humanLabel: 'Note Variance',
  min: NOTE_VARIANCE_MIN,
  max: NOTE_VARIANCE_MAX,
};

/** Plain one-click Button — no confirmation dialog, confirmed during /interview-me for
 *  consistency with every other Button in the app (see docs/specs/ROBOT_OPTIONS.md §7). */
export const RESET_MELODY_SCHEMA: ButtonSchema = {
  id: 'robotOptions.resetMelody',
  type: 'button',
  loreLabel: 'CALIBRATE PING',
  humanLabel: 'Reset Melody',
};

// ========================================
// PING CONTOUR — the robot's one shared ADSR envelope
// ========================================

export const PING_CONTOUR_ACCORDION_SCHEMA: AccordionSchema = {
  id: 'robotOptions.pingContour',
  type: 'accordion',
  loreLabel: 'PING CONTOUR',
  humanLabel: 'Ping Contour',
};

export const ATTACK_SCHEMA: SliderLogSchema = {
  id: 'robotOptions.attack',
  type: 'sliderLog',
  loreLabel: 'COMPRESSION RATE',
  humanLabel: 'Attack',
  min: 0,
  max: 10,
  unit: 's',
};

export const DECAY_SCHEMA: SliderLogSchema = {
  id: 'robotOptions.decay',
  type: 'sliderLog',
  loreLabel: 'STABILIZATION DELAY',
  humanLabel: 'Decay',
  min: 0,
  max: 10,
  unit: 's',
};

/**
 * Display-only 0-100%; the stored value is 0..1 (Robot.ts's ADSREnvelope.sustain). Unlike every
 * other schema in this file, the component consuming this one must convert pct/100 on write and
 * value*100 on read — see PingContourDrawer.tsx.
 */
export const SUSTAIN_SCHEMA: SliderLinearSchema = {
  id: 'robotOptions.sustain',
  type: 'sliderLinear',
  loreLabel: 'PROPAGATION AMPLITUDE',
  humanLabel: 'Sustain',
  min: 0,
  max: 100,
  unit: '%',
};

export const RELEASE_SCHEMA: SliderLogSchema = {
  id: 'robotOptions.release',
  type: 'sliderLog',
  loreLabel: 'RAREFACTION RATE',
  humanLabel: 'Release',
  min: 0,
  max: 10,
  unit: 's',
};

// ========================================
// SIGNATURE ARRAY — 3 fixed layers (Baseline/Coaxial/Harmonic)
// ========================================

export const SIGNATURE_ARRAY_ACCORDION_SCHEMA: AccordionSchema = {
  id: 'robotOptions.signatureArray',
  type: 'accordion',
  loreLabel: 'SIGNATURE ARRAY',
  humanLabel: 'Signature Array',
};

export type SignatureArrayLayerKey = 'layer0' | 'layer1' | 'layer2';

export interface SignatureArrayParamSchema {
  field: 'type' | 'gain' | 'detune' | 'phase' | 'pulseWidth';
  schema: ControlSchema;
  /** Absent only for `type`, which isn't LFO-modulatable. */
  lfoTarget?: RobotLfoTargetId;
  /** The nested accordion wrapping this param's Lfo control — present iff lfoTarget is,
   *  mirroring audioRigConfig.ts's per-param lfoAccordion pattern. */
  lfoAccordion?: AccordionSchema;
}

export interface SignatureArrayLayerBlock {
  key: SignatureArrayLayerKey;
  humanLabel: 'Baseline' | 'Coaxial' | 'Harmonic';
  loreLabel: string;
  /** Undefined for layer0 (Baseline) — always active, no toggle. */
  activeSchema?: ToggleSchema;
  params: SignatureArrayParamSchema[];
}

/** The 5 real WaveformType values only — 'noise' is dropped entirely (Roadmap Phase 9, see
 *  docs/specs/ROBOT_OPTIONS.md §7). Value/label pairs match ROBOT_DATA_GRID.md's Layer Type row. */
const LAYER_TYPE_OPTIONS = [
  { value: 'sine', label: 'SWEEP' },
  { value: 'triangle', label: 'GRADIENT' },
  { value: 'sawtooth', label: 'KINETIC' },
  { value: 'square', label: 'BINARY' },
  { value: 'pulse', label: 'BURST' },
];

function lfoAccordionSchema(key: SignatureArrayLayerKey, field: string): AccordionSchema {
  return { id: `robotOptions.${key}.${field}.lfo`, type: 'accordion', humanLabel: 'Modulation' };
}

function makeLayerBlock(
  key: SignatureArrayLayerKey,
  humanLabel: 'Baseline' | 'Coaxial' | 'Harmonic',
  loreLabel: string,
  includeActiveToggle: boolean,
): SignatureArrayLayerBlock {
  const gainTarget = `${key}.gain` as RobotLfoTargetId;
  const detuneTarget = `${key}.detune` as RobotLfoTargetId;
  const phaseTarget = `${key}.phase` as RobotLfoTargetId;
  const pulseWidthTarget = `${key}.pulseWidth` as RobotLfoTargetId;

  return {
    key,
    humanLabel,
    loreLabel,
    activeSchema: includeActiveToggle
      ? { id: `robotOptions.${key}.active`, type: 'toggle', humanLabel: `${humanLabel} Active` }
      : undefined,
    params: [
      {
        field: 'type',
        schema: {
          id: `robotOptions.${key}.type`, type: 'radio',
          loreLabel: `${loreLabel} GEOMETRY`, humanLabel: `${humanLabel} Type`,
          options: LAYER_TYPE_OPTIONS,
        } satisfies RadioButtonSchema,
      },
      {
        field: 'gain',
        schema: {
          id: `robotOptions.${key}.gain`, type: 'sliderLinear',
          loreLabel: `${loreLabel} SATURATION`, humanLabel: `${humanLabel} Gain`,
          min: 0, max: 2, step: 0.01,
        } satisfies SliderLinearSchema,
        lfoTarget: gainTarget,
        lfoAccordion: lfoAccordionSchema(key, 'gain'),
      },
      {
        field: 'detune',
        schema: {
          id: `robotOptions.${key}.detune`, type: 'sliderCenteredZero',
          loreLabel: `${loreLabel} DRIFT`, humanLabel: `${humanLabel} Detune`,
          min: -50, max: 50, unit: 'cents',
        } satisfies SliderCenteredZeroSchema,
        lfoTarget: detuneTarget,
        lfoAccordion: lfoAccordionSchema(key, 'detune'),
      },
      {
        field: 'phase',
        schema: {
          id: `robotOptions.${key}.phase`, type: 'sliderLinear',
          loreLabel: `${loreLabel} ALIGNMENT`, humanLabel: `${humanLabel} Phase`,
          min: 0, max: 360,
        } satisfies SliderLinearSchema,
        lfoTarget: phaseTarget,
        lfoAccordion: lfoAccordionSchema(key, 'phase'),
      },
      {
        field: 'pulseWidth',
        schema: {
          id: `robotOptions.${key}.pulseWidth`, type: 'sliderLinear',
          loreLabel: `${loreLabel} PULSE WIDTH`, humanLabel: `${humanLabel} Interval`,
          min: 0, max: 1, step: 0.01,
        } satisfies SliderLinearSchema,
        lfoTarget: pulseWidthTarget,
        lfoAccordion: lfoAccordionSchema(key, 'pulseWidth'),
      },
    ],
  };
}

export const SIGNATURE_ARRAY_CONFIG: SignatureArrayLayerBlock[] = [
  makeLayerBlock('layer0', 'Baseline', 'BASELINE', false),
  makeLayerBlock('layer1', 'Coaxial', 'COAXIAL', true),
  makeLayerBlock('layer2', 'Harmonic', 'HARMONIC', true),
];
