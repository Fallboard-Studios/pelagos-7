import { useEffect, useState, type RefObject } from 'react';

/**
 * Reserved width for the volume slider (row 1) when it merges inline with
 * the button row (row 3) — without this, the buttons alone technically
 * "fitting" would crush the slider to 0 the instant there's just enough
 * room for the buttons. Starting value matches the volume slider's own
 * existing CSS width (80px, TransportBar.css's .transport-bar__volume-slider)
 * — an engineering default, not separately confirmed with the user; worth a
 * visual sanity check during Implement. docs/specs/HEADER_HUB_CONSOLIDATION.md §7.
 */
export const MIN_VOLUME_RESERVE_PX = 80;

/**
 * True once the header's available width can fit `buttonCount` buttons at
 * `boxSize`px each (plus `gap` between them, plus MIN_VOLUME_RESERVE_PX for
 * the volume slider) — the threshold for merging row 1 (volume) and row 3
 * (buttons) into one inline row. Directly mirrors useVoxelTrackBoxCount's
 * ResizeObserver-on-a-ref shape (roadmap 11.1.3) — observes the ref's own
 * element directly (its width is externally determined by its containing
 * block, never inflated by its own content), just answering a boolean
 * instead of a count. Row 2 (time+temp) never consults this hook at all —
 * it stays its own row regardless (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.5).
 */
export function useHeaderRowFit(
  ref: RefObject<HTMLElement | null>,
  buttonCount: number,
  boxSize: number,
  gap: number,
): boolean {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  const buttonsRowMinWidth = buttonCount * boxSize + (buttonCount - 1) * gap;
  return width >= buttonsRowMinWidth + MIN_VOLUME_RESERVE_PX;
}
