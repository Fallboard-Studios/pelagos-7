import { describe, it, expect } from 'vitest';

import { calculatePanFromPosition } from './panning';
import { WORLD_WIDTH } from '@/constants';

describe('calculatePanFromPosition', () => {
  it('maps x = 0 to the leftmost pan value (-0.5)', () => {
    expect(calculatePanFromPosition(0)).toBe(-0.5);
  });

  it('maps x = WORLD_WIDTH to the rightmost pan value (+0.5)', () => {
    expect(calculatePanFromPosition(WORLD_WIDTH)).toBe(0.5);
  });

  it('maps the world midpoint to dead center (0)', () => {
    expect(calculatePanFromPosition(WORLD_WIDTH / 2)).toBe(0);
  });
});
