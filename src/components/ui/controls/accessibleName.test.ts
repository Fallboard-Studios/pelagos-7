import { describe, it, expect } from 'vitest';

import { resolveAccessibleName } from './accessibleName';

describe('resolveAccessibleName', () => {
  it('prefers humanLabel when present', () => {
    expect(resolveAccessibleName({ id: 'x', humanLabel: 'Reset Melody', loreLabel: 'CALIBRATE PING' })).toBe('Reset Melody');
  });

  it('falls back to loreLabel when humanLabel is absent', () => {
    expect(resolveAccessibleName({ id: 'x', loreLabel: 'CALIBRATE PING' })).toBe('CALIBRATE PING');
  });

  it('falls back to schema.id when neither label is present, never returning undefined/empty', () => {
    expect(resolveAccessibleName({ id: 'resetMelody' })).toBe('resetMelody');
  });
});
