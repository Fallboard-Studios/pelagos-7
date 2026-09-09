import { useRef, type CSSProperties } from 'react';
import * as Slider from '@radix-ui/react-slider';

import { DualLabel } from './DualLabel';
import { VoxelTrack } from './VoxelTrack';
import { resolveAccessibleName } from './accessibleName';
import { formatDisplayValue } from './formatDisplayValue';
import { useAutoSliderOrientation } from './useAutoSliderOrientation';
import { useCabinetBoxHeight, useVoxelTrackGap } from './useCabinetBoxHeight';
import { useVoxelTrackBoxCount } from './useVoxelTrackBoxCount';
import {
  computeVoxelTrackLength,
  computeVoxelBoxStates,
  computeVoxelTrackTrailingReserve,
  VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT,
} from '@/utils/voxelTrackMath';
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
  const boxSize = useCabinetBoxHeight();
  const gap = useVoxelTrackGap();
  // Vertical always fits against a fixed budget — the caller's own
  // verticalHeight when given, VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT (matching
  // --slider-vertical-height's 256px default) otherwise — never a live
  // ResizeObserver measurement of the parent. That live-measurement path
  // (the hook's own default when explicitAvailableLength is undefined) is
  // genuinely circular for any real container whose own height is
  // auto/shrink-wrapped to its content: the parent's height would depend on
  // this slider's rendered height, which depends on measuring that same
  // parent. Found live in the running app as an infinite resize loop — see
  // VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT's own comment.
  const explicitLength = isVertical ? (verticalHeight ?? VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT) : undefined;
  // Reserves trailing room (horizontal only — see computeVoxelTrackTrailingReserve)
  // for the last box's own pop-out bleed, so a container whose width happens
  // to land on an exact multiple of (boxSize + gap) doesn't leave that bleed
  // to exit Slider.Root/Track's own edge at value === max. Subtracted before
  // fitting a box count (useVoxelTrackBoxCount), then added back below when
  // sizing Slider.Root, so the reserved slack is actually rendered, not just
  // excluded from the fit.
  const trailingReserve = computeVoxelTrackTrailingReserve(orientation);
  const boxCount = useVoxelTrackBoxCount(wrapperRef, orientation, boxSize, gap, explicitLength, trailingReserve);
  const trackLength = computeVoxelTrackLength(boxCount, boxSize, gap) + trailingReserve;
  const states = computeVoxelBoxStates(value, schema.min, schema.max, boxCount);

  const valueLabel = (
    <span className="sc-slider-linear__value">{formatDisplayValue(value)}{schema.unit}</span>
  );

  // Main axis (the direction value travels) is the fitted/quantized track
  // length; cross axis is always the box's own live size — Slider.Root is
  // never left at the stale thin-line-track defaults (SliderLinear.css's
  // own :root-fallback-only 20px) once boxes are actually rendering.
  const rootStyle: CSSProperties = isVertical
    ? { height: trackLength, width: boxSize }
    : { width: trackLength, height: boxSize };

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
