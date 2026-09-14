import { describe, it, expect } from 'vitest';

import { filterRobotsByCompanyFocus } from './robotListFilter';
import type { Robot } from '@/types/Robot';

const robots = [
  { id: 'r1', name: 'Alpha', companyId: 'c1' },
  { id: 'r2', name: 'Beta' },
  { id: 'r3', name: 'Gamma', companyId: 'c1' },
  { id: 'r4', name: 'Delta' },
] as unknown as Robot[];

describe('filterRobotsByCompanyFocus', () => {
  it('returns the input unchanged when companyId is null', () => {
    expect(filterRobotsByCompanyFocus(robots, null)).toEqual(robots);
  });

  it('filters down to only the given company\'s members, preserving their original relative order', () => {
    const filtered = filterRobotsByCompanyFocus(robots, 'c1');
    expect(filtered.map((r) => r.id)).toEqual(['r1', 'r3']);
  });

  it('returns an empty array when no robot belongs to the given company', () => {
    expect(filterRobotsByCompanyFocus(robots, 'no-such-company')).toEqual([]);
  });
});
