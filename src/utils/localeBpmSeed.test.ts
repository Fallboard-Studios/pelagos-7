// ========================================
// IMPORTS
// ========================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, afterEach } from 'vitest';

import { generateLocaleBpm, LOCALE_BPM_SEED_RANGE } from './localeBpmSeed';
import { evictLocaleNoiseMap } from './noiseMaps';

// ========================================
// TESTS
// ========================================

describe('generateLocaleBpm', () => {
  afterEach(() => {
    evictLocaleNoiseMap('seed-test-locale');
    evictLocaleNoiseMap('seed-test-locale-b');
    for (let i = 0; i < 30; i++) evictLocaleNoiseMap(`seed-bpm-sample-${i}`);
  });

  it('always returns an integer in [40, 100], across many locales/coordinates', () => {
    const SAMPLE_LOCALES = 30;
    for (let i = 0; i < SAMPLE_LOCALES; i++) {
      const value = generateLocaleBpm(`seed-bpm-sample-${i}`, i * 7, i * 13);
      expect(value, `locale ${i}`).toBeGreaterThanOrEqual(LOCALE_BPM_SEED_RANGE.min);
      expect(value, `locale ${i}`).toBeLessThanOrEqual(LOCALE_BPM_SEED_RANGE.max);
      expect(Number.isInteger(value), `locale ${i} is an integer`).toBe(true);
    }
  });

  it('is deterministic — same (localeId, x, y) always produces the same value', () => {
    const first = generateLocaleBpm('seed-test-locale', 12, 68);
    const second = generateLocaleBpm('seed-test-locale', 12, 68);
    expect(second).toBe(first);
  });

  it('is deterministic across a fresh noise map too, not just a cached one', () => {
    const first = generateLocaleBpm('seed-test-locale', 12, 68);
    evictLocaleNoiseMap('seed-test-locale');
    const second = generateLocaleBpm('seed-test-locale', 12, 68);
    expect(second).toBe(first);
  });

  it('produces different values for a different locale/coordinates (non-degenerate)', () => {
    const a = generateLocaleBpm('seed-test-locale', 12, 68);
    const b = generateLocaleBpm('seed-test-locale-b', -37, 204);
    expect(b).not.toBe(a);
  });

  it('is not a Math.random()-driven value, and is keyed off the locale noise map, not the Attenuation Style one (source-scan regression guard)', () => {
    const thisFile = fileURLToPath(import.meta.url);
    const source = readFileSync(join(dirname(thisFile), 'localeBpmSeed.ts'), 'utf-8');
    expect(source).not.toMatch(/Math\.random/);
    expect(source).toMatch(/getLocaleNoiseMap/);
    expect(source).not.toMatch(/getAttenuationStyleNoiseMap/);
  });
});
