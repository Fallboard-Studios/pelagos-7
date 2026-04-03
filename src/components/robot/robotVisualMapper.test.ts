import { describe, it, expect } from 'vitest';
import mapVisualAudioToProps from './robotVisualMapper';
import type { VisualAudioMap } from '../../types/layeredAudio';

describe('robotVisualMapper', () => {
  it('returns defaults when vm is undefined', () => {
    const out = mapVisualAudioToProps(undefined);
    expect(out).toBeDefined();
    expect(out.bodyShapeProps.scale).toBeGreaterThanOrEqual(0);
    expect(out.greebleProps.count).toBeGreaterThanOrEqual(0);
  });

  it('maps shapeParams and averagedGain to lights and greebles', () => {
    const vm: VisualAudioMap = {
      averagedGain: 1.2,
      shapeParams: { scale: 0.8, roundness: 0.7, detail: 0.9 },
    };
    const out = mapVisualAudioToProps(vm);
    expect(out.bodyShapeProps.scale).toBeCloseTo(0.8, 3);
    expect(out.greebleProps.count).toBeGreaterThanOrEqual(4);
    expect(out.lightsProps.intensity).toBeGreaterThan(0);
    expect(typeof out.lightsProps.color).toBe('string');
  });
});
