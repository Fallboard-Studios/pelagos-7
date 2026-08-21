import { describe, it, expect, vi } from 'vitest';

vi.mock('tone', () => ({ Gain: vi.fn(), NotAFunction: 'not-a-constructor' }));

import { getToneCtor } from './toneHelpers';

describe('getToneCtor', () => {
  it('returns the constructor when it exists and is a function', async () => {
    const Tone = await import('tone');
    expect(getToneCtor('Gain')).toBe(Tone.Gain);
  });

  it('returns undefined when the named export exists but is not a function', () => {
    expect(getToneCtor('NotAFunction')).toBeUndefined();
  });
});
