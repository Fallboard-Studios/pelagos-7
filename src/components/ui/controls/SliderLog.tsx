import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import { sliderLogTToValue, sliderLogValueToT } from './sliderLogMath';
import type { SliderLogSchema } from '@/types/controls';
import './SliderLog.css';

interface SliderLogProps {
  schema: SliderLogSchema;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Logarithmic-scale slider (Attack/Decay/Release: 0s-10s "Logarithmic
 * scaling"), wrapping @radix-ui/react-slider. The Radix track operates on a
 * normalized internal t ∈ [0, 1]; sliderLogMath converts t <-> the schema's
 * real min/max value range both ways.
 */
export function SliderLog({ schema, value, onChange, disabled }: SliderLogProps) {
  const t = sliderLogValueToT(value, schema.min, schema.max);

  return (
    <div className="sc-slider-log">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <Slider.Root
        className="sc-slider-log__root"
        min={0}
        max={1}
        step={0.001}
        value={[t]}
        onValueChange={(values) => onChange(sliderLogTToValue(values[0], schema.min, schema.max))}
        disabled={disabled}
      >
        <Slider.Track className="sc-slider-log__track">
          <Slider.Range className="sc-slider-log__range" />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-log__thumb" aria-label={resolveAccessibleName(schema)} />
      </Slider.Root>
      {schema.unit && <span className="sc-slider-log__value">{value}{schema.unit}</span>}
    </div>
  );
}
