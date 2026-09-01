import { create } from 'zustand';
import type { HubTile } from '@/types/hub';

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
  selectedRobotId: string | null;
  /** The company (Roadmap Phase 10) currently selected in the Robots tab's CompanyManager —
   *  null is "None", the default. Independent of selectedRobotId: selecting one never touches
   *  the other. Drives both the company-glow world-view/list highlight and which company's
   *  values the CompanyOptionsSection panel is bound to. Mutually exclusive with
   *  allRobotsSelected — selecting a company (or "None") always clears it. */
  selectedCompanyId: string | null;
  /** The button row's "All" option — highlights every robot regardless of company, false by
   *  default. Mutually exclusive with selectedCompanyId: selectAllRobots clears
   *  selectedCompanyId, and selectCompany (any id, or null for "None") clears this. Deliberately
   *  does NOT feed CompanyOptionsSection/CompanyCrudControls — there is no Company object to
   *  bind a bulk-edit panel or Rename/Delete to for "All"; those stay driven by
   *  selectedCompanyId alone, same as "None". */
  allRobotsSelected: boolean;
  activeHubTile: HubTile | null;
  setActiveLocaleLocalTime: (t: number | null) => void;
  setActiveView: (v: ActiveView) => void;
  setTheme: (t: Theme) => void;
  setLanguage: (lang: string) => void;
  setFullscreen: (f: boolean) => void;
  setPowerOn: () => void;
  setPowerOff: () => void;
  selectRobot: (id: string | null) => void;
  selectCompany: (id: string | null) => void;
  selectAllRobots: () => void;
  setActiveHubTile: (tile: HubTile | null) => void;
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
  selectedRobotId: null,
  selectedCompanyId: null,
  allRobotsSelected: false,
  activeHubTile: null,

  setActiveView: (v) => set({ activeView: v }),
  setTheme: (t) => set({ theme: t }),
  setLanguage: (lang) => set({ language: lang }),
  setFullscreen: (f) => set({ isFullscreen: f }),
  setPowerOn: () => set({ isPoweredOn: true }),
  setPowerOff: () => set({ isPoweredOn: false }),
  setActiveLocaleLocalTime: (t) => set({ activeLocaleLocalTime: t }),
  selectRobot: (id) => set({ selectedRobotId: id }),
  selectCompany: (id) => set({ selectedCompanyId: id, allRobotsSelected: false }),
  selectAllRobots: () => set({ allRobotsSelected: true, selectedCompanyId: null }),
  setActiveHubTile: (tile) => set({ activeHubTile: tile }),
}));

// ========================================
// NOTES
// ========================================
// This store intentionally keeps only JSON-serializable primitives.
// Fullscreen intent is stored here; components should call the
// browser Fullscreen API in response to `isFullscreen` changes.
