import type { MelodyEvent } from '../types/Robot';

/**
 * A fixed 4-quarter-note test pattern, standing in for a robot's real melody so tempo/BPM
 * changes are easy to track by ear — not a generated melody, and never written into
 * Robot.melody (see robotOptionsActions.ts's applyClickTrackActive). One event per downbeat
 * (startStep 1/5/9/13 — each 4 sixteenth-note grid units apart, i.e. one quarter note, per
 * MELODY_SYSTEM.md's 16-subdivision-per-measure grid), noteIndex 0/1/0/2 into whatever harmony
 * palette is active, all at a single fixed octave so the pattern reads as a steady pulse rather
 * than a melody of its own.
 */
const CLICK_TRACK_NOTE_INDICES = [0, 1, 0, 2] as const;
const CLICK_TRACK_START_STEPS = [1, 5, 9, 13] as const;

export function buildClickTrackMelody(octave: number): MelodyEvent[] {
  return CLICK_TRACK_START_STEPS.map((startStep, i) => ({
    id: `click-track-${i}`,
    startStep,
    length: '4n',
    noteIndex: CLICK_TRACK_NOTE_INDICES[i],
    octave,
  }));
}
