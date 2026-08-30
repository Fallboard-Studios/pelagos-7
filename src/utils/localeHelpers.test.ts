// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach } from 'vitest';

import { getActiveLocaleId } from './localeHelpers';
import { useAttenuationStyleStore, DEFAULT_PELAGOS } from '@/stores/attenuationStyleStore';

// ========================================
// TESTS
// ========================================

describe('getActiveLocaleId', () => {
  beforeEach(() => {
    useAttenuationStyleStore.setState({ attenuationStyles: [{ ...DEFAULT_PELAGOS }], currentAttenuationStyleId: DEFAULT_PELAGOS.id });
  });

  it('returns the current Attenuation Style\'s currentLocaleId', () => {
    expect(getActiveLocaleId()).toBe(DEFAULT_PELAGOS.currentLocaleId);
  });

  it('follows setCurrentAttenuationStyleId to a newly selected Attenuation Style', () => {
    useAttenuationStyleStore.getState().addAttenuationStyle({
      ...DEFAULT_PELAGOS,
      id: 'other',
      name: 'Other',
      currentLocaleId: 'other-locale',
    });
    useAttenuationStyleStore.getState().setCurrentAttenuationStyleId('other');
    expect(getActiveLocaleId()).toBe('other-locale');
  });

  it('returns an empty string without throwing when no Attenuation Style is selected', () => {
    useAttenuationStyleStore.getState().setCurrentAttenuationStyleId('does-not-exist');
    expect(() => getActiveLocaleId()).not.toThrow();
    expect(getActiveLocaleId()).toBe('');
  });

  it('returns an empty string without throwing when the attenuationStyles list is empty', () => {
    useAttenuationStyleStore.getState().removeAttenuationStyle('pelagos');
    expect(() => getActiveLocaleId()).not.toThrow();
    expect(getActiveLocaleId()).toBe('');
  });
});
