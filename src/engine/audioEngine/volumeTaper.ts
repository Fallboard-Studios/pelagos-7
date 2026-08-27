/**
 * Roadmap Phase 9 Volume fix: human loudness perception is roughly logarithmic, so mapping a
 * linear 0..1 UI position straight to gain feels almost flat across most of the fader's range —
 * position 1.0 -> 0.5 is only a ~6dB drop, barely perceptible — and only "does something" near
 * the very top. This maps position through a standard logarithmic/exponential taper instead: 0 is
 * always true silence (a hard floor, matching AudioEngine's mute-at-0 guarantee — not just "very
 * quiet"), 1 is always exactly unity gain (0dB, full volume), and everything in between falls off
 * exponentially across `dbRange` decibels, so the low end of the fader does most of the audible
 * work — the same shape a real volume fader uses.
 */

/** Default taper range — a commonly-used span for a perceptually-natural UI volume control (wide
 *  enough that the low end of the fader still does meaningful work, without over-compressing the
 *  audible range into an unusably small slice of the slider). Tune here if the feel needs adjusting. */
export const VOLUME_TAPER_DB_RANGE = 40;

export function volumePositionToGain(position: number, dbRange: number = VOLUME_TAPER_DB_RANGE): number {
  if (position <= 0) return 0;
  if (position >= 1) return 1;
  const db = (position - 1) * dbRange;
  return 10 ** (db / 20);
}
