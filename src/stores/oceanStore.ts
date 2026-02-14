// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

import type { Robot } from '../types/Robot';
import { killTimeline } from '../animation/timelineMap';
import { AudioEngine } from '../engine/AudioEngine';
import { DEV_TUNING } from '../constants';

// ========================================
// TYPES
// ========================================

interface OceanStore {
  robots: Robot[];
  selectedRobotId: string | null;
  totalInteractions: number;
  settings: {
    bpm: number;
    maxRobots: number;
  };
  addRobot: (robot: Robot) => void;
  removeRobot: (id: string) => void;
  updateRobot: (id: string, updates: Partial<Robot>) => void;
  getRobotById: (id: string) => Robot | undefined;
  selectRobot: (id: string | null) => void;
  incrementInteractions: () => void;
}

// ========================================
// CONSTANTS
// ========================================
const INITIAL_SETTINGS = {
  bpm: 60,
  maxRobots: 12,
};

// ========================================
// STORE
// ========================================
export const useOceanStore = create<OceanStore>((_set, get) => ({
  robots: [],
  selectedRobotId: null,
  totalInteractions: 0,
  settings: { ...INITIAL_SETTINGS },

  addRobot: (robot) => {
    _set((state) => ({
      robots: [...state.robots, robot],
    }));
  },

  removeRobot: (id) => {
    // Clean up audio first
    AudioEngine.unregisterRobotMelody(id);

    // Clean up animation
    killTimeline(`swim-${id}`);

    // Remove from state
    _set((state) => ({
      robots: state.robots.filter((r) => r.id !== id),
    }));

    if (DEV_TUNING) {
      console.log(`[Cleanup] Robot ${id} removed and cleaned up`);
    }
  },

  updateRobot: (id, updates) => {
    _set((state) => ({
      robots: state.robots.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  getRobotById: (id) => {
    return get().robots.find((r) => r.id === id);
  },

  selectRobot: (id) => {
    _set({ selectedRobotId: id });
  },

  incrementInteractions: () => {
    _set((state) => ({
      totalInteractions: state.totalInteractions + 1,
    }));
  },
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand