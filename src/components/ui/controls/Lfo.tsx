import { DualLabel } from './DualLabel';
import { RadioButton } from './RadioButton';
import { SliderLinear } from './SliderLinear';
import { Toggle } from './Toggle';
import { withActiveClass } from './activeClass';
import { LFO_SHAPES, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '@/types/lfo';
import type { LfoSchema, LfoValue, RadioButtonSchema, SliderLinearSchema, ToggleSchema } from '@/types/controls';
import './Lfo.css';

interface LfoProps {
  schema: LfoSchema;
  value: LfoValue;
  onChange: (value: LfoValue) => void;
  disabled?: boolean;
}

const SHAPE_OPTIONS = LFO_SHAPES.map((shape) => ({ value: shape, label: shape.toUpperCase() }));

/**
 * The Rate slider's own draggable step, and — deliberately the same value —
 * its own draggable minimum. Radix's step grid always anchors to `min`
 * (min + n*step), so anchoring both at 0.25 gives a clean 0.25/0.5/0.75/1.0...
 * grid; anchoring at LFO_RATE_MIN (0.1, the true floor used elsewhere by
 * lfoEngine's clamp and the seed loading range) would instead produce
 * 0.1/0.35/0.6/0.85... A rate seeded below 0.25Hz briefly displays rounded
 * up to it, until the slider is first touched.
 */
const RATE_STEP = 0.25;

/**
 * Composes RadioButton (shape) + two SliderLinears (rate, depth) + Toggle
 * (active) per the grid's OSCILLATION rows. `LfoValue` is a type-only reuse
 * of the real Phase 0 engine type (src/types/lfo.ts) — no import of
 * src/engine/lfoEngine.ts or any Tone object, so this stays presentation-only.
 * The root also carries a plain `isActive` class (see Toggle.tsx) so a
 * consumer can write `.sc-lfo.isActive { ... }`.
 */
export function Lfo({ schema, value, onChange, disabled }: LfoProps) {
  const shapeSchema: RadioButtonSchema = { id: `${schema.id}.shape`, type: 'radio', humanLabel: 'Shape', options: SHAPE_OPTIONS };
  const rateSchema: SliderLinearSchema = { id: `${schema.id}.rate`, type: 'sliderLinear', humanLabel: 'Rate', min: RATE_STEP, max: LFO_RATE_MAX, step: RATE_STEP, unit: 'Hz' };
  const depthSchema: SliderLinearSchema = { id: `${schema.id}.depth`, type: 'sliderLinear', humanLabel: 'Depth', min: LFO_DEPTH_MIN, max: LFO_DEPTH_MAX, unit: '%' };
  const activeSchema: ToggleSchema = { id: `${schema.id}.active`, type: 'toggle', humanLabel: 'Active' };

  return (
    <div className={withActiveClass('sc-lfo', value.active)}>
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
      <Toggle
        schema={activeSchema}
        value={value.active}
        onChange={(active) => onChange({ ...value, active })}
        disabled={disabled}
      />
    </div>
  );
}
