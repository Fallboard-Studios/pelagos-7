import { useMemo, type CSSProperties, type RefObject } from 'react';
import { useCabinetBoxHeight, useVoxelTrackGap } from './useCabinetBoxHeight';
import { useVoxelTrackBoxCount } from './useVoxelTrackBoxCount';
import {
  computeVoxelTrackLength,
  computeVoxelTrackTrailingReserve,
  VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT,
} from '@/utils/voxelTrackMath';

export interface VoxelTrackSliderLayout {
  boxSize: number;
  gap: number;
  boxCount: number;
  trackLength: number;
  /** Ready to spread directly onto Slider.Root's own `style` prop. */
  rootStyle: CSSProperties;
}

/**
 * Shared voxel-track slider layout (roadmap Phase 11.1.4) — the box-count/
 * track-length/Slider.Root-sizing glue SliderLinear.tsx first wrote inline
 * (roadmap 11.1.3), extracted so SliderLog.tsx (this item's own new
 * consumer) doesn't need a second copy, and SliderLinear.tsx itself
 * retrofitted to call this instead of repeating the logic. See
 * docs/specs/OBLIQUE_CABINETRY_SLIDER_LOG.md §1.1.
 *
 * `orientation` must already be resolved ('horizontal' | 'vertical', never
 * 'auto') — each consumer calls useAutoSliderOrientation itself first, same
 * precondition useVoxelTrackBoxCount already documents. `verticalHeight`,
 * on a vertical slider, is a fitting BUDGET the box count fits within, not
 * a literal applied length — omitted, it falls back to the fixed
 * VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT rather than a live parent measurement
 * (see that constant's own comment for why: a live measurement is
 * genuinely circular for any container whose height auto-sizes to its
 * content).
 */
export function useVoxelTrackSlider(
  wrapperRef: RefObject<HTMLElement | null>,
  orientation: 'horizontal' | 'vertical',
  verticalHeight?: number,
): VoxelTrackSliderLayout {
  const boxSize = useCabinetBoxHeight();
  const gap = useVoxelTrackGap();
  const isVertical = orientation === 'vertical';
  const explicitLength = isVertical ? (verticalHeight ?? VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT) : undefined;
  const trailingReserve = computeVoxelTrackTrailingReserve(orientation);
  const boxCount = useVoxelTrackBoxCount(wrapperRef, orientation, boxSize, gap, explicitLength, trailingReserve);
  const trackLength = computeVoxelTrackLength(boxCount, boxSize, gap) + trailingReserve;

  const rootStyle = useMemo<CSSProperties>(
    () => (isVertical ? { height: trackLength, width: boxSize } : { width: trackLength, height: boxSize }),
    [isVertical, trackLength, boxSize],
  );

  return { boxSize, gap, boxCount, trackLength, rootStyle };
}
