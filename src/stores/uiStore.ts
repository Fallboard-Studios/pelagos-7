import { create } from 'zustand';

// ========================================
// TYPES
// ========================================

export type ActiveView = 'ocean' | 'robot' | 'composition' | 'fx' | 'settings';
export type Theme = 'dark' | 'light';

export interface UIStore {
  activeView: ActiveView;
  theme: Theme;
  language: string;
  isPoweredOn: boolean;
  isFullscreen: boolean;
  activeLocaleLocalTime: number | null;
  setActiveLocaleLocalTime: (t: number | null) => void;
  setActiveView: (v: ActiveView) => void;
  setTheme: (t: Theme) => void;
  setLanguage: (lang: string) => void;
  setFullscreen: (f: boolean) => void;
  setPowerOn: () => void;
  setPowerOff: () => void;
}

// ========================================
// STORE
// ========================================

export const useUIStore = create<UIStore>((set) => ({
  activeView: 'ocean',
  theme: 'dark',
  language: 'en',
  isFullscreen: false,
  isPoweredOn: false,
  activeLocaleLocalTime: null,

  setActiveView: (v) => set({ activeView: v }),
  setTheme: (t) => set({ theme: t }),
  setLanguage: (lang) => set({ language: lang }),
  setFullscreen: (f) => set({ isFullscreen: f }),
  setPowerOn: () => set({ isPoweredOn: true }),
  setPowerOff: () => set({ isPoweredOn: false }),
  setActiveLocaleLocalTime: (t) => set({ activeLocaleLocalTime: t }),
}));

// ========================================
// NOTES
// ========================================
// This store intentionally keeps only JSON-serializable primitives.
// Fullscreen intent is stored here; components should call the
// browser Fullscreen API in response to `isFullscreen` changes.
