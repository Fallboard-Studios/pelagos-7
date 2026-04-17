import { create } from 'zustand';

import type { Actor } from '../types/Actor';
import type { Robot } from '../types/Robot';
import { killTimeline } from '../animation/timelineMap';
import { DEV_TUNING } from '../constants';
import { swallow } from '../utils/helpers';
import { AudioEngine } from '../engine/AudioEngine';
import { cancelPendingIdleDelay } from '../systems/idleSystem';
import { cancelPendingInteractionRecovery } from '../systems/interactionSystem';

// ========================================
// TYPES
// ========================================

export interface OceanStore {
  robots: Robot[];
  actors: Actor[];
  selectedRobotId: string | null;
  totalInteractions: number;
  settings: {
    bpm: number;
    maxRobots: number;
    minRobots: number; // lower bound for population bouncing
  };
  /** Transient playback-only fields are kept in `oceanStore`; planet/locale data moved to planetStore/localeStore. */
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
  // Planet/locale time and configuration moved to planetStore/localeStore.
}

// ========================================
// CONSTANTS

// ========================================
// CONSTANTS
// ========================================
const INITIAL_SETTINGS = {
  bpm: 240,
  maxRobots: 12,
  minRobots: 2,
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

  addRobot: (robot) => {
    _set((state) => ({
      robots: [...state.robots, robot],
    }));
  },

  removeRobot: (id) => {
    // Clean up idle delay
    cancelPendingIdleDelay(id);

    // Clean up interaction recovery delay
    cancelPendingInteractionRecovery(id);

    // Clean up audio
    try {
      AudioEngine.releaseVoice(id);
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.releaseVoice');
    }
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
  // Note: planet/locale setters and time/state are now owned by planetStore/localeStore.
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand