/**
 * Randomizes the two decorative `linear-gradient`s behind the tablet
 * (`.real-world::before`/`::after`, App.css) once per page load. Colors stay
 * exactly as originally authored, in their original stop order — only each
 * gradient's angle and its stops' breakpoint percentages vary. A pair of
 * stops that originally shared one percentage (a hard color edge, not a
 * blend — e.g. `#1e1e1e 75%, #083a70 75%`) sometimes keeps sharing one
 * randomized percentage, and sometimes diverges into two nearby-but-distinct
 * ascending percentages instead, so some flat color bands survive the
 * randomization and some become genuine blends. `transparent` is treated as
 * an ordinary color value here — never swapped for anything else.
 *
 * Plain Math.random() by default, not the app's seeded-noise system — this
 * is a decorative backdrop behind the fictional device, not part of any
 * deterministic planet/locale content.
 */

// ========================================
// TYPES
// ========================================

/** Returns a value in [0, 1) — the same contract as Math.random(). Injectable for tests. */
export type RandomSource = () => number;

interface StopGroup {
  /** 1 = a standalone stop (its own percentage); 2 = a pair that either
   *  shares one percentage (stays matching) or gets two ascending ones
   *  (diverges). */
  size: 1 | 2;
}

// ========================================
// CONSTANTS
// ========================================

/** Percentage range candidate stops are drawn from — padded off 0/100 so a
 *  stop never lands exactly on the box edge. */
const MIN_PCT = 4;
const MAX_PCT = 96;

/** Chance a matching pair stays matching (one shared percentage) rather
 *  than diverging into two. Deliberately not certainty either way — "some
 *  flat colors in the mix", not none and not all. */
const STAY_MATCHING_CHANCE = 0.5;

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

/** N independent draws in [MIN_PCT, MAX_PCT), sorted ascending — the
 *  simplest way to guarantee a valid (non-decreasing) stop sequence
 *  regardless of which groups end up matching vs. diverging. */
function drawAscendingPercents(count: number, rng: RandomSource): number[] {
  const values = Array.from({ length: count }, () => MIN_PCT + rng() * (MAX_PCT - MIN_PCT));
  values.sort((a, b) => a - b);
  return values;
}

/**
 * Resolves each group's percentage(s) in order. Diverge/match is decided
 * per group first (so the total slot count — and thus how many ascending
 * values to draw — is known before drawing), then values are handed out in
 * the same left-to-right order the groups are given in, which is what keeps
 * the whole gradient monotonically ascending: each group's value(s) are
 * drawn after every earlier group's, from an already-sorted pool.
 */
function assignGroupPercents(groups: StopGroup[], rng: RandomSource): number[][] {
  const diverges = groups.map((g) => g.size === 2 && rng() >= STAY_MATCHING_CHANCE);
  const slotCount = groups.reduce((sum, _g, i) => sum + (diverges[i] ? 2 : 1), 0);
  const percents = drawAscendingPercents(slotCount, rng);

  let cursor = 0;
  return groups.map((g, i) => {
    if (g.size === 1) return [percents[cursor++]];
    if (diverges[i]) return [percents[cursor++], percents[cursor++]];
    const shared = percents[cursor++];
    return [shared, shared];
  });
}

// ========================================
// PUBLIC API
// ========================================

export function generateRealWorldGradients(rng: RandomSource = Math.random): { before: string; after: string } {
  const beforeAngle = randomAngle(rng);
  const [[transparentPct], [darkPct, bluePct]] = assignGroupPercents(
    [{ size: 1 }, { size: 2 }],
    rng,
  );
  const before = `linear-gradient(${beforeAngle}deg, transparent ${formatPercent(transparentPct)}, #1e1e1e ${formatPercent(darkPct)}, #083a70 ${formatPercent(bluePct)}, #1d5da1)`;

  const afterAngle = randomAngle(rng);
  const [[p1, p2], [p3, p4], [p5, p6]] = assignGroupPercents(
    [{ size: 2 }, { size: 2 }, { size: 2 }],
    rng,
  );
  const after = `linear-gradient(${afterAngle}deg, #1e1e1e ${formatPercent(p1)}, #1d5da1 ${formatPercent(p2)}, #083a70 ${formatPercent(p3)}, #1e1e1e ${formatPercent(p4)}, #1e1e1e ${formatPercent(p5)}, #1d5da1 ${formatPercent(p6)}, #083a70)`;

  return { before, after };
}
