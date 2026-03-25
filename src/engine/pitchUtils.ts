/**
 * Apply an octave offset to a Tone.js pitch string (e.g. "C4" -> "C2").
 * Clamps octave to a minimum of 1.
 */
export function applyOctaveOffset(note: string, offset: number): string {
  if (!offset || offset === 0) return note;

  const m = note.match(/(\d+)$/);
  if (!m) return note;

  const octave = parseInt(m[1], 10);
  if (Number.isNaN(octave)) return note;

  const newOctave = Math.max(1, octave - offset);
  return note.slice(0, m.index) + String(newOctave);
}

export default applyOctaveOffset;
