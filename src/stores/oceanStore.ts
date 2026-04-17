import { create } from 'zustand';

// Ocean store keeps only transient playback/runtime fields. Planet/locale
// persistent data (robots, actors, settings, time) live in planetStore/localeStore.

// ========================================
// TYPES
// ========================================

export interface OceanStore {
  selectedRobotId: string | null;
  selectRobot: (id: string | null) => void;
  // Planet/locale time and configuration are owned by planetStore/localeStore.
}

// ========================================
// CONSTANTS

// ========================================
// CONSTANTS
// ========================================
// ========================================
// STORE
// ========================================
export const useOceanStore = create<OceanStore>((_set) => ({
  selectedRobotId: null,

  selectRobot: (id) => {
    _set({ selectedRobotId: id });
  },

}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand
