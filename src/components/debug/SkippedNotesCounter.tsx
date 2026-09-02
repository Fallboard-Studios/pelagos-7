import { useDebugStore, SKIPPED_NOTES_HISTORY_MEASURES } from '@/stores/debugStore';

import './SkippedNotesCounter.css';

const AVERAGE_WINDOW_SHORT = 4;

/** Mean of the last `count` entries in `history` (fewer if there aren't
 *  that many yet), rounded to 1 decimal place. `0` for an empty history —
 *  no skips recorded is the good/default state, not a "no data" gap. */
function averageOfLast(history: number[], count: number): string {
  const window = history.slice(-count);
  if (window.length === 0) return '0.0';
  const mean = window.reduce((sum, n) => sum + n, 0) / window.length;
  return mean.toFixed(1);
}

/**
 * Fixed, always-on-top debug overlay (bottom-left) showing the average
 * number of notes AudioEngine's polyphony cap (triggerWithCap) skipped per
 * measure, over the last 4 and the last `SKIPPED_NOTES_HISTORY_MEASURES`
 * (16) measures — src/stores/debugStore.ts's skippedNotesHistory, written
 * by AudioEngine on each measure boundary. Dev-only: mounted in App.tsx
 * behind `DEV_TUNING`, so it never renders in a production build.
 */
export function SkippedNotesCounter() {
  const skippedNotesHistory = useDebugStore((s) => s.skippedNotesHistory);

  const avg4 = averageOfLast(skippedNotesHistory, AVERAGE_WINDOW_SHORT);
  const avg16 = averageOfLast(skippedNotesHistory, SKIPPED_NOTES_HISTORY_MEASURES);

  return (
    <div className="skipped-notes-counter" data-testid="skipped-notes-counter">
      <div className="skipped-notes-counter__label">Skipped Notes / Measure</div>
      <div className="skipped-notes-counter__row">
        <span className="skipped-notes-counter__window">4m</span>
        <span className="skipped-notes-counter__value" data-testid="skipped-notes-avg-4">{avg4}</span>
      </div>
      <div className="skipped-notes-counter__row">
        <span className="skipped-notes-counter__window">16m</span>
        <span className="skipped-notes-counter__value" data-testid="skipped-notes-avg-16">{avg16}</span>
      </div>
    </div>
  );
}
