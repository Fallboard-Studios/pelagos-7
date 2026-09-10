import { useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { VoxelTrack } from './VoxelTrack';
import { resolveAccessibleName } from './accessibleName';
import { formatDisplayValue } from './formatDisplayValue';
import { useAutoSliderOrientation } from './useAutoSliderOrientation';
import { useVoxelTrackSlider } from './useVoxelTrackSlider';
import { computeVoxelBoxStatesCenteredZero } from '@/utils/voxelTrackMath';
import type { SliderCenteredZeroSchema } from '@/types/controls';
import './SliderCenteredZero.css';

interface SliderCenteredZeroProps {
  schema: SliderCenteredZeroSchema;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** On a vertical slider, the box-count-fitting BUDGET (not a literal
   *  applied length — see useVoxelTrackSlider's forceEven option, which
   *  additionally rounds the fitted count to always be even) the box count
   *  fits within. Omit to fit against the fixed VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT
   *  budget. */
  verticalHeight?: number;
}

/**
 * Zero-anchored slider (Detune, EQ3 bands, LFO Rate/Depth Drift), rendering
 * through the shared voxel-track system (roadmap 11.1.3-11.1.5) — a row of
 * uniform CabinetBox facades split into two independent halves at a fixed
 * dead-center seam (never the schema's own proportional zero point), each
 * filling outward from the seam toward its own physical end. See
 * docs/specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md for the full
 * derivation. Unlike SliderLog, there's no t-curve here — Slider.Root keeps
 * using the schema's literal min/max/value, exactly as before this item.
 */
export function SliderCenteredZero({ schema, value, onChange, disabled, verticalHeight }: SliderCenteredZeroProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const orientation = useAutoSliderOrientation(wrapperRef, schema.orientation);
  const isVertical = orientation === 'vertical';
  const { boxSize, gap, boxCount, rootStyle } = useVoxelTrackSlider(wrapperRef, orientation, verticalHeight, {
    forceEven: true,
  });
  const states = computeVoxelBoxStatesCenteredZero(value, schema.min, schema.max, boxCount);

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
        style={rootStyle}
      >
        <Slider.Track className="sc-slider-centered-zero__track">
          <Slider.Range className="sc-slider-centered-zero__range" />
          <VoxelTrack
            states={states}
            boxSize={boxSize}
            gap={gap}
            axis={orientation}
            timelineKeyPrefix={`cabinet-voxel-${schema.id}`}
          />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-centered-zero__thumb" aria-label={resolveAccessibleName(schema)} />
      </Slider.Root>
      {!isVertical && valueLabel}
    </div>
  );
}
