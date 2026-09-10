import { useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { VoxelTrack } from './VoxelTrack';
import { resolveAccessibleName } from './accessibleName';
import { formatDisplayValue } from './formatDisplayValue';
import { useAutoSliderOrientation } from './useAutoSliderOrientation';
import { useVoxelTrackSlider } from './useVoxelTrackSlider';
import { computeVoxelBoxStates } from '@/utils/voxelTrackMath';
import type { SliderLinearSchema } from '@/types/controls';
import './SliderLinear.css';

interface SliderLinearProps {
  schema: SliderLinearSchema;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** On a vertical slider, the box-count-fitting BUDGET (not a literal
   *  applied length — see docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md
   *  §1.7) box count fits within, instead of a live ResizeObserver
   *  measurement of the parent. Omit to fit live against the parent. */
  verticalHeight?: number;
}

/**
 * Linear-scale slider, rendering through the shared voxel-track system
 * (roadmap Phase 11.1.3) — a row of uniform CabinetBox facades in place of
 * the traditional track+handle, self-fitting its own box count live to
 * whatever space its container gives it. All 3 SliderOrientation values.
 * See docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md for the full derivation.
 */
export function SliderLinear({ schema, value, onChange, disabled, verticalHeight }: SliderLinearProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const orientation = useAutoSliderOrientation(wrapperRef, schema.orientation);
  const isVertical = orientation === 'vertical';
  const { boxSize, gap, boxCount, rootStyle } = useVoxelTrackSlider(wrapperRef, orientation, verticalHeight);
  const states = computeVoxelBoxStates(value, schema.min, schema.max, boxCount);

  const valueLabel = (
    <span className="sc-slider-linear__value">{formatDisplayValue(value)}{schema.unit}</span>
  );

  return (
    <div ref={wrapperRef} className="sc-slider-linear" data-orientation={orientation}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      {isVertical && valueLabel}
      <Slider.Root
        className="sc-slider-linear__root"
        orientation={orientation}
        min={schema.min}
        max={schema.max}
        step={schema.step ?? 1}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        disabled={disabled}
        style={rootStyle}
      >
        <Slider.Track className="sc-slider-linear__track">
          <Slider.Range className="sc-slider-linear__range" />
          <VoxelTrack
            states={states}
            boxSize={boxSize}
            gap={gap}
            axis={orientation}
            timelineKeyPrefix={`cabinet-voxel-${schema.id}`}
          />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-linear__thumb" aria-label={resolveAccessibleName(schema)} />
      </Slider.Root>
      {!isVertical && valueLabel}
    </div>
  );
}
