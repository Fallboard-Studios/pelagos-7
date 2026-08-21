import { DualLabel } from './DualLabel';
import { RadioButton } from './RadioButton';
import { SliderLinear } from './SliderLinear';
import { Toggle } from './Toggle';
import { LFO_SHAPES, LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '@/types/lfo';
import type { LfoSchema, LfoValue, RadioButtonSchema, SliderLinearSchema, ToggleSchema } from '@/types/controls';
import './Lfo.css';

interface LfoProps {
  schema: LfoSchema;
  value: LfoValue;
  onChange: (value: LfoValue) => void;
}

const SHAPE_OPTIONS = LFO_SHAPES.map((shape) => ({ value: shape, label: shape.toUpperCase() }));

/**
 * Composes RadioButton (shape) + two SliderLinears (rate, depth) + Toggle
 * (active) per the grid's OSCILLATION rows. `LfoValue` is a type-only reuse
 * of the real Phase 0 engine type (src/types/lfo.ts) — no import of
 * src/engine/lfoEngine.ts or any Tone object, so this stays presentation-only.
 */
export function Lfo({ schema, value, onChange }: LfoProps) {
  const shapeSchema: RadioButtonSchema = { id: `${schema.id}.shape`, type: 'radio', humanLabel: 'Shape', options: SHAPE_OPTIONS };
  const rateSchema: SliderLinearSchema = { id: `${schema.id}.rate`, type: 'sliderLinear', humanLabel: 'Rate', min: LFO_RATE_MIN, max: LFO_RATE_MAX, unit: 'Hz' };
  const depthSchema: SliderLinearSchema = { id: `${schema.id}.depth`, type: 'sliderLinear', humanLabel: 'Depth', min: LFO_DEPTH_MIN, max: LFO_DEPTH_MAX, unit: '%' };
  const activeSchema: ToggleSchema = { id: `${schema.id}.active`, type: 'toggle', humanLabel: 'Active' };

  return (
    <div className="sc-lfo">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <RadioButton
        schema={shapeSchema}
        value={value.shape}
        onChange={(shape) => onChange({ ...value, shape: shape as LfoValue['shape'] })}
      />
      <SliderLinear
        schema={rateSchema}
        value={value.rate}
        onChange={(rate) => onChange({ ...value, rate })}
      />
      <SliderLinear
        schema={depthSchema}
        value={value.depth}
        onChange={(depth) => onChange({ ...value, depth })}
      />
      <Toggle
        schema={activeSchema}
        value={value.active}
        onChange={(active) => onChange({ ...value, active })}
      />
    </div>
  );
}
