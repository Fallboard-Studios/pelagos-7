import { useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import { formatDisplayValue } from './formatDisplayValue';
import { sliderLogTToValue, sliderLogValueToT } from './sliderLogMath';
import { useAutoSliderOrientation } from './useAutoSliderOrientation';
import type { SliderLogSchema } from '@/types/controls';
import './SliderLog.css';

interface SliderLogProps {
  schema: SliderLogSchema;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Vertical track height in px, used only when the resolved orientation is
   *  'vertical'. Omit to use the --slider-vertical-height default (256px). */
  verticalHeight?: number;
}

/**
 * Logarithmic-scale slider (Attack/Decay/Release: 0s-10s "Logarithmic
 * scaling"), wrapping @radix-ui/react-slider, all 3 SliderOrientation values.
 * The Radix track operates on a normalized internal t ∈ [0, 1]; sliderLogMath
 * converts t <-> the schema's real min/max value range both ways — orthogonal
 * to orientation, unchanged.
 */
export function SliderLog({ schema, value, onChange, disabled, verticalHeight }: SliderLogProps) {
  const t = sliderLogValueToT(value, schema.min, schema.max);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const orientation = useAutoSliderOrientation(wrapperRef, schema.orientation);
  const isVertical = orientation === 'vertical';

  const valueLabel = (
    <span className="sc-slider-log__value">{formatDisplayValue(value)}{schema.unit}</span>
  );

  return (
    <div ref={wrapperRef} className="sc-slider-log" data-orientation={orientation}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      {isVertical && valueLabel}
      <Slider.Root
        className="sc-slider-log__root"
        orientation={orientation}
        min={0}
        max={1}
        step={0.001}
        value={[t]}
        onValueChange={(values) => onChange(sliderLogTToValue(values[0], schema.min, schema.max))}
        disabled={disabled}
        style={isVertical && verticalHeight !== undefined ? { height: verticalHeight } : undefined}
      >
        <Slider.Track className="sc-slider-log__track">
          <Slider.Range className="sc-slider-log__range" />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-log__thumb" aria-label={resolveAccessibleName(schema)} />
      </Slider.Root>
      {!isVertical && valueLabel}
    </div>
  );
}
