/**
 * Randomizes the two decorative `linear-gradient`s behind the tablet
 * (`.real-world::before`/`::after`, App.css) once per page load. Colors stay
 * fixed, in their original stop order — only each gradient's angle and its
 * stops' breakpoint percentages vary. Every transition is a genuine blend:
 * no two stops are ever allowed to land close enough to read as a hard
 * color edge (a flat band), even by rare coincidence — see
 * MIN_GAP/drawSpreadPercents below. `transparent` is treated as an ordinary
 * color value here — never swapped for anything else.
 *
 * The three non-transparent colors are sourced from colorTheme.json (the
 * `vent` family, plus `shadowDepth` for the darkest neutral tone) rather
 * than hardcoded hex — the same `vent` tones OceanScene.tsx already draws
 * its own atmospheric depth-gradient overlays from, so this backdrop reads
 * as part of the same theme rather than an arbitrary, disconnected pick.
 * `vent.shadow` and `vent.base` sit only 2° apart in hue, and shadowDepth is
 * fully desaturated (s: 0) — no pair here is hue-opposed enough to blend
 * into a muddy gray, so no extra guard against that is needed on top of
 * this specific palette.
 *
 * Plain Math.random() by default, not the app's seeded-noise system — this
 * is a decorative backdrop behind the fictional device, not part of any
 * deterministic Attenuation Style/locale content.
 */
import colorTheme from '@/constants/colorTheme.json';
import { hslToString } from '@/utils/colorUtils';

// ========================================
// TYPES
// ========================================

/** Returns a value in [0, 1) — the same contract as Math.random(). Injectable for tests. */
export type RandomSource = () => number;

// ========================================
// CONSTANTS
// ========================================

/** Percentage range candidate stops are drawn from — padded off 0/100 so a
 *  stop never lands exactly on the box edge. */
const MIN_PCT = 4;
const MAX_PCT = 96;

/** Minimum separation (percentage points) enforced between every adjacent
 *  pair of stops — guarantees a real, visible blend at every transition,
 *  never two stops landing close enough to read as a hard color edge. */
const MIN_GAP = 3;

/** The gradients' three fixed non-transparent colors, sourced from
 *  colorTheme.json — see the module doc comment above for why `vent`. */
const NEUTRAL_DARK = hslToString(colorTheme.shadowDepth);
const VENT_SHADOW = hslToString(colorTheme.vent.shadow);
const VENT_BASE = hslToString(colorTheme.vent.base);

// ========================================
// INTERNAL HELPERS
// ========================================

function randomAngle(rng: RandomSource): number {
  // floor, not round — round can push rng() values near 1 to exactly 360,
  // outside the promised [0, 360) range (360deg is the same angle as 0deg
  // anyway, so no coverage is lost).
  return Math.floor(rng() * 360);
}

function formatPercent(pct: number): string {
  return `${Math.round(pct * 10) / 10}%`;
}

/**
 * N ascending percentages, each drawn from its own equal-width bucket
 * across [MIN_PCT, MAX_PCT], with MIN_GAP of guaranteed clearance shaved
 * off each bucket's edges before the random draw. Ascending order falls
 * out for free (bucket i+1 never starts before bucket i ends) — no sort
 * needed, and unlike independent draws + sort, the minimum gap holds by
 * construction, not by chance.
 */
function drawSpreadPercents(count: number, rng: RandomSource): number[] {
  const bucketWidth = (MAX_PCT - MIN_PCT) / count;
  const jitterRange = Math.max(0, bucketWidth - MIN_GAP);
  return Array.from({ length: count }, (_, i) => {
    const bucketStart = MIN_PCT + i * bucketWidth;
    return bucketStart + MIN_GAP / 2 + rng() * jitterRange;
  });
}

// ========================================
// PUBLIC API
// ========================================

export function generateRealWorldGradients(rng: RandomSource = Math.random): { before: string; after: string } {
  const beforeAngle = randomAngle(rng);
  const [transparentPct, darkPct, bluePct] = drawSpreadPercents(3, rng);
  const before = `linear-gradient(${beforeAngle}deg, transparent ${formatPercent(transparentPct)}, ${NEUTRAL_DARK} ${formatPercent(darkPct)}, ${VENT_SHADOW} ${formatPercent(bluePct)}, ${VENT_BASE})`;

  const afterAngle = randomAngle(rng);
  const [p1, p2, p3, p4, p5, p6] = drawSpreadPercents(6, rng);
  const after = `linear-gradient(${afterAngle}deg, ${NEUTRAL_DARK} ${formatPercent(p1)}, ${VENT_BASE} ${formatPercent(p2)}, ${VENT_SHADOW} ${formatPercent(p3)}, ${NEUTRAL_DARK} ${formatPercent(p4)}, ${NEUTRAL_DARK} ${formatPercent(p5)}, ${VENT_BASE} ${formatPercent(p6)}, ${VENT_SHADOW})`;

  return { before, after };
}
