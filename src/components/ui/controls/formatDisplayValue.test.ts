import { describe, it, expect } from 'vitest';

import { formatDisplayValue } from './formatDisplayValue';

describe('formatDisplayValue', () => {
  it('leaves a whole number unchanged — no padding to 3 decimals', () => {
    expect(formatDisplayValue(5)).toBe(5);
  });

  it('leaves a value with fewer than 3 decimals unchanged', () => {
    expect(formatDisplayValue(5.1)).toBe(5.1);
    expect(formatDisplayValue(-12.5)).toBe(-12.5);
  });

  it('rounds a value with more than 3 decimals down to exactly 3', () => {
    expect(formatDisplayValue(5.123456)).toBe(5.123);
  });

  it('rounds up on the 4th decimal per standard rounding, not truncation', () => {
    expect(formatDisplayValue(5.1239)).toBe(5.124);
  });

  it('cleans up classic floating-point noise (e.g. 0.1 + 0.2)', () => {
    expect(formatDisplayValue(0.1 + 0.2)).toBe(0.3);
  });

  it('cleans up floating-point noise from log-scale/range math (e.g. 4999.999999999999)', () => {
    expect(formatDisplayValue(4999.999999999999)).toBe(5000);
  });

  it('handles negative values the same way', () => {
    expect(formatDisplayValue(-5.123456)).toBe(-5.123);
  });

  it('handles zero', () => {
    expect(formatDisplayValue(0)).toBe(0);
  });
});
