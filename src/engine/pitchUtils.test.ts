import { describe, it, expect } from 'vitest';
import { applyOctaveOffset } from './pitchUtils';

describe('applyOctaveOffset', () => {
  it('returns same note for offset 0', () => {
    expect(applyOctaveOffset('C4', 0)).toBe('C4');
    expect(applyOctaveOffset('G#5', 0)).toBe('G#5');
  });

  it('subtracts octaves correctly', () => {
    expect(applyOctaveOffset('C4', 2)).toBe('C2');
    expect(applyOctaveOffset('G#5', 1)).toBe('G#4');
  });

  it('clamps octave to minimum 1', () => {
    expect(applyOctaveOffset('E1', 2)).toBe('E1');
    expect(applyOctaveOffset('A2', 5)).toBe('A1');
  });

  it('returns original when note has no octave digits', () => {
    expect(applyOctaveOffset('C', 1)).toBe('C');
  });
});
