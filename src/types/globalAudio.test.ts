// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from './globalAudio';

// ========================================
// TESTS
// ========================================

describe('DEFAULT_GLOBAL_AUDIO_SETTINGS', () => {
  it('has an independent filterLPF matching AudioEngine\'s lowpass node defaults', () => {
    expect(DEFAULT_GLOBAL_AUDIO_SETTINGS.filterLPF).toEqual({
      enabled: false,
      type: 'lowpass',
      frequency: 20000,
      Q: 1,
    });
  });

  it('has an independent filterHPF matching AudioEngine\'s highpass node defaults', () => {
    expect(DEFAULT_GLOBAL_AUDIO_SETTINGS.filterHPF).toEqual({
      enabled: false,
      type: 'highpass',
      frequency: 20,
      Q: 1,
    });
  });

  it('no longer has a single generic "filter" key', () => {
    // GlobalAudioSettings used to declare one `filter` field even though
    // AudioEngine has always built two independent Tone filter nodes
    // (_globalLPF/_globalHPF) with separate setters — this asserts the
    // stale generic key is gone, not just that the two real ones exist.
    expect('filter' in DEFAULT_GLOBAL_AUDIO_SETTINGS).toBe(false);
  });

  it('remains JSON-serializable', () => {
    expect(() => JSON.stringify(DEFAULT_GLOBAL_AUDIO_SETTINGS)).not.toThrow();
  });
});
