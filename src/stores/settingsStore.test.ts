import { describe, it, expect, beforeEach, vi } from 'vitest';

// jsdom does not implement matchMedia — stub it before the store (which reads it
// at module-load time) is imported.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('can be imported and used without throwing', async () => {
    // Regression test: useSettingsStore.subscribe() was previously called on the
    // module-level `useSettingsStore` binding from inside its own create()
    // initializer, which threw a temporal-dead-zone ReferenceError on import.
    const { useSettingsStore } = await import('./settingsStore');
    expect(useSettingsStore.getState().savedTheme).toBe('dark');
  });

  it('setPreference updates a single field', async () => {
    const { useSettingsStore } = await import('./settingsStore');
    useSettingsStore.getState().setPreference('savedTheme', 'light');
    expect(useSettingsStore.getState().savedTheme).toBe('light');
  });

  it('auto-persists to localStorage on state change', async () => {
    const { useSettingsStore } = await import('./settingsStore');
    useSettingsStore.getState().setPreference('language', 'fr');

    const raw = localStorage.getItem('pelagos7.settings.v1');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).language).toBe('fr');
  });

  it('loadPreferences restores values saved by a previous session', async () => {
    localStorage.setItem(
      'pelagos7.settings.v1',
      JSON.stringify({ reducedMotion: true, accessibilityMode: true, savedTheme: 'light', language: 'es' }),
    );
    const { useSettingsStore } = await import('./settingsStore');
    useSettingsStore.getState().loadPreferences();

    const state = useSettingsStore.getState();
    expect(state.reducedMotion).toBe(true);
    expect(state.accessibilityMode).toBe(true);
    expect(state.savedTheme).toBe('light');
    expect(state.language).toBe('es');
  });

  it('loadPreferences leaves defaults in place when storage is corrupted', async () => {
    localStorage.setItem('pelagos7.settings.v1', '{not valid json');
    const { useSettingsStore } = await import('./settingsStore');
    expect(() => useSettingsStore.getState().loadPreferences()).not.toThrow();
    expect(useSettingsStore.getState().savedTheme).toBe('dark');
  });
});
