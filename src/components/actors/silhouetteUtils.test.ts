import { describe, it, expect } from 'vitest';

import { Actor, ActorType } from '../../types/Actor';
import { calcSilhouetteSize, pickSilhouetteFill, bottomAnchorTransform } from './silhouetteUtils';

const DUMMY_ACTOR: Actor = { id: 'a', type: ActorType.FACTORY, position: { x: 100, y: 900 }, isActive: true, cooldownRemaining: 0 };

describe('silhouette utils', () => {
  it('calcSilhouetteSize returns expected width/height', () => {
    const native = { width: 200, height: 300 };
    const baseScale = 1.25; // corresponds to previous baseWidth 250 / native.width 200

    // noiseValue = 0 -> returns base sizes (native * baseScale)
    expect(calcSilhouetteSize(0, native, baseScale)).toEqual({ width: 200 * baseScale, height: 300 * baseScale });

    // noiseValue = 1 -> native contribution added fully
    expect(calcSilhouetteSize(1, native, baseScale)).toEqual({ width: 200 * baseScale + 200, height: 300 * baseScale + 300 });
  });

  it('pickSilhouetteFill uses thresholds correctly', () => {
    const colors = { light: 'L', base: 'B', dark: 'D' };
    expect(pickSilhouetteFill(0.39, colors)).toBe('L');
    expect(pickSilhouetteFill(0.4, colors)).toBe('B');
    expect(pickSilhouetteFill(0.7, colors)).toBe('B');
    expect(pickSilhouetteFill(0.71, colors)).toBe('D');
  });

  it('bottomAnchorTransform anchors bottom correctly', () => {
    const t = bottomAnchorTransform(DUMMY_ACTOR, 360);
    expect(t).toBe('translate(100, 540)'); // 900 - 360 = 540
  });
});