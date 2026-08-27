import { describe, it, expect } from 'vitest';
import {
  AUDIO_SETTING_SCHEMA,
  VOLUME_SCHEMA,
  VOLUME_LFO_TARGET,
  DENSITY_SCHEMA,
  MOTIF_LENGTH_SCHEMA,
  OCTAVE_RANGE_MIN_SCHEMA,
  OCTAVE_RANGE_MAX_SCHEMA,
  NOTE_VARIANCE_SCHEMA,
  RESET_MELODY_SCHEMA,
  ATTACK_SCHEMA,
  DECAY_SCHEMA,
  SUSTAIN_SCHEMA,
  RELEASE_SCHEMA,
  SIGNATURE_ARRAY_CONFIG,
} from './robotOptionsConfig';
import { CONTROL_SCHEMA_TYPES } from '@/types/controls';
import { ROBOT_LFO_TARGET_IDS } from '@/types/lfo';
import { RHYTHMIC_DENSITY_MIN, RHYTHMIC_DENSITY_MAX, OCTAVE_RANGE_MIN, OCTAVE_RANGE_MAX } from '@/constants';

const ALL_TOP_LEVEL_SCHEMAS = [
  AUDIO_SETTING_SCHEMA,
  VOLUME_SCHEMA,
  DENSITY_SCHEMA,
  MOTIF_LENGTH_SCHEMA,
  OCTAVE_RANGE_MIN_SCHEMA,
  OCTAVE_RANGE_MAX_SCHEMA,
  NOTE_VARIANCE_SCHEMA,
  RESET_MELODY_SCHEMA,
  ATTACK_SCHEMA,
  DECAY_SCHEMA,
  SUSTAIN_SCHEMA,
  RELEASE_SCHEMA,
];

describe('robotOptionsConfig', () => {
  it('every top-level schema type is one of the 13 closed-set ControlSchema variants', () => {
    ALL_TOP_LEVEL_SCHEMAS.forEach((schema) => {
      expect(CONTROL_SCHEMA_TYPES).toContain(schema.type);
    });
  });

  it('Density uses the real RHYTHMIC_DENSITY_MIN/MAX (0-100), not the stale grid range (1-16)', () => {
    expect(DENSITY_SCHEMA.min).toBe(RHYTHMIC_DENSITY_MIN);
    expect(DENSITY_SCHEMA.max).toBe(RHYTHMIC_DENSITY_MAX);
    expect(DENSITY_SCHEMA.min).toBe(0);
    expect(DENSITY_SCHEMA.max).toBe(100);
  });

  it('Octave Range Min/Max use the real OCTAVE_RANGE_MIN/MAX (1-7)', () => {
    expect(OCTAVE_RANGE_MIN_SCHEMA.min).toBe(OCTAVE_RANGE_MIN);
    expect(OCTAVE_RANGE_MIN_SCHEMA.max).toBe(OCTAVE_RANGE_MAX);
    expect(OCTAVE_RANGE_MAX_SCHEMA.min).toBe(OCTAVE_RANGE_MIN);
    expect(OCTAVE_RANGE_MAX_SCHEMA.max).toBe(OCTAVE_RANGE_MAX);
  });

  it('Audio Setting has all 4 options, including Off — not the grid prose\'s stale 3', () => {
    expect(AUDIO_SETTING_SCHEMA.options.map((o) => o.value).sort()).toEqual(
      ['highlight', 'mute', 'none', 'solo'].sort()
    );
  });

  it('Volume displays 0-100% in 1% steps (stored as 0..1 - conversion happens at the component boundary, same as Sustain)', () => {
    expect(VOLUME_SCHEMA.min).toBe(0);
    expect(VOLUME_SCHEMA.max).toBe(100);
    expect(VOLUME_SCHEMA.step).toBe(1);
    expect(VOLUME_SCHEMA.unit).toBe('%');
    expect(VOLUME_LFO_TARGET).toBe('volume');
    expect(ROBOT_LFO_TARGET_IDS).toContain(VOLUME_LFO_TARGET);
  });

  it('Ping Contour\'s Attack/Decay/Release edit range is 0-10s (confirmed, not the seed-generation range)', () => {
    [ATTACK_SCHEMA, DECAY_SCHEMA, RELEASE_SCHEMA].forEach((schema) => {
      expect(schema.min).toBe(0);
      expect(schema.max).toBe(10);
      expect(schema.unit).toBe('s');
    });
  });

  it('Sustain is a 0-100% display slider (conversion to the stored 0..1 value happens at the component boundary)', () => {
    expect(SUSTAIN_SCHEMA.min).toBe(0);
    expect(SUSTAIN_SCHEMA.max).toBe(100);
    expect(SUSTAIN_SCHEMA.unit).toBe('%');
  });

  describe('SIGNATURE_ARRAY_CONFIG', () => {
    it('has exactly 3 blocks, labeled Baseline/Coaxial/Harmonic in order', () => {
      expect(SIGNATURE_ARRAY_CONFIG).toHaveLength(3);
      expect(SIGNATURE_ARRAY_CONFIG.map((b) => b.humanLabel)).toEqual(['Baseline', 'Coaxial', 'Harmonic']);
      expect(SIGNATURE_ARRAY_CONFIG.map((b) => b.key)).toEqual(['layer0', 'layer1', 'layer2']);
    });

    it('only Coaxial and Harmonic carry an activeSchema — Baseline is always active, no toggle', () => {
      expect(SIGNATURE_ARRAY_CONFIG[0].activeSchema).toBeUndefined();
      expect(SIGNATURE_ARRAY_CONFIG[1].activeSchema).toBeDefined();
      expect(SIGNATURE_ARRAY_CONFIG[2].activeSchema).toBeDefined();
    });

    it('each block\'s Type param has exactly the 5 real waveform options — no Noise', () => {
      SIGNATURE_ARRAY_CONFIG.forEach((block) => {
        const typeParam = block.params.find((p) => p.field === 'type');
        expect(typeParam).toBeDefined();
        const schema = typeParam!.schema as { options: { value: string }[] };
        const values = schema.options.map((o) => o.value).sort();
        expect(values).toEqual(['pulse', 'sawtooth', 'sine', 'square', 'triangle']);
        expect(values).not.toContain('noise');
      });
    });

    it('Detune uses the confirmed ±50 cent range (not the removed per-layer editor\'s ±100)', () => {
      SIGNATURE_ARRAY_CONFIG.forEach((block) => {
        const detuneParam = block.params.find((p) => p.field === 'detune');
        const schema = detuneParam!.schema as { min: number; max: number };
        expect(schema.min).toBe(-50);
        expect(schema.max).toBe(50);
      });
    });

    it('Interval/pulseWidth is a 0-1 slider on every block, with a step fine enough to be more than an on/off toggle', () => {
      // Regression: SliderLinear defaults an unset `step` to 1 (SliderLinear.tsx)
      // — on a 0-1 range that leaves exactly two reachable positions, 0 and 1,
      // same class of bug audioRigConfig.ts's delay/reverb 0-1 sliders already
      // guard against with an explicit step: 0.01.
      SIGNATURE_ARRAY_CONFIG.forEach((block) => {
        const pw = block.params.find((p) => p.field === 'pulseWidth');
        const schema = pw!.schema as { min: number; max: number; step?: number };
        expect(schema.min).toBe(0);
        expect(schema.max).toBe(1);
        expect(schema.step).toBe(0.01);
      });
    });

    it('Gain is a 0-2 slider on every block, with a step fine enough for more than 3 reachable positions', () => {
      // Same missing-step class as Interval/pulseWidth above — SliderLinear defaults an
      // unset step to 1, which on a 0-2 range leaves only 0/1/2 reachable.
      SIGNATURE_ARRAY_CONFIG.forEach((block) => {
        const gain = block.params.find((p) => p.field === 'gain');
        const schema = gain!.schema as { min: number; max: number; step?: number };
        expect(schema.min).toBe(0);
        expect(schema.max).toBe(2);
        expect(schema.step).toBe(0.01);
      });
    });

    it('every LFO-flagged param\'s lfoTarget is a real RobotLfoTargetId matching its own layer index', () => {
      const expectedPrefixes = ['layer0', 'layer1', 'layer2'];
      SIGNATURE_ARRAY_CONFIG.forEach((block, i) => {
        block.params
          .filter((p) => p.lfoTarget !== undefined)
          .forEach((p) => {
            expect(ROBOT_LFO_TARGET_IDS).toContain(p.lfoTarget);
            expect(p.lfoTarget!.startsWith(expectedPrefixes[i])).toBe(true);
            expect(p.lfoAccordion).toBeDefined();
          });
      });
    });

    it('the Type param is never LFO-flagged (not a modulatable numeric param)', () => {
      SIGNATURE_ARRAY_CONFIG.forEach((block) => {
        const typeParam = block.params.find((p) => p.field === 'type');
        expect(typeParam!.lfoTarget).toBeUndefined();
      });
    });

    it('every param schema type is one of the 13 closed-set ControlSchema variants', () => {
      SIGNATURE_ARRAY_CONFIG.forEach((block) => {
        block.params.forEach((p) => {
          expect(CONTROL_SCHEMA_TYPES).toContain(p.schema.type);
        });
      });
    });
  });
});
