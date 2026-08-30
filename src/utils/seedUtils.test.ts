// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, afterEach } from 'vitest';

import {
  generateRandomAttenuationStyleName,
  resolveDefaultAttenuationStyleName,
  setGlobalAttenuationStyleSeedOverride,
} from './seedUtils';

// ========================================
// TESTS
// ========================================

describe('generateRandomAttenuationStyleName', () => {
  it('returns a non-empty alphanumeric string', () => {
    const name = generateRandomAttenuationStyleName();
    expect(name.length).toBeGreaterThan(0);
    expect(name).toMatch(/^[a-z0-9]+$/);
  });

  it('returns a different value on each call', () => {
    const a = generateRandomAttenuationStyleName();
    const b = generateRandomAttenuationStyleName();
    expect(a).not.toBe(b);
  });
});

describe('resolveDefaultAttenuationStyleName', () => {
  afterEach(() => {
    setGlobalAttenuationStyleSeedOverride(null);
  });

  it('returns a random name when no override is set', () => {
    setGlobalAttenuationStyleSeedOverride(null);
    const a = resolveDefaultAttenuationStyleName();
    const b = resolveDefaultAttenuationStyleName();
    // Not a hardcoded literal, and not stable across calls without an override.
    expect(a).not.toBe('pelagos');
    expect(a).not.toBe(b);
  });

  it('deterministically returns the sanitized override when one is set', () => {
    setGlobalAttenuationStyleSeedOverride('MyTestSeed!');
    const a = resolveDefaultAttenuationStyleName();
    const b = resolveDefaultAttenuationStyleName();
    expect(a).toBe('mytestseed');
    expect(b).toBe('mytestseed');
  });

  it('reverts to random behavior once the override is cleared', () => {
    setGlobalAttenuationStyleSeedOverride('pinned');
    expect(resolveDefaultAttenuationStyleName()).toBe('pinned');

    setGlobalAttenuationStyleSeedOverride(null);
    const a = resolveDefaultAttenuationStyleName();
    const b = resolveDefaultAttenuationStyleName();
    expect(a).not.toBe('pinned');
    expect(a).not.toBe(b);
  });
});
