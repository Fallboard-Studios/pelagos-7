import { describe, it, expect } from 'vitest';
import { buildClickTrackMelody } from './clickTrack';

describe('buildClickTrackMelody', () => {
  it('produces exactly 4 events, one per downbeat (startStep 1/5/9/13)', () => {
    const melody = buildClickTrackMelody(4);
    expect(melody.map((e) => e.startStep)).toEqual([1, 5, 9, 13]);
  });

  it('every event is a straight quarter note', () => {
    const melody = buildClickTrackMelody(4);
    melody.forEach((e) => expect(e.length).toBe('4n'));
  });

  it('plays noteIndex 0, 1, 0, 2 in that order', () => {
    const melody = buildClickTrackMelody(4);
    expect(melody.map((e) => e.noteIndex)).toEqual([0, 1, 0, 2]);
  });

  it('uses the given octave for every event', () => {
    const melody = buildClickTrackMelody(5);
    melody.forEach((e) => expect(e.octave).toBe(5));
  });

  it('every event has a unique id', () => {
    const melody = buildClickTrackMelody(4);
    expect(new Set(melody.map((e) => e.id)).size).toBe(4);
  });
});
