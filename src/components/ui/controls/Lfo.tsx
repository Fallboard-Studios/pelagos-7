import { DualLabel } from './DualLabel';
import { RadioButton } from './RadioButton';
import { SliderLinear } from './SliderLinear';
import { withActiveClass } from './activeClass';
import { LFO_SHAPES, LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '@/types/lfo';
import type { LfoSchema, LfoValue, RadioButtonSchema, SliderLinearSchema } from '@/types/controls';
import './Lfo.css';

interface LfoProps {
  schema: LfoSchema;
  value: LfoValue;
  onChange: (value: LfoValue) => void;
  disabled?: boolean;
}

const SHAPE_OPTIONS = LFO_SHAPES.map((shape) => ({ value: shape, label: shape.toUpperCase() }));

/**
 * The Rate slider's own draggable step. Radix's step grid always anchors to
 * `min` (min + n*step) — anchoring at LFO_RATE_MIN (0) gives a clean
 * 0/0.25/0.5/0.75/1.0... grid, the same sequence this always produced, now
 * with an extra rung at the bottom: 0 itself is a real, meaningful value —
 * the LFO's "off" state, replacing the removed OSCILLATION STATE toggle
 * (see lfoEngine.ts's connect/disconnect callers).
 */
const RATE_STEP = 0.25;

/**
 * Composes RadioButton (shape) + two SliderLinears (rate, depth) per the
 * grid's OSCILLATION rows. `LfoValue` is a type-only reuse of the real Phase
 * 0 engine type (src/types/lfo.ts) — no import of src/engine/lfoEngine.ts or
 * any Tone object, so this stays presentation-only. The root also carries a
 * plain `isActive` class, now driven by `rate > 0` rather than a separate
 * flag, so a consumer can still write `.sc-lfo.isActive { ... }`.
 */
export function Lfo({ schema, value, onChange, disabled }: LfoProps) {
  const shapeSchema: RadioButtonSchema = { id: `${schema.id}.shape`, type: 'radio', humanLabel: 'Shape', options: SHAPE_OPTIONS };
  const rateSchema: SliderLinearSchema = { id: `${schema.id}.rate`, type: 'sliderLinear', humanLabel: 'Rate', min: LFO_RATE_MIN, max: LFO_RATE_MAX, step: RATE_STEP, unit: 'Hz', orientation: 'auto' };
  const depthSchema: SliderLinearSchema = { id: `${schema.id}.depth`, type: 'sliderLinear', humanLabel: 'Depth', min: LFO_DEPTH_MIN, max: LFO_DEPTH_MAX, unit: '%', orientation: 'auto' };

  return (
    <div className={withActiveClass('sc-lfo', value.rate > 0)}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <RadioButton
        schema={shapeSchema}
        value={value.shape}
        onChange={(shape) => onChange({ ...value, shape: shape as LfoValue['shape'] })}
        disabled={disabled}
      />
      <SliderLinear
        schema={rateSchema}
        value={value.rate}
        onChange={(rate) => onChange({ ...value, rate })}
        disabled={disabled}
      />
      <SliderLinear
        schema={depthSchema}
        value={value.depth}
        onChange={(depth) => onChange({ ...value, depth })}
        disabled={disabled}
      />
    </div>
  );
}
