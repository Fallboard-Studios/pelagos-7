import { create } from 'zustand';

import type { Actor } from '../types/Actor';
import type { Robot } from '../types/Robot';
import { killTimeline } from '../animation/timelineMap';
import { DEV_TUNING } from '../constants';
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
  /** Current hour derived from currentMeasure (0..23) */
  currentHour: number;
  /** Lightness multiplier (0..1+) applied to robot colors */
  lightnessMultiplier: number;
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
  // Start world at measure 1200 (wrapped into 0..95 range => 1200 % 96 = 48)
  currentMeasure: 48,
  // Derived from wrapped measure: hour = floor(48 / 4) = 12 (noon)
  currentHour: 12,
  // Compute initial lightness to match setCurrentMeasure behaviour so visuals
  // reflect the loaded time immediately.
  lightnessMultiplier: (() => {
    const hour = 12;
    const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
    return 0.7 + 0.3 * Math.sin(angle);
  })(),

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
      if (DEV_TUNING) console.warn('[Cleanup] AudioEngine.releaseVoice threw', err);
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

  setCurrentMeasure: (measure) => {
    const m = measure % 96;

    // Derive hour (0..23) from 96-measure cycle (4 measures = 1 hour)
    const hour = Math.floor((m % 96) / 4);

    // Smooth sinusoidal lightness mapping with anchor points:
    // hour 0 -> 0.4, 6 -> 0.7, 12 -> 1.0, 18 -> 0.7, 23 -> 0.4
    // Use sin curve shifted so hour=0 maps to -1.
    const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
    const lightnessMultiplier = 0.7 + 0.3 * Math.sin(angle);

    _set({ currentMeasure: m, currentHour: hour, lightnessMultiplier });
  },
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand