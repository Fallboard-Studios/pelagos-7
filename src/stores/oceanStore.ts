import { create } from 'zustand';

import type { Actor } from '../types/Actor';
import type { Robot } from '../types/Robot';
import { killTimeline } from '../animation/timelineMap';
import { DEV_TUNING } from '../constants';
import { AudioEngine } from '../engine/AudioEngine';

// ========================================
// TYPES
// ========================================

interface OceanStore {
  robots: Robot[];
  actors: Actor[];
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
  // Actors
  setActors: (actors: Actor[]) => void;
  addActor: (actor: Actor) => void;
  getActorById: (id: string) => Actor | undefined;
  selectRobot: (id: string | null) => void;
  incrementInteractions: () => void;
  /** Current measure in the 96-measure day/night cycle (0–95). */
  currentMeasure: number;
  setCurrentMeasure: (measure: number) => void;
}

// ========================================
// CONSTANTS
// ========================================
const INITIAL_SETTINGS = {
  bpm: 120,
  maxRobots: 12,
};

// ========================================
// STORE
// ========================================
export const useOceanStore = create<OceanStore>((_set, get) => ({
  robots: [],
  actors: [],
  selectedRobotId: null,
  totalInteractions: 0,
  settings: { ...INITIAL_SETTINGS },
  currentMeasure: 0,

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

  // Actors
  setActors: (actors) => {
    _set({ actors });
  },

  addActor: (actor) => {
    _set((state) => ({ actors: [...state.actors, actor] }));
  },

  getActorById: (id) => {
    return get().actors.find((a) => a.id === id);
  },

  selectRobot: (id) => {
    _set({ selectedRobotId: id });
  },

  incrementInteractions: () => {
    _set((state) => ({
      totalInteractions: state.totalInteractions + 1,
    }));
  },

  setCurrentMeasure: (measure) => {
    _set({ currentMeasure: measure % 96 });
  },
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand