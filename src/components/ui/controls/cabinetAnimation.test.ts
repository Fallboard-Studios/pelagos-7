import { describe, it, expect } from 'vitest';

import { getCabinetPopDuration, CABINET_POP_DURATION } from './cabinetAnimation';

describe('getCabinetPopDuration', () => {
  it('returns 0 when prefers-reduced-motion is set', () => {
    expect(getCabinetPopDuration(true)).toBe(0);
  });

  it('returns the animated duration otherwise', () => {
    expect(getCabinetPopDuration(false)).toBe(CABINET_POP_DURATION);
    expect(getCabinetPopDuration(false)).toBeGreaterThan(0);
  });
});
