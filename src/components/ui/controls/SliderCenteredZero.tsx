import { useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import { formatDisplayValue } from './formatDisplayValue';
import { computeFillRect } from './sliderCenteredZeroMath';
import { useAutoSliderOrientation } from './useAutoSliderOrientation';
import type { SliderCenteredZeroSchema } from '@/types/controls';
import './SliderCenteredZero.css';

interface SliderCenteredZeroProps {
  schema: SliderCenteredZeroSchema;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Vertical track height in px, used only when the resolved orientation is
   *  'vertical'. Omit to use the --slider-vertical-height default (256px). */
  verticalHeight?: number;
}

/**
 * Zero-anchored slider (Detune: -50/+50 cents), all 3 SliderOrientation
 * values. Radix's own Slider.Range fills from the track start, not from a
 * center zero-point, so it's kept in the DOM (visually hidden, for
 * structural/a11y parity) while a custom fill <div> spans from the computed
 * zero point to the thumb's position — the one documented exception to "no
 * inline style objects" (the fill's positioning is a computed transform, not
 * a static value).
 *
 * computeFillRect's { left, width } percentages are axis-agnostic — 0% is
 * always schema.min, 100% is always schema.max, along whichever axis the
 * value travels. Radix's vertical slider already places min at the bottom
 * and max at the top by default (the standard fader-up-means-more
 * convention), so the same numbers are reused unchanged on the vertical
 * axis, applied as bottom/height instead of left/width.
 */
export function SliderCenteredZero({ schema, value, onChange, disabled, verticalHeight }: SliderCenteredZeroProps) {
  const fill = computeFillRect(value, schema.min, schema.max);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const orientation = useAutoSliderOrientation(wrapperRef, schema.orientation);
  const isVertical = orientation === 'vertical';
  const fillStyle = isVertical
    ? { bottom: `${fill.left}%`, height: `${fill.width}%` }
    : { left: `${fill.left}%`, width: `${fill.width}%` };

  const valueLabel = (
    <span className="sc-slider-centered-zero__value">{formatDisplayValue(value)}{schema.unit}</span>
  );

  return (
    <div ref={wrapperRef} className="sc-slider-centered-zero" data-orientation={orientation}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      {isVertical && valueLabel}
      <Slider.Root
        className="sc-slider-centered-zero__root"
        orientation={orientation}
        min={schema.min}
        max={schema.max}
        step={1}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        disabled={disabled}
        style={isVertical && verticalHeight !== undefined ? { height: verticalHeight } : undefined}
      >
        <Slider.Track className="sc-slider-centered-zero__track">
          <Slider.Range className="sc-slider-centered-zero__range" />
          <div className="sc-slider-centered-zero__fill" style={fillStyle} />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-centered-zero__thumb" aria-label={resolveAccessibleName(schema)} />
      </Slider.Root>
      {!isVertical && valueLabel}
    </div>
  );
}
