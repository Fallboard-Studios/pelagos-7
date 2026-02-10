// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

import type { Robot } from '../types/Robot';
import { killTimeline } from '../animation/timelineMap';

// ========================================
// TYPES
// ========================================

interface OceanStore {
  robots: Robot[];
  settings: {
    bpm: number;
    maxRobots: number;
  };
  addRobot: (robot: Robot) => void;
  removeRobot: (id: string) => void;
  updateRobot: (id: string, updates: Partial<Robot>) => void;
  getRobotById: (id: string) => Robot | undefined;
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
  settings: { ...INITIAL_SETTINGS },

  addRobot: (robot) => {
    _set((state) => ({
      robots: [...state.robots, robot],
    }));
  },

  removeRobot: (id) => {
    // Clean up associated timeline before removing robot
    killTimeline(`swim-${id}`);

    _set((state) => ({
      robots: state.robots.filter((r) => r.id !== id),
    }));
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
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand