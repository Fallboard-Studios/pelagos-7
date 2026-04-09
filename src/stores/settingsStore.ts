import { create } from 'zustand';
import { swallow } from '../utils/swallow';
import { DEV_TUNING } from '../constants';

// ========================================
// TYPES
// ========================================

export interface SettingsState {
  reducedMotion: boolean;
  accessibilityMode: boolean;
  savedTheme: string;
  language: string;
}

export interface SettingsStore extends SettingsState {
  setPreference: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loadPreferences: () => void;
  savePreferences: () => void;
}

// ========================================
// CONSTANTS
// ========================================

const STORAGE_KEY = 'pelagos7.settings.v1';

function getSystemReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ========================================
// STORE
// ========================================

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const store: SettingsStore = {
    reducedMotion: getSystemReducedMotion(),
    accessibilityMode: false,
    savedTheme: 'dark',
    language: 'en',

    setPreference: (key, value) => set({ [key]: value } as Partial<SettingsState>),

    loadPreferences: () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<SettingsState>;
        set({
          reducedMotion: saved.reducedMotion ?? getSystemReducedMotion(),
          accessibilityMode: saved.accessibilityMode ?? false,
          savedTheme: saved.savedTheme ?? 'dark',
          language: saved.language ?? 'en',
        });
      } catch (err) {
        if (DEV_TUNING) swallow(err, 'settings.loadPreferences');
        // Corrupted storage — leave defaults in place
      }
    },

    savePreferences: () => {
      const { reducedMotion, accessibilityMode, savedTheme, language } = get();
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ reducedMotion, accessibilityMode, savedTheme, language } satisfies SettingsState),
        );
      } catch (err) {
        if (DEV_TUNING) swallow(err, 'settings.savePreferences');
        // Storage unavailable — silently skip
      }
    },
  };

  // Auto-persist on every state change
  useSettingsStore.subscribe((state) => {
    const { reducedMotion, accessibilityMode, savedTheme, language } = state;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ reducedMotion, accessibilityMode, savedTheme, language } satisfies SettingsState),
      );
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'settings.subscribePersist');
      // Storage unavailable — silently skip
    }
  });

  return store;
});

// ========================================
// NOTES
// ========================================
// All state is JSON-serializable primitives only (no DOM refs, Tone nodes, or GSAP timelines).
// `reducedMotion` reads window.matchMedia on first load; a saved localStorage value always wins.
// `language` is a placeholder for future i18n — no translation logic is implemented here.
