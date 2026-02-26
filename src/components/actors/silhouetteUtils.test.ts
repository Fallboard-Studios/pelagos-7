import { describe, it, expect } from 'vitest';

import { Actor, ActorType } from '../../types/Actor';
import { calcSilhouetteSize, pickSilhouetteFill, bottomAnchorTransform } from './silhouetteUtils';

const DUMMY_ACTOR: Actor = { id: 'a', type: ActorType.FACTORY, position: { x: 100, y: 900 }, isActive: true, cooldownRemaining: 0 };

describe('silhouette utils', () => {
  it('calcSilhouetteSize returns expected width/height using current formula', () => {
    const native = { width: 200, height: 300 };

    // noiseValue = 0 → minimum size floor (0.85×native)
    expect(calcSilhouetteSize(0, native)).toEqual({ width: 200 * 0.85, height: 300 * 0.85 });

    // noiseValue = 1 → floor plus half of native added (width = native*0.85 + native/2)
    expect(calcSilhouetteSize(1, native)).toEqual({ width: 200 * 0.85 + 100, height: 300 * 0.85 + 150 });
  });

  it('pickSilhouetteFill uses thresholds correctly', () => {
    const colors = { light: 'L', base: 'B', dark: 'D' };
    expect(pickSilhouetteFill(0.39, colors)).toBe('L');
    expect(pickSilhouetteFill(0.4, colors)).toBe('B');
    expect(pickSilhouetteFill(0.7, colors)).toBe('B');
    expect(pickSilhouetteFill(0.71, colors)).toBe('D');
  });

  it('bottomAnchorTransform anchors bottom correctly without scale', () => {
    const t = bottomAnchorTransform(DUMMY_ACTOR, 360);
    expect(t).toBe('translate(100, 540)'); // 900 - 360 = 540
  });

  it('bottomAnchorTransform honours scaleY', () => {
    const scaled: Actor = { ...DUMMY_ACTOR, scaleY: 0.5 };
    const t = bottomAnchorTransform(scaled, 360);
    // height reduced by half: 360 * 0.5 = 180
    expect(t).toBe('translate(100, 720)'); // 900 - 180
  });
});