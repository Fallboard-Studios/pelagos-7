import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import type { SliderLinearSchema } from '@/types/controls';
import './SliderLinear.css';

interface SliderLinearProps {
  schema: SliderLinearSchema;
  value: number;
  onChange: (value: number) => void;
}

/** Linear-scale slider wrapping @radix-ui/react-slider. */
export function SliderLinear({ schema, value, onChange }: SliderLinearProps) {
  return (
    <div className="sc-slider-linear">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <Slider.Root
        className="sc-slider-linear__root"
        min={schema.min}
        max={schema.max}
        step={schema.step ?? 1}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
      >
        <Slider.Track className="sc-slider-linear__track">
          <Slider.Range className="sc-slider-linear__range" />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-linear__thumb" aria-label={resolveAccessibleName(schema)} />
      </Slider.Root>
      {schema.unit && <span className="sc-slider-linear__value">{value}{schema.unit}</span>}
    </div>
  );
}
