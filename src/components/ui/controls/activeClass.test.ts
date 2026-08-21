import { describe, it, expect } from 'vitest';

import { withActiveClass } from './activeClass';

describe('withActiveClass', () => {
  it('appends isActive when active is true', () => {
    expect(withActiveClass('sc-toggle', true)).toBe('sc-toggle isActive');
  });

  it('returns the base class unchanged when active is false', () => {
    expect(withActiveClass('sc-toggle', false)).toBe('sc-toggle');
  });
});
