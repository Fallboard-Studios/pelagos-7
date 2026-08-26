// ========================================
// IMPORTS
// ========================================
import alea from 'alea';
import type { NoteDuration } from '../types/Robot';
import {
  RHYTHMIC_DENSITY_MIN,
  RHYTHMIC_DENSITY_MAX,
  RHYTHMIC_MOTIF_LENGTH_MIN,
  RHYTHMIC_MOTIF_LENGTH_MAX,
  NOTE_VARIANCE_MIN,
  NOTE_VARIANCE_MAX,
} from '../constants';

// ========================================
// TYPES
// ========================================
export interface RobotMelodyEvent {
  id: string;
  startStep: number; // 1..16 (16th-note position in a single-measure loop)
  length: NoteDuration; // Note duration
  noteIndex: number; // 0..7 (maps into availableNotes palette)
  octave: number;   // Concrete octave assigned at spawn time
}

/** A 1–8 magnitude paired with an on/off toggle — shared shape for Motif Length and Note Variance. */
export interface ToggleValue {
  active: boolean;
  value: number;
}

/**
 * Options for generateMelodyForRobot.
 * Uses explicit octaveMin/octaveMax and controls the motif-repetition density algorithm.
 */
export interface GenerateMelodyForRobotOptions {
  /** Minimum octave (inclusive). */
  octaveMin: number;
  /** Maximum octave (inclusive). Must be >= octaveMin. */
  octaveMax: number;
  /**
   * Fill-rate percentage (0–100) of either the full measure (motif inactive) or
   * one motif cell (motif active). Converted to an onset count internally, with
   * a hard floor of 1 — no roll ever produces a silent melody.
   * Default: DEFAULT_RHYTHMIC_DENSITY.
   */
  rhythmicDensity?: number;
  /**
   * Motif tiling toggle. When `active` is false, onsets scatter freely across
   * the full measure and `value` is inert. When true, a `value`-length
   * (1–8 sixteenth notes) cell tiles across the measure and truncates at
   * measure end. Default: DEFAULT_RHYTHMIC_MOTIF_LENGTH.
   */
  rhythmicMotifLength?: ToggleValue;
  /**
   * Number of 16th-note subdivisions per measure.
   * Default: 16.
   */
  subdivisions?: number;
  /**
   * Integer seed for deterministic RNG. When provided, a seeded PRNG is used
   * instead of Math.random — useful for reproducible tests.
   */
  seed?: number;
  /**
   * RNG function override. When provided, used instead of `seed` or `Math.random`.
   * Useful when callers supply a deterministic noise-map-based PRNG.
   */
  rand?: () => number;
  /**
   * Weighted note-selection toggle. When `active` is false, notes are picked
   * unweighted from all 8 indices and `value` is inert. When true, selection
   * is a weighted slice of `value` (1–8) notes from the pitch array.
   * Default: DEFAULT_NOTE_VARIANCE.
   */
  noteVariance?: ToggleValue;
}

// ========================================
// CONSTANTS
// ========================================
/** Probability that a successive note jumps more than one octave (when range allows). */
const OCTAVE_JUMP_CHANCE = 0.15;

const NOTE_INDEX_WEIGHTS = [0.35, 0.2, 0.15, 0.1, 0.07, 0.06, 0.04, 0.03];

/**
 * Default rhythmic density (0-100% fill rate). A clean round mid-point of the
 * new range; not a preserved value from the old 4-12 onset-count scale.
 */
export const DEFAULT_RHYTHMIC_DENSITY = 50;
/**
 * Default motif toggle — active at the maximum 1-8 value. Preserves the old
 * always-tiling-at-8 default behavior exactly (motif tiling used to have no
 * off switch and always defaulted to a length-8 cell).
 */
export const DEFAULT_RHYTHMIC_MOTIF_LENGTH: ToggleValue = { active: true, value: 8 };
/**
 * Default note-variance toggle — inactive. Preserves the old
 * noteVariance === 0 / unweighted default exactly.
 */
export const DEFAULT_NOTE_VARIANCE: ToggleValue = { active: false, value: 1 };
/** Default subdivision grid per measure (16 sixteenth notes in 4/4). */
export const DEFAULT_SUBDIVISIONS = 16;

/** Probability of applying rhythmic variance per 16-step loop (recommended: 0.2) */
const DEFAULT_VARIANCE_PROBABILITY = 0.20;
/** Possible step shifts (±1 or ±2 8th notes) */
const SHIFT_OPTIONS = [-2, -1, 1, 2];
/** Possible note index shifts (±1 semitone) */
const NOTE_SHIFT_OPTIONS = [-1, 1];

// ========================================
// EXPORTS
// ========================================

/**
 * Pick random indices from an array without replacement.
 * @param arr Array to pick from
 * @param count Number of items to pick
 * @param rand Optional RNG function (default: Math.random)
 * @returns Array of picked indices
 */
export function pickRandomIndices(arr: unknown[], count: number, rand: () => number = Math.random): number[] {
  const indices = Array.from({ length: arr.length }, (_, i) => i);
  const picked: number[] = [];

  for (let i = 0; i < Math.min(count, indices.length); i++) {
    const idx = Math.floor(rand() * (indices.length - i));
    picked.push(indices[idx]);
    // Swap to end to remove from available pool
    [indices[idx], indices[indices.length - 1 - i]] = [indices[indices.length - 1 - i], indices[idx]];
  }

  return picked;
}

/**
 * Apply occasional rhythmic variance to a melody by shifting 1–2 events' startStep.
 * Called at loop completion (~20% chance per loop by default).
 * Preserves all other fields (id, length, noteIndex, octave).
 * 
 * @param melody Melody events to apply variance to
 * @param probability 0-1 chance to apply variance (default: 0.2 ~ 20%)
 * @param rand Optional RNG function (default: Math.random)
 * @returns New melody array with variance applied (if triggered), or original melody
 */
export function applyRhythmicVariance(
  melody: RobotMelodyEvent[],
  probability: number = DEFAULT_VARIANCE_PROBABILITY,
  rand: () => number = Math.random
): RobotMelodyEvent[] {
  if (rand() > probability) {
    return melody;
  }

  const numToShift = rand() < 0.5 ? 1 : 2;
  const indicesToShift = pickRandomIndices(melody, Math.min(numToShift, melody.length), rand);

  return melody.map((event, idx) => {
    if (!indicesToShift.includes(idx)) {
      return event;
    }

    const delta = SHIFT_OPTIONS[Math.floor(rand() * SHIFT_OPTIONS.length)];
    // Clamp to 1..16
    const newStep = Math.min(16, Math.max(1, event.startStep + delta));

    return {
      ...event,
      startStep: newStep,
    };
  });
}

/**
 * Apply occasional tonal variance to a melody by shifting 1–2 events' noteIndex.
 * Fires independently from rhythmic variance (~20% chance per loop by default).
 * Shift amount is ±1, clamped to 0–7 (the harmony palette size).
 * Preserves all other fields (id, startStep, length, octave).
 * 
 * @param melody Melody events to apply variance to
 * @param probability 0-1 chance to apply variance (default: 0.2 ~ 20%)
 * @param rand Optional RNG function (default: Math.random)
 * @returns New melody array with variance applied (if triggered), or original melody
 */
export function applyTonalVariance(
  melody: RobotMelodyEvent[],
  probability: number = DEFAULT_VARIANCE_PROBABILITY,
  rand: () => number = Math.random
): RobotMelodyEvent[] {
  if (rand() > probability) {
    return melody;
  }

  const numToShift = rand() < 0.5 ? 1 : 2;
  const indicesToShift = pickRandomIndices(melody, Math.min(numToShift, melody.length), rand);

  return melody.map((event, idx) => {
    if (!indicesToShift.includes(idx)) {
      return event;
    }

    const delta = NOTE_SHIFT_OPTIONS[Math.floor(rand() * NOTE_SHIFT_OPTIONS.length)];
    // Clamp to 0..7 (harmony palette size)
    const newIndex = Math.min(7, Math.max(0, event.noteIndex + delta));

    return {
      ...event,
      noteIndex: newIndex,
    };
  });
}


// ========================================
// MOTIF ALGORITHM HELPERS
// ========================================

/**
 * Pick `count` unique integers from [0, n) via Fisher-Yates partial shuffle.
 * Internal helper — use buildMotifOnsets for the public API.
 */
function pickUniqueInRange(n: number, count: number, rand: () => number): number[] {
  const pool = Array.from({ length: n }, (_, i) => i);
  const result: number[] = [];
  const pickCount = Math.min(count, n);
  for (let i = 0; i < pickCount; i++) {
    const j = i + Math.floor(rand() * (n - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    result.push(pool[i]);
  }
  return result;
}

/**
 * Build sorted onset positions (0-indexed, 0..subdivisions-1) for one measure
 * using the motif-repetition algorithm.
 *
 * Algorithm:
 *   M = clamp(rhythmicMotifLength, 1, subdivisions)
 *   repeats = floor(subdivisions / M)
 *
 *   If repeats >= 2 (motif path):
 *     K = max(1, floor(density / repeats))  — onsets per motif copy
 *     R = density - K * repeats             — extra onsets, distributed to first R copies
 *     Generate one base motif of K unique positions in [0, M), sorted.
 *     Tile it across the measure; first R copies get one extra position each.
 *     Truncate any partial motif at subdivisions.
 *     K is floored to a minimum of 1, so when density < repeats (a short motif
 *     relative to density), R goes negative and tiling alone overshoots density —
 *     the result is trimmed back down to exactly `density` onsets in that case.
 *
 *   Else (non-repeating fallback):
 *     Pick density unique positions from [0, subdivisions).
 *
 * @param rhythmicDensity    Target onset count (4–12)
 * @param rhythmicMotifLength Motif length in subdivision grid units (1..subdivisions)
 * @param subdivisions       Grid units per measure (default: 16)
 * @param rand               RNG function
 */
export function buildMotifOnsets(
  rhythmicDensity: number,
  rhythmicMotifLength: number,
  subdivisions: number,
  rand: () => number,
): number[] {
  const M = Math.max(1, Math.min(rhythmicMotifLength, subdivisions));
  const repeats = Math.floor(subdivisions / M);

  if (repeats >= 2) {
    const K = Math.max(1, Math.floor(rhythmicDensity / repeats));
    const R = Math.max(0, rhythmicDensity - K * repeats);

    const baseMotif = pickUniqueInRange(M, K, rand).sort((a, b) => a - b);

    const onsetSet = new Set<number>();
    for (let rep = 0; rep < repeats; rep++) {
      const offset = rep * M;
      const motifForRep = [...baseMotif];

      // First R repeats get one extra position not in the base motif
      if (rep < R) {
        const usedInBase = new Set(baseMotif);
        const available = Array.from({ length: M }, (_, i) => i).filter(p => !usedInBase.has(p));
        if (available.length > 0) {
          motifForRep.push(available[Math.floor(rand() * available.length)]);
          motifForRep.sort((a, b) => a - b);
        }
      }

      for (const pos of motifForRep) {
        const gridPos = offset + pos;
        // Truncate: do not emit positions beyond the measure
        if (gridPos < subdivisions) onsetSet.add(gridPos);
      }
    }

    const combined = Array.from(onsetSet).sort((a, b) => a - b);
    if (combined.length <= rhythmicDensity) {
      return combined;
    }

    // K's minimum of 1 per repeat window overshot the target density (short
    // motif relative to density) — trim back down to exactly rhythmicDensity.
    const keepIndices = pickUniqueInRange(combined.length, rhythmicDensity, rand).sort((a, b) => a - b);
    return keepIndices.map(i => combined[i]);
  }

  // Non-repeating fallback
  const N = Math.min(rhythmicDensity, subdivisions);
  return pickUniqueInRange(subdivisions, N, rand).sort((a, b) => a - b);
}

/**
 * Map a duration in 16th-note subdivision grid units to the nearest NoteDuration.
 *   ≤ 1  → '16n'
 *   2–3  → '8n'
 *   4–6  → '4n'
 *   7+   → '2n'
 *
 * Kept as a general-purpose quantization utility; `generateMelodyForRobot` uses
 * `pickDurationForGap` instead so notes can be shorter than the full gap to the
 * next onset (leaving rests) rather than always filling it.
 */
export function gridUnitsToDuration(units: number): NoteDuration {
  if (units <= 1) return '16n';
  if (units <= 3) return '8n';
  if (units <= 6) return '4n';
  return '2n';
}

/** Grid-unit length of each representable note duration, used by pickDurationForGap. */
const DURATION_UNIT_VALUES: Array<[number, NoteDuration]> = [
  [1, '16n'],
  [2, '8n'],
  [4, '4n'],
  [8, '2n'],
];

/**
 * Choose a note duration that fits within the available grid-unit gap to the next
 * onset (or measure end), leaving any remainder as a rest rather than always filling
 * the whole gap. Weighted toward longer durations (weight = unit value), so shorter
 * notes — especially `16n` — are chosen less often while remaining possible.
 *
 * @param availableUnits Grid units available before the next onset. Always >= 1.
 * @param rand Optional RNG function (default: Math.random)
 */
export function pickDurationForGap(availableUnits: number, rand: () => number = Math.random): NoteDuration {
  const candidates = DURATION_UNIT_VALUES.filter(([units]) => units <= availableUnits);
  const totalWeight = candidates.reduce((sum, [units]) => sum + units, 0);
  let r = rand() * totalWeight;
  for (const [units, duration] of candidates) {
    r -= units;
    if (r <= 0) return duration;
  }
  return candidates[candidates.length - 1][1];
}

// ========================================
// MELODY GENERATION
// ========================================

/**
 * Generates a melody for a robot using the motif-repetition density algorithm.
 * Onset positions are built by buildMotifOnsets() and durations are computed
 * as the gap to the next onset.
 */
export function generateMelodyForRobot(
  opts: GenerateMelodyForRobotOptions
): RobotMelodyEvent[] {
  const rand = opts.rand ?? (opts.seed !== undefined ? alea(String(opts.seed)) : Math.random);
  const subdivisions = opts.subdivisions ?? DEFAULT_SUBDIVISIONS;
  const densityPct = Math.max(
    RHYTHMIC_DENSITY_MIN,
    Math.min(RHYTHMIC_DENSITY_MAX, opts.rhythmicDensity ?? DEFAULT_RHYTHMIC_DENSITY),
  );
  const motif = opts.rhythmicMotifLength ?? DEFAULT_RHYTHMIC_MOTIF_LENGTH;
  const octMin = Math.min(opts.octaveMin, opts.octaveMax);
  const octMax = Math.max(opts.octaveMin, opts.octaveMax);

  // Density is a fill-rate % of either one motif cell (tiling on) or the whole
  // measure (tiling off). buildMotifOnsets' own `rhythmicDensity` parameter is a
  // TOTAL onset count across the tiled measure, not a per-cell count — so when
  // tiling is on, the per-cell fill is multiplied back out by the repeat count
  // before calling it, keeping every repeat identically filled (no remainder
  // distributed unevenly, unlike the old total-onset-count model).
  let onsets: number[];
  if (motif.active) {
    const motifLength = Math.max(RHYTHMIC_MOTIF_LENGTH_MIN, Math.min(RHYTHMIC_MOTIF_LENGTH_MAX, Math.trunc(motif.value)));
    const repeats = Math.max(1, Math.floor(subdivisions / motifLength));
    const perCell = Math.max(1, Math.round((densityPct / 100) * motifLength));
    onsets = buildMotifOnsets(perCell * repeats, motifLength, subdivisions, rand);
  } else {
    const onsetCount = Math.max(1, Math.round((densityPct / 100) * subdivisions));
    onsets = buildMotifOnsets(onsetCount, subdivisions, subdivisions, rand);
  }

  let currentOctave = octMin + Math.floor(rand() * (octMax - octMin + 1));
  const melody: RobotMelodyEvent[] = [];

  // Note-variance state
  const variance = opts.noteVariance ?? DEFAULT_NOTE_VARIANCE;
  const noteVarianceValue = Math.max(NOTE_VARIANCE_MIN, Math.min(NOTE_VARIANCE_MAX, Math.trunc(variance.value)));
  const uniqueSet = new Set<number>();
  // Lazily built below on first use when noteVariance === 8 (shuffled draw-without-replacement pool).
  let withoutReplacementPool: number[] | null = null;

  for (let i = 0; i < onsets.length; i++) {
    // 15% chance to jump to a non-adjacent octave when range allows
    if (i > 0 && rand() < OCTAVE_JUMP_CHANCE) {
      const jumpCandidates: number[] = [];
      for (let oct = octMin; oct <= octMax; oct++) {
        if (Math.abs(oct - currentOctave) > 1) jumpCandidates.push(oct);
      }
      if (jumpCandidates.length > 0) {
        currentOctave = jumpCandidates[Math.floor(rand() * jumpCandidates.length)];
      }
    }

    // Duration = gap to next onset; last onset fills to measure end
    const nextOnset = i < onsets.length - 1 ? onsets[i + 1] : subdivisions;
    const durationUnits = nextOnset - onsets[i];

    // Pick noteIndex honoring the noteVariance toggle
    let noteIndex: number;
    if (!variance.active) {
      // Off: unweighted, unconstrained random pick from all 8 indices — deliberately
      // NOT pickWeightedIndex(); "off" now means no weighting at all, not just no
      // uniqueness constraint (a behavior change from the old noteVariance === 0
      // default, which was still weighted).
      noteIndex = Math.floor(rand() * 8);
    } else if (noteVarianceValue === 8) {
      if (!withoutReplacementPool || withoutReplacementPool.length === 0) {
        const pool = Array.from({ length: 8 }, (_, i) => i);
        withoutReplacementPool = [];
        while (pool.length > 0) {
          const j = Math.floor(rand() * pool.length);
          withoutReplacementPool.push(pool.splice(j, 1)[0]);
        }
      }
      noteIndex = withoutReplacementPool.shift()!;
      uniqueSet.add(noteIndex);
    } else {
      if (uniqueSet.size < noteVarianceValue) {
        // prefer selecting notes not yet in the set (uniform among remaining)
        const remaining = Array.from({ length: 8 }, (_, i) => i).filter((i) => !uniqueSet.has(i));
        noteIndex = remaining[Math.floor(rand() * remaining.length)];
        uniqueSet.add(noteIndex);
      } else {
        // choose among established set — weighted by NOTE_INDEX_WEIGHTS restricted to set
        const setArray = Array.from(uniqueSet);
        const totalW = setArray.reduce((s, idx) => s + NOTE_INDEX_WEIGHTS[idx], 0);
        let r = rand() * totalW;
        noteIndex = setArray[setArray.length - 1];
        for (const idx of setArray) {
          r -= NOTE_INDEX_WEIGHTS[idx];
          if (r <= 0) { noteIndex = idx; break; }
        }
      }
    }

    melody.push({
      id: crypto.randomUUID(),
      startStep: onsets[i] + 1, // 1-indexed to match existing RobotMelodyEvent convention
      length: pickDurationForGap(durationUnits, rand),
      noteIndex,
      octave: currentOctave,
    });
  }

  return melody;
}

/**
 * Picks a weighted note index (0-7).
 * Lower indices are more common (35%, 20%, 15%, etc.)
 */
export function pickWeightedIndex(rand: () => number = Math.random): number {
  const r = rand();
  let acc = 0;

  for (let i = 0; i < NOTE_INDEX_WEIGHTS.length; i++) {
    acc += NOTE_INDEX_WEIGHTS[i];
    if (r <= acc) return i;
  }

  return NOTE_INDEX_WEIGHTS.length - 1;
}
