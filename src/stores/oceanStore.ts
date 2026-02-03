// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

// ========================================
// TYPES
// ========================================
export interface Robot {
  id: string;
  // Add more robot fields as needed
}

interface OceanStore {
  robots: Robot[];
  settings: {
    bpm: number;
    maxRobots: number;
  };
  addRobot: (robot: Robot) => void;
  removeRobot: (id: string) => void;
  updateRobot: (robot: Robot) => void;
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
export const useOceanStore = create<OceanStore>((_set, _get) => ({
  robots: [],
  settings: { ...INITIAL_SETTINGS },
  addRobot: (robot) => {
    // Stub: log only for now
    console.log('[OceanStore] addRobot called', robot);
    // Implementation to be added in future milestones
  },
  removeRobot: (id) => {
    // Stub: log only for now
    console.log('[OceanStore] removeRobot called', id);
    // Implementation to be added in future milestones
  },
  updateRobot: (robot) => {
    // Stub: log only for now
    console.log('[OceanStore] updateRobot called', robot);
    // Implementation to be added in future milestones
  },
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand