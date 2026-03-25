// ========================================
// IMPORTS
// ========================================
import type { NoteDuration } from '../types/Robot';

// ========================================
// TYPES
// ========================================
export interface RobotMelodyEvent {
  id: string;
  startStep: number; // 1..16 (8th-note position in 2-measure loop)
  length: NoteDuration; // Note duration
  noteIndex: number; // 0..7 (maps into availableNotes palette)
  octave: number;   // Concrete octave assigned at spawn time
}

export interface MelodyGeneratorOptions {
  events?: number; // Number of notes (default: 4-12)
  rand?: () => number; // RNG for testing (default: Math.random)
  syncopationBias?: number; // 0-1, off-beat preference (default: 0.4)
  octaveRange?: [number, number]; // [min, max] octave band for this robot
}

// ========================================
// CONSTANTS
// ========================================
const MIN_EVENTS = 4;
const MAX_EVENTS = 12;
const DEFAULT_SYNCOPATION_BIAS = 0.4;
/** Probability that a successive note jumps more than one octave (when range allows). */
const OCTAVE_JUMP_CHANCE = 0.15;
const DEFAULT_OCTAVE_RANGE: [number, number] = [3, 4];

const NOTE_INDEX_WEIGHTS = [0.35, 0.2, 0.15, 0.1, 0.07, 0.06, 0.04, 0.03];
const LENGTH_WEIGHTS = [0.5, 0.25, 0.15, 0.1];
// Order must align with LENGTH_WEIGHTS: 8n=50%, 4n=25%, 2n=15%, 16n=10%
const LENGTHS: NoteDuration[] = ['8n', '4n', '2n', '16n'];

const ON_BEAT_STEPS = [1, 3, 5, 7, 9, 11, 13, 15];
const OFF_BEAT_STEPS = [2, 4, 6, 8, 10, 12, 14, 16];

// ========================================
// EXPORTS
// ========================================

/**
 * Generates a melody for a robot at spawn time.
 * Returns 4-12 events with weighted note selection.
 */
export function generateMelodyForRobot(
  opts?: MelodyGeneratorOptions
): RobotMelodyEvent[] {
  const rand = opts?.rand ?? Math.random;
  const eventsCount =
    opts?.events ?? MIN_EVENTS + Math.floor(rand() * (MAX_EVENTS - MIN_EVENTS + 1));
  const syncopationBias = opts?.syncopationBias ?? DEFAULT_SYNCOPATION_BIAS;

  const [octMin, octMax] = opts?.octaveRange ?? DEFAULT_OCTAVE_RANGE;
  // Seed currentOctave to a random value within the robot's range
  let currentOctave = octMin + Math.floor(rand() * (octMax - octMin + 1));

  const melody: RobotMelodyEvent[] = [];
  const usedSlots = new Set<number>();

  for (let i = 0; i < eventsCount; i++) {
    // 15% chance to jump to a non-adjacent octave (requires span of at least 2)
    if (i > 0 && rand() < OCTAVE_JUMP_CHANCE) {
      const jumpCandidates: number[] = [];
      for (let o = octMin; o <= octMax; o++) {
        if (Math.abs(o - currentOctave) > 1) jumpCandidates.push(o);
      }
      if (jumpCandidates.length > 0) {
        currentOctave = jumpCandidates[Math.floor(rand() * jumpCandidates.length)];
      }
      // Range too narrow to jump — stay on current octave
    }

    // Pick step position (with syncopation bias)
    const useOffBeat = rand() < syncopationBias;
    const candidateSteps = useOffBeat ? OFF_BEAT_STEPS : ON_BEAT_STEPS;

    let startStep = candidateSteps[Math.floor(rand() * candidateSteps.length)];

    // Avoid duplicate slots (with retry limit)
    let attempts = 0;
    while (usedSlots.has(startStep) && attempts < 8) {
      startStep = candidateSteps[Math.floor(rand() * candidateSteps.length)];
      attempts++;
    }
    usedSlots.add(startStep);

    // Pick note index (weighted)
    const noteIndex = pickWeightedIndex(rand);

    // Pick duration (biased toward shorter)
    const length = pickLength(rand);

    melody.push({
      id: crypto.randomUUID(),
      startStep,
      length,
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

/**
 * Picks a note length with bias toward shorter durations.
 * '16n' 10%, '8n' 50%, '4n' 25%, '2n' 15%
 */
export function pickLength(rand: () => number = Math.random): NoteDuration {
  const r = rand();
  let acc = 0;

  for (let i = 0; i < LENGTH_WEIGHTS.length; i++) {
    acc += LENGTH_WEIGHTS[i];
    if (r <= acc) return LENGTHS[i];
  }

  return '8n';
}
