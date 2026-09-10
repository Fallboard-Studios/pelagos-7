import { useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { VoxelTrack } from './VoxelTrack';
import { resolveAccessibleName } from './accessibleName';
import { formatDisplayValue } from './formatDisplayValue';
import { sliderLogTToValue, sliderLogValueToT } from './sliderLogMath';
import { useAutoSliderOrientation } from './useAutoSliderOrientation';
import { useVoxelTrackSlider } from './useVoxelTrackSlider';
import { computeVoxelBoxStates } from '@/utils/voxelTrackMath';
import type { SliderLogSchema } from '@/types/controls';
import './SliderLog.css';

interface SliderLogProps {
  schema: SliderLogSchema;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** On a vertical slider, the box-count-fitting BUDGET (not a literal
   *  applied length — see docs/specs/OBLIQUE_CABINETRY_SLIDER_LOG.md §1.4)
   *  box count fits within, instead of a live ResizeObserver measurement of
   *  the parent. Omit to fit against the fixed VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT
   *  budget. */
  verticalHeight?: number;
}

/**
 * Logarithmic-scale slider (Attack/Decay/Release: 0s-10s "Logarithmic
 * scaling"), rendering through the shared voxel-track system (roadmap
 * 11.1.3/11.1.4) — a row of uniform CabinetBox facades in place of the
 * traditional track+handle, self-fitting its own box count live to
 * whatever space its container gives it, same as SliderLinear. Box
 * placement uses this component's own normalized t (the same value already
 * fed to Radix's own Slider.Root), not the raw log-scaled value — see
 * docs/specs/OBLIQUE_CABINETRY_SLIDER_LOG.md §1.3. sliderLogMath's actual
 * curve is unchanged.
 */
export function SliderLog({ schema, value, onChange, disabled, verticalHeight }: SliderLogProps) {
  const t = sliderLogValueToT(value, schema.min, schema.max);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const orientation = useAutoSliderOrientation(wrapperRef, schema.orientation);
  const isVertical = orientation === 'vertical';
  const { boxSize, gap, boxCount, rootStyle } = useVoxelTrackSlider(wrapperRef, orientation, verticalHeight);
  const states = computeVoxelBoxStates(t, 0, 1, boxCount);

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
        style={rootStyle}
      >
        <Slider.Track className="sc-slider-log__track">
          <Slider.Range className="sc-slider-log__range" />
          <VoxelTrack
            states={states}
            boxSize={boxSize}
            gap={gap}
            axis={orientation}
            timelineKeyPrefix={`cabinet-voxel-${schema.id}`}
          />
        </Slider.Track>
        <Slider.Thumb className="sc-slider-log__thumb" aria-label={resolveAccessibleName(schema)} />
      </Slider.Root>
      {!isVertical && valueLabel}
    </div>
  );
}
