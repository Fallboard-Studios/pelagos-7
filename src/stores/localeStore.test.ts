import { describe, it, expect } from 'vitest';
import { useLocaleStore, DEFAULT_LOCALE_ID } from './localeStore';

describe('localeStore', () => {
  it('initialises with DEFAULT_LOCALE', () => {
    const state = useLocaleStore.getState();
    expect(state.locales[DEFAULT_LOCALE_ID]).toBeDefined();
    expect(state.locales[DEFAULT_LOCALE_ID].planetId).toBe('pelagos');
  });
});
