import { describe, it, expect } from 'vitest';

import { isRobotAudible } from './robotAudibility';
import type { Robot } from '@/types/Robot';

/** Minimal locale-robot fixture — isRobotAudible only ever reads .audioMode. */
function robot(audioMode: Robot['audioMode']): Robot {
  return { audioMode } as Robot;
}

describe('isRobotAudible', () => {
  it('returns false when audioMode is mute, regardless of other robots', () => {
    expect(isRobotAudible('mute', [])).toBe(false);
    expect(isRobotAudible('mute', [robot('none'), robot('highlight')])).toBe(false);
  });

  it('returns true when audioMode is none/undefined/highlight and no other robot is solo', () => {
    expect(isRobotAudible('none', [robot('none')])).toBe(true);
    expect(isRobotAudible(undefined, [robot('none')])).toBe(true);
    expect(isRobotAudible('highlight', [robot('highlight'), robot('none')])).toBe(true);
  });

  it('returns false when another robot is solo and this audioMode is not solo', () => {
    expect(isRobotAudible('none', [robot('solo'), robot('none')])).toBe(false);
    expect(isRobotAudible(undefined, [robot('solo')])).toBe(false);
    expect(isRobotAudible('highlight', [robot('solo')])).toBe(false);
  });

  it('returns true when audioMode is solo, even as the only solo entry present', () => {
    expect(isRobotAudible('solo', [robot('solo'), robot('none')])).toBe(true);
  });

  it('returns true for an empty localeRobots array, unless audioMode is itself mute', () => {
    expect(isRobotAudible('none', [])).toBe(true);
    expect(isRobotAudible('solo', [])).toBe(true);
    expect(isRobotAudible('mute', [])).toBe(false);
  });
});
