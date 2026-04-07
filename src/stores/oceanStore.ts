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
    /** Number of measures that make up a full day (default 96) */
    dayLengthMeasures: number;
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
  /** Update the configured day length (in measures) */
  setDayLength: (measures: number) => void;
}

// ========================================
// CONSTANTS
// ========================================
const INITIAL_SETTINGS = {
  bpm: 240,
  maxRobots: 12,
  minRobots: 2,
  dayLengthMeasures: 96,
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
  // Start world at measure 1200 wrapped into configured day length
  currentMeasure: (() => 1200 % INITIAL_SETTINGS.dayLengthMeasures)(),
  // Derived from wrapped measure using configured day length
  currentHour: (() => {
    const m = 1200 % INITIAL_SETTINGS.dayLengthMeasures;
    return Math.floor(m / (INITIAL_SETTINGS.dayLengthMeasures / 24));
  })(),
  // Compute initial lightness to match setCurrentMeasure behaviour so visuals
  // reflect the loaded time immediately.
  lightnessMultiplier: (() => {
    const m = 1200 % INITIAL_SETTINGS.dayLengthMeasures;
    const hour = Math.floor(m / (INITIAL_SETTINGS.dayLengthMeasures / 24));
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
    const dayLength = get().settings.dayLengthMeasures;
    const m = measure % dayLength;

    // Derive hour (0..23) from configured day-length (dayLength / 24 measures = 1 hour)
    const hour = Math.floor(m / (dayLength / 24));

    // Smooth sinusoidal lightness mapping with anchor points:
    // hour 0 -> 0.4, 6 -> 0.7, 12 -> 1.0, 18 -> 0.7, 23 -> 0.4
    // Use sin curve shifted so hour=0 maps to -1.
    const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2;
    const lightnessMultiplier = 0.7 + 0.3 * Math.sin(angle);

    _set({ currentMeasure: m, currentHour: hour, lightnessMultiplier });
  },

  setDayLength: (measures) => {
    const sanitized = Math.max(1, Math.floor(measures));
    _set((state) => ({ settings: { ...state.settings, dayLengthMeasures: sanitized } }));
  },
}));

// ========================================
// NOTES
// ========================================
// See: https://github.com/Fallboard-Studios/pelagos-7/issues/8
// Docs: docs/ARCHITECTURE.md#state-zustand