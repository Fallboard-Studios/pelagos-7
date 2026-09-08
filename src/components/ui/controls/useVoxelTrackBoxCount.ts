import { useEffect, useState, type RefObject } from 'react';
import { computeFittedBoxCount } from '@/utils/voxelTrackMath';

/**
 * Live, self-fitting voxel-track box count. `axis` must already be resolved
 * ('horizontal' | 'vertical', never 'auto') — orientation resolves first,
 * box count fits second (docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.6).
 *
 * Measurement target is axis-dependent, per that spec's own §1.5 amendment
 * (originally specified as "always observe the parent," corrected after a
 * real running-app regression traced it to every ancestor in a control's
 * layout chain needing to be individually, correctly non-content-dependent
 * for the measurement to come out right):
 *
 * - **Horizontal** observes `ref`'s own element directly. Its width is
 *   externally determined — a plain block box fills whatever its containing
 *   block gives it, regardless of its own children's size — and never
 *   inflated by its own oversized content (`.sc-slider-linear`'s
 *   `overflow-x: auto` contains that). Self-observation here carries none
 *   of the "measuring my own consequence" circularity `useAutoSliderOrientation`
 *   avoids for `'auto'` orientation (where the element's size IS a direct
 *   result of the very decision being measured) — it just reads whatever
 *   width the browser already, correctly, externally decided, however deep
 *   or complex the ancestor layout chain is.
 * - **Vertical** still observes `ref`'s *parent*. `.sc-slider-linear` is
 *   `display: inline-flex` there, which DOES shrink-wrap its height to
 *   content by default — self-observing height would be genuinely
 *   circular. No real vertical `SliderLinear` consumer exists yet to
 *   verify a self-observing fix against, so this stays conservative.
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
    const target = axis === 'horizontal' ? ref.current : ref.current?.parentElement;
    if (!target) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const next = axis === 'vertical' ? height : width;
      setMeasuredLength((prev) => (prev === next ? prev : next));
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [ref, axis, explicitAvailableLength]);

  const availableLength = explicitAvailableLength ?? measuredLength;
  return computeFittedBoxCount(availableLength, boxSize, gap);
}
