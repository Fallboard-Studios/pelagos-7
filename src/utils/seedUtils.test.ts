// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, afterEach, vi } from 'vitest';

// vitest.setup.ts mocks randomCoordinate() globally (back to a fixed
// (12, 68)-equivalent sequence, for every OTHER test file's benefit — see its
// own comment) — unmock here so this file exercises the real implementation.
vi.unmock('@/utils/seedUtils');

import {
  generateRandomAttenuationStyleName,
  resolveDefaultAttenuationStyleName,
  setGlobalAttenuationStyleSeedOverride,
  randomCoordinate,
} from './seedUtils';

// ========================================
// TESTS
// ========================================

describe('randomCoordinate', () => {
  it('returns an integer', () => {
    for (let i = 0; i < 20; i++) {
      expect(Number.isInteger(randomCoordinate())).toBe(true);
    }
  });

  it('returns a different value on repeated calls (not a fixed literal)', () => {
    const values = new Set(Array.from({ length: 20 }, () => randomCoordinate()));
    expect(values.size).toBeGreaterThan(1);
  });
});

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
