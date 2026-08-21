// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, afterEach } from 'vitest';

import {
  generateRandomPlanetName,
  resolveDefaultPlanetName,
  setGlobalPlanetSeedOverride,
} from './seedUtils';

// ========================================
// TESTS
// ========================================

describe('generateRandomPlanetName', () => {
  it('returns a non-empty alphanumeric string', () => {
    const name = generateRandomPlanetName();
    expect(name.length).toBeGreaterThan(0);
    expect(name).toMatch(/^[a-z0-9]+$/);
  });

  it('returns a different value on each call', () => {
    const a = generateRandomPlanetName();
    const b = generateRandomPlanetName();
    expect(a).not.toBe(b);
  });
});

describe('resolveDefaultPlanetName', () => {
  afterEach(() => {
    setGlobalPlanetSeedOverride(null);
  });

  it('returns a random name when no override is set', () => {
    setGlobalPlanetSeedOverride(null);
    const a = resolveDefaultPlanetName();
    const b = resolveDefaultPlanetName();
    // Not a hardcoded literal, and not stable across calls without an override.
    expect(a).not.toBe('pelagos');
    expect(a).not.toBe(b);
  });

  it('deterministically returns the sanitized override when one is set', () => {
    setGlobalPlanetSeedOverride('MyTestSeed!');
    const a = resolveDefaultPlanetName();
    const b = resolveDefaultPlanetName();
    expect(a).toBe('mytestseed');
    expect(b).toBe('mytestseed');
  });

  it('reverts to random behavior once the override is cleared', () => {
    setGlobalPlanetSeedOverride('pinned');
    expect(resolveDefaultPlanetName()).toBe('pinned');

    setGlobalPlanetSeedOverride(null);
    const a = resolveDefaultPlanetName();
    const b = resolveDefaultPlanetName();
    expect(a).not.toBe('pinned');
    expect(a).not.toBe(b);
  });
});
