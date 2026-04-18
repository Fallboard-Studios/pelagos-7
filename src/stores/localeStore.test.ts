import { describe, it, expect } from 'vitest';
import { useLocaleStore } from './localeStore';

describe('localeStore', () => {
  it('initialises with a Pelagos locale', () => {
    const state = useLocaleStore.getState();
    const locales = Object.values(state.locales);
    const hasPelagos = locales.some((l) => l.planetId === 'pelagos');
    expect(hasPelagos).toBeTruthy();
  });
});
