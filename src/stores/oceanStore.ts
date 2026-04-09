import { create } from 'zustand';

import type { Actor } from '../types/Actor';
import type { Robot } from '../types/Robot';
import { killTimeline } from '../animation/timelineMap';
import { DEV_TUNING } from '../constants';
import { swallow } from '../utils/swallow';
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
    /** Planet size mapping (small|medium|large). Controls real-world minutes per in-world day. */
    planetSize: 'small' | 'medium' | 'large';
  };
  /** Current hour derived from currentMeasure (0..23) */
  currentHour: number;
  /** Timestamp (ms) representing the start of the current in-world day */
  dayStartTimestamp: number;
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
  /** Set the current in-world hour (float, 0..24). Called by the time-of-day tick. */
  setCurrentHour: (hour: number) => void;
  /** Update the configured day length (in measures) */
  setPlanetSize: (size: 'small' | 'medium' | 'large') => void;
  setDayStartTimestamp: (ts: number) => void;
}

// ========================================
// CONSTANTS
// ========================================
const INITIAL_SETTINGS = {
  bpm: 240,
  maxRobots: 12,
  minRobots: 2,
  planetSize: 'medium' as const,
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
  // Start world at an arbitrary measure (no wrapping for time-of-day)
  currentMeasure: (() => 1200)(),
  // Time-of-day is driven by wall clock. On load the day starts now, so
  // currentHour should be approximately 0.
  dayStartTimestamp: Date.now(),
  currentHour: 0,
  // Compute initial lightness from hour=0 so visuals reflect midnight.
  lightnessMultiplier: (() => {
    const hour = 0;
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

  setCurrentMeasure: (measure) => {
    _set({ currentMeasure: measure });
  },

  setCurrentHour: (hour) => {
    // hour is a float (e.g. 6.5 = 6:30). Compute lightness from the float hour.
    const normalized = hour % 24;
    const angle = (normalized / 24) * 2 * Math.PI - Math.PI / 2;
    const lightnessMultiplier = 0.7 + 0.3 * Math.sin(angle);
    _set({ currentHour: normalized, lightnessMultiplier });
  },

  setPlanetSize: (size) => {
    _set((state) => ({ settings: { ...state.settings, planetSize: size } }));
  },

  setDayStartTimestamp: (ts) => {
    _set({ dayStartTimestamp: ts });
  },
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand