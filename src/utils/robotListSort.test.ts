import { describe, it, expect } from 'vitest';

import { sortRobotsByCompanyFocus } from './robotListSort';
import type { Robot } from '@/types/Robot';

const robots = [
  { id: 'r1', name: 'Alpha', companyId: 'c1' },
  { id: 'r2', name: 'Beta' },
  { id: 'r3', name: 'Gamma', companyId: 'c1' },
  { id: 'r4', name: 'Delta' },
] as unknown as Robot[];

describe('sortRobotsByCompanyFocus', () => {
  it('returns the input unchanged when companyId is null', () => {
    expect(sortRobotsByCompanyFocus(robots, null)).toEqual(robots);
  });

  it('moves the given company\'s members to the end, preserving relative order within both blocks', () => {
    const sorted = sortRobotsByCompanyFocus(robots, 'c1');
    expect(sorted.map((r) => r.id)).toEqual(['r2', 'r4', 'r1', 'r3']);
  });

  it('returns the input unchanged when no robot belongs to the given company', () => {
    expect(sortRobotsByCompanyFocus(robots, 'no-such-company').map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });
});
