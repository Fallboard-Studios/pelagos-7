import { useEffect, useState, type RefObject } from 'react';
import { computeFittedBoxCount } from '@/utils/voxelTrackMath';

/**
 * Live, self-fitting voxel-track box count. Mirrors useAutoSliderOrientation's
 * exact measurement convention: observes `ref`'s *parent*, never `ref`'s own
 * rendered box (rendering more boxes would otherwise widen the wrapper,
 * which would widen a self-observed measurement, unboundedly). `axis` must
 * already be resolved ('horizontal' | 'vertical', never 'auto') — orientation
 * resolves first, box count fits second
 * (docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.6).
 *
 * `explicitAvailableLength`, when provided, skips live measurement entirely
 * and fits against that fixed number instead — SliderLinear's own
 * verticalHeight prop, on a vertical slider, becomes a fitting BUDGET rather
 * than a literal applied length this way (§1.7).
 */
export function useVoxelTrackBoxCount(
  ref: RefObject<HTMLElement | null>,
  axis: 'horizontal' | 'vertical',
  boxSize: number,
  gap: number,
  explicitAvailableLength?: number,
): number {
  const [measuredLength, setMeasuredLength] = useState(0);

  useEffect(() => {
    if (explicitAvailableLength !== undefined) return;
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const next = axis === 'vertical' ? height : width;
      setMeasuredLength((prev) => (prev === next ? prev : next));
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [ref, axis, explicitAvailableLength]);

  const availableLength = explicitAvailableLength ?? measuredLength;
  return computeFittedBoxCount(availableLength, boxSize, gap);
}
