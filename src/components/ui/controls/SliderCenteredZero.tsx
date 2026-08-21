import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { computeFillRect } from './sliderCenteredZeroMath';
import type { SliderCenteredZeroSchema } from '@/types/controls';
import './SliderCenteredZero.css';

interface SliderCenteredZeroProps {
  schema: SliderCenteredZeroSchema;
  value: number;
  onChange: (value: number) => void;
}

/**
 * Zero-anchored slider (Detune: -50/+50 cents). Radix's own Slider.Range
 * fills from the track start, not from a center zero-point, so it's kept in
 * the DOM (visually hidden, for structural/a11y parity) while a custom fill
 * <div> spans from the computed zero point to the thumb's position — the
 * one documented exception to "no inline style objects" (the fill's
 * left/width are a computed transform, not a static value).
 */
export function SliderCenteredZero({ schema, value, onChange }: SliderCenteredZeroProps) {
  const fill = computeFillRect(value, schema.min, schema.max);

  return (
    <div className="sc-slider-centered-zero">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <Slider.Root
        className="sc-slider-centered-zero__root"
        min={schema.min}
        max={schema.max}
        step={1}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
      >
        <Slider.Track className="sc-slider-centered-zero__track">
          <Slider.Range className="sc-slider-centered-zero__range" />
          <div
            className="sc-slider-centered-zero__fill"
            style={{ left: `${fill.left}%`, width: `${fill.width}%` }}
          />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-centered-zero__thumb" aria-label={schema.humanLabel ?? schema.loreLabel} />
      </Slider.Root>
      {schema.unit && <span className="sc-slider-centered-zero__value">{value}{schema.unit}</span>}
    </div>
  );
}
