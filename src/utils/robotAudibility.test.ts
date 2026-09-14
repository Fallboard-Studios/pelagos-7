import { describe, it, expect } from 'vitest';

import { isRobotAudible } from './robotAudibility';

describe('isRobotAudible', () => {
  it('returns false when audioMode is mute, regardless of anySolo', () => {
    expect(isRobotAudible('mute', false)).toBe(false);
    expect(isRobotAudible('mute', true)).toBe(false);
  });

  it('returns true when audioMode is none/undefined/highlight and no robot is solo', () => {
    expect(isRobotAudible('none', false)).toBe(true);
    expect(isRobotAudible(undefined, false)).toBe(true);
    expect(isRobotAudible('highlight', false)).toBe(true);
  });

  it('returns false when anySolo is true and this audioMode is not solo', () => {
    expect(isRobotAudible('none', true)).toBe(false);
    expect(isRobotAudible(undefined, true)).toBe(false);
    expect(isRobotAudible('highlight', true)).toBe(false);
  });

  it('returns true when audioMode is solo, even when anySolo is true', () => {
    expect(isRobotAudible('solo', true)).toBe(true);
  });

  it('returns true when anySolo is false, unless audioMode is itself mute', () => {
    expect(isRobotAudible('none', false)).toBe(true);
    expect(isRobotAudible('solo', false)).toBe(true);
    expect(isRobotAudible('mute', false)).toBe(false);
  });
});
