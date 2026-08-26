// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  tickRobotLifecycle,
  startRobotLifecycle,
  stopRobotLifecycle,
  scoreJobAffinities,
  assignJob,
  landOnActive,
  landOnDocked,
} from './robotSystems';
import { useLocaleStore, DEFAULT_LOCALE } from '../stores/localeStore';
import { DEFAULT_LOCALE_ID } from '../stores/planetStore';
import { AudioEngine } from '../engine/AudioEngine';
import { DockingState, JobType } from '../types/Robot';
import type { Robot } from '../types/Robot';
import {
  BATTERY_DRAIN_BASE,
  JOB_BATTERY_DRAIN_SURCHARGE,
  BATTERY_RECHARGE_RATE,
  BATTERY_CRITICAL_THRESHOLD,
  BATTERY_FULL_THRESHOLD,
  JOB_MAX_ROBOTS_PER_TYPE,
} from '../constants';

// ========================================
// MOCKS
// ========================================

// handleRobotIdle has real GSAP/SVG-ref side effects (createSwimTimeline) that
// are already covered by idleSystem's own tests — mock it here so
// robotSystems tests assert only "was it invoked", not idleSystem's internals.
vi.mock('./idleSystem', () => ({
  handleRobotIdle: vi.fn(),
}));
import { handleRobotIdle } from './idleSystem';

vi.mock('../engine/beatClock', () => ({
  subscribeToMeasure: vi.fn(() => vi.fn()),
  getCurrentMeasure: vi.fn(() => 42),
}));
import { subscribeToMeasure } from '../engine/beatClock';

// ========================================
// HELPERS
// ========================================

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: overrides.id ?? 'robot-1',
    name: 'Test Robot',
    state: 'idle',
    position: { x: 100, y: 100 },
    destination: null,
    direction: 'right',
    melody: [
      { id: 'e1', startStep: 1, length: '16n', noteIndex: 0, octave: 4 },
      { id: 'e2', startStep: 5, length: '16n', noteIndex: 1, octave: 4 },
      { id: 'e3', startStep: 9, length: '16n', noteIndex: 2, octave: 4 },
      { id: 'e4', startStep: 13, length: '16n', noteIndex: 3, octave: 4 },
    ],
    audioAttributes: {
      adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2 },
      filterFreq: 800,
      waveform: 'sine',
      layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0 }],
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: DockingState.Active,
    batteryLevel: 100,
    ...overrides,
  };
}

function setupLocaleWithRobots(robots: Robot[]): void {
  useLocaleStore.setState({
    locales: {
      [DEFAULT_LOCALE_ID]: { ...DEFAULT_LOCALE, robots },
    },
  });
}

// ========================================
// TESTS
// ========================================

describe('robotSystems', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE } });
    vi.clearAllMocks();
  });

  describe('tickRobotLifecycle — battery drain (Active)', () => {
    it('drains by BATTERY_DRAIN_BASE with no job assigned', () => {
      const robot = makeRobot({ batteryLevel: 50, job: undefined });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBe(50 - BATTERY_DRAIN_BASE);
    });

    it.each(Object.values(JobType))('drains by base + surcharge for job type %s', (jobType) => {
      const robot = makeRobot({ batteryLevel: 80, job: { type: jobType, assignedAtMeasure: 0 } });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBe(80 - (BATTERY_DRAIN_BASE + JOB_BATTERY_DRAIN_SURCHARGE[jobType]));
    });

    it('floors battery at 0, never negative', () => {
      const robot = makeRobot({ batteryLevel: 1, job: { type: JobType.FluidMonitoring, assignedAtMeasure: 0 } });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBe(0);
    });
  });

  describe('tickRobotLifecycle — battery recharge (Docked)', () => {
    it('recharges by BATTERY_RECHARGE_RATE', () => {
      const robot = makeRobot({ docking: DockingState.Docked, batteryLevel: 50 });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBe(50 + BATTERY_RECHARGE_RATE);
    });

    it('caps recharge at 100, never above', () => {
      const robot = makeRobot({ docking: DockingState.Docked, batteryLevel: 98 });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBe(100);
    });
  });

  describe('tickRobotLifecycle — threshold-triggered transitions', () => {
    it('Active robot crossing the critical threshold begins Departing with a hold, not immediate Docked', () => {
      const robot = makeRobot({
        batteryLevel: BATTERY_CRITICAL_THRESHOLD + BATTERY_DRAIN_BASE, // will land exactly at critical after drain
        job: undefined,
      });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBeLessThanOrEqual(BATTERY_CRITICAL_THRESHOLD);
      expect(updated?.docking).toBe(DockingState.Departing);
      expect(updated?.dockingHoldUntilMeasure).toBe(11);
    });

    it('Docked robot reaching full battery begins Docking with a hold, not immediate Active', () => {
      const robot = makeRobot({
        docking: DockingState.Docked,
        batteryLevel: BATTERY_FULL_THRESHOLD - BATTERY_RECHARGE_RATE,
      });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 20);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBe(BATTERY_FULL_THRESHOLD);
      expect(updated?.docking).toBe(DockingState.Docking);
      expect(updated?.dockingHoldUntilMeasure).toBe(21);
    });

    it('a Departing robot does not drain further while held', () => {
      const robot = makeRobot({ docking: DockingState.Departing, dockingHoldUntilMeasure: 15, batteryLevel: 5 });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.batteryLevel).toBe(5);
    });
  });

  describe('tickRobotLifecycle — hold-elapsed landing', () => {
    it('a Docking robot whose hold has elapsed lands on Active', () => {
      const robot = makeRobot({
        docking: DockingState.Docking,
        dockingHoldUntilMeasure: 10,
        batteryLevel: 100,
        job: undefined,
      });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.docking).toBe(DockingState.Active);
      expect(updated?.dockingHoldUntilMeasure).toBeUndefined();
    });

    it('a Docking robot whose hold has NOT elapsed stays Docking', () => {
      const robot = makeRobot({ docking: DockingState.Docking, dockingHoldUntilMeasure: 15, batteryLevel: 100 });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.docking).toBe(DockingState.Docking);
    });

    it('a Departing robot whose hold has elapsed lands on Docked', () => {
      const robot = makeRobot({ docking: DockingState.Departing, dockingHoldUntilMeasure: 10, batteryLevel: 5 });
      setupLocaleWithRobots([robot]);

      tickRobotLifecycle(DEFAULT_LOCALE_ID, 10);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.docking).toBe(DockingState.Docked);
      expect(updated?.dockingHoldUntilMeasure).toBeUndefined();
    });
  });

  describe('landOnActive', () => {
    it('sets docking to Active and clears the hold', () => {
      const robot = makeRobot({ docking: DockingState.Docking, dockingHoldUntilMeasure: 5, job: undefined });
      setupLocaleWithRobots([robot]);

      landOnActive(DEFAULT_LOCALE_ID, robot.id);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.docking).toBe(DockingState.Active);
      expect(updated?.dockingHoldUntilMeasure).toBeUndefined();
    });

    it('reserves a voice and registers the melody with AudioEngine', () => {
      const robot = makeRobot({ docking: DockingState.Docking, job: undefined });
      setupLocaleWithRobots([robot]);

      landOnActive(DEFAULT_LOCALE_ID, robot.id);

      expect(AudioEngine.getVoiceForRobot(robot.id)).not.toBeNull();
      expect(AudioEngine.getRegisteredMelody(robot.id)).toEqual(robot.melody);
    });

    it('assigns a job', () => {
      const robot = makeRobot({ docking: DockingState.Docking, job: undefined });
      setupLocaleWithRobots([robot]);

      landOnActive(DEFAULT_LOCALE_ID, robot.id);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.job).toBeDefined();
      expect(Object.values(JobType)).toContain(updated?.job?.type);
    });

    it('restarts idle wandering via handleRobotIdle', () => {
      const robot = makeRobot({ docking: DockingState.Docking, job: undefined });
      setupLocaleWithRobots([robot]);

      landOnActive(DEFAULT_LOCALE_ID, robot.id);

      expect(handleRobotIdle).toHaveBeenCalledWith(DEFAULT_LOCALE_ID, robot.id);
    });
  });

  describe('landOnDocked', () => {
    it('sets docking to Docked and clears the hold', () => {
      const robot = makeRobot({ docking: DockingState.Departing, dockingHoldUntilMeasure: 5 });
      setupLocaleWithRobots([robot]);

      landOnDocked(DEFAULT_LOCALE_ID, robot.id);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.docking).toBe(DockingState.Docked);
      expect(updated?.dockingHoldUntilMeasure).toBeUndefined();
    });

    it('releases the voice and unregisters the melody from AudioEngine', () => {
      const robot = makeRobot({ docking: DockingState.Departing });
      setupLocaleWithRobots([robot]);
      AudioEngine.reserveVoice(robot.id, robot.audioAttributes.layers!);
      AudioEngine.registerRobotMelody(robot.id, robot.melody);

      landOnDocked(DEFAULT_LOCALE_ID, robot.id);

      expect(AudioEngine.getVoiceForRobot(robot.id)).toBeNull();
      expect(AudioEngine.getRegisteredMelody(robot.id)).toEqual([]);
    });

    it('repositions the robot off-screen (outside the world bounds)', () => {
      const robot = makeRobot({ docking: DockingState.Departing, position: { x: 500, y: 500 } });
      setupLocaleWithRobots([robot]);

      landOnDocked(DEFAULT_LOCALE_ID, robot.id);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      const outsideX = (updated?.position.x ?? 0) < 0 || (updated?.position.x ?? 0) > 1920;
      const outsideY = (updated?.position.y ?? 0) < 0 || (updated?.position.y ?? 0) > 1080;
      expect(outsideX || outsideY).toBe(true);
    });

    it('re-rolls ~25% of melody noteIndex values, leaving startStep/length/octave unchanged', () => {
      const robot = makeRobot({ docking: DockingState.Departing });
      setupLocaleWithRobots([robot]);

      landOnDocked(DEFAULT_LOCALE_ID, robot.id);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.melody).toHaveLength(robot.melody.length);
      expect(updated?.melody.map((e) => e.startStep)).toEqual(robot.melody.map((e) => e.startStep));
      expect(updated?.melody.map((e) => e.length)).toEqual(robot.melody.map((e) => e.length));
      expect(updated?.melody.map((e) => e.octave)).toEqual(robot.melody.map((e) => e.octave));
      const changedCount = updated!.melody.filter((e, i) => e.noteIndex !== robot.melody[i].noteIndex).length;
      expect(changedCount).toBeGreaterThanOrEqual(1); // round(4 * 0.25) = 1
    });

    it('re-rolls a different subset of pitches on successive dock cycles for the same robot', () => {
      const robot = makeRobot({ docking: DockingState.Departing, id: 'drift-robot' });
      setupLocaleWithRobots([robot]);

      landOnDocked(DEFAULT_LOCALE_ID, robot.id);
      const afterFirst = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id)!;

      useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, robot.id, { docking: DockingState.Departing });
      landOnDocked(DEFAULT_LOCALE_ID, robot.id);
      const afterSecond = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id)!;

      // Not a strict guarantee for any single seed, but across two independent
      // dock cycles the noteIndex arrays should not always be identical.
      const identical = JSON.stringify(afterFirst.melody.map((e) => e.noteIndex)) ===
        JSON.stringify(afterSecond.melody.map((e) => e.noteIndex));
      expect(identical).toBe(false);
    });
  });

  describe('scoreJobAffinities', () => {
    it('scores Vent Extraction highest for a low-register, dense, low-variance robot', () => {
      const robot = makeRobot({
        octaveRange: [1, 2],
        rhythmicDensity: 90,
        rhythmicMotifLength: { active: true, value: 2 },
        noteVariance: { active: true, value: 2 },
      });
      const scores = scoreJobAffinities(robot);
      const highest = (Object.keys(scores) as JobType[]).sort((a, b) => scores[b] - scores[a])[0];
      expect(highest).toBe(JobType.VentExtraction);
    });

    it('scores Acoustic Survey highest for a high-register, sparse, unrestricted-variance robot', () => {
      const robot = makeRobot({
        octaveRange: [6, 7],
        rhythmicDensity: 20,
        rhythmicMotifLength: { active: false, value: 8 },
        noteVariance: { active: false, value: 1 },
      });
      const scores = scoreJobAffinities(robot);
      const highest = (Object.keys(scores) as JobType[]).sort((a, b) => scores[b] - scores[a])[0];
      expect(highest).toBe(JobType.AcousticSurvey);
    });

    it('scores Structural Inspection highest for a wide-span robot with a mid-length motif', () => {
      const robot = makeRobot({
        octaveRange: [1, 7],
        rhythmicDensity: 70,
        rhythmicMotifLength: { active: true, value: 6 },
        noteVariance: { active: false, value: 1 },
      });
      const scores = scoreJobAffinities(robot);
      const highest = (Object.keys(scores) as JobType[]).sort((a, b) => scores[b] - scores[a])[0];
      expect(highest).toBe(JobType.StructuralInspection);
    });

    it('scores Fluid Monitoring highest for a mid-register, default-density robot', () => {
      const robot = makeRobot({
        octaveRange: [3, 4],
        rhythmicDensity: 50,
        rhythmicMotifLength: { active: true, value: 8 },
        noteVariance: { active: false, value: 1 },
      });
      const scores = scoreJobAffinities(robot);
      const highest = (Object.keys(scores) as JobType[]).sort((a, b) => scores[b] - scores[a])[0];
      expect(highest).toBe(JobType.FluidMonitoring);
    });

    it('is deterministic — same robot attributes in, same scores out', () => {
      const robot = makeRobot({ octaveRange: [2, 5], rhythmicDensity: 65 });
      expect(scoreJobAffinities(robot)).toEqual(scoreJobAffinities(robot));
    });
  });

  describe('assignJob', () => {
    it('assigns the highest-scoring job type when no cap is in play', () => {
      const robot = makeRobot({
        id: 'vent-robot',
        octaveRange: [1, 2],
        rhythmicDensity: 90,
        rhythmicMotifLength: { active: true, value: 2 },
        noteVariance: { active: true, value: 2 },
        job: undefined,
      });
      setupLocaleWithRobots([robot]);

      assignJob(DEFAULT_LOCALE_ID, robot.id);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, robot.id);
      expect(updated?.job?.type).toBe(JobType.VentExtraction);
      expect(updated?.job?.assignedAtMeasure).toBe(42); // mocked getCurrentMeasure
    });

    it('respects JOB_MAX_ROBOTS_PER_TYPE — a 4th same-profile robot gets its next-best available type', () => {
      const ventProfile = {
        octaveRange: [1, 2] as [number, number],
        rhythmicDensity: 90,
        rhythmicMotifLength: { active: true, value: 2 },
        noteVariance: { active: true, value: 2 },
      };
      const alreadyAssigned = Array.from({ length: JOB_MAX_ROBOTS_PER_TYPE }, (_, i) =>
        makeRobot({ id: `vent-${i}`, ...ventProfile, job: { type: JobType.VentExtraction, assignedAtMeasure: 0 } })
      );
      const newcomer = makeRobot({ id: 'vent-overflow', ...ventProfile, job: undefined });
      setupLocaleWithRobots([...alreadyAssigned, newcomer]);

      assignJob(DEFAULT_LOCALE_ID, newcomer.id);

      const updated = useLocaleStore.getState().getRobotById(DEFAULT_LOCALE_ID, newcomer.id);
      expect(updated?.job?.type).not.toBe(JobType.VentExtraction);
      expect(Object.values(JobType)).toContain(updated?.job?.type);
    });
  });

  describe('startRobotLifecycle / stopRobotLifecycle', () => {
    it('subscribes to measure ticks on start', () => {
      startRobotLifecycle(DEFAULT_LOCALE_ID);
      expect(subscribeToMeasure).toHaveBeenCalledTimes(1);
      stopRobotLifecycle();
    });

    it('is idempotent — a second start before stop does not subscribe again', () => {
      startRobotLifecycle(DEFAULT_LOCALE_ID);
      startRobotLifecycle(DEFAULT_LOCALE_ID);
      expect(subscribeToMeasure).toHaveBeenCalledTimes(1);
      stopRobotLifecycle();
    });

    it('unsubscribes on stop, and a repeated stop is a safe no-op', () => {
      const unsubscribe = vi.fn();
      (subscribeToMeasure as ReturnType<typeof vi.fn>).mockReturnValueOnce(unsubscribe);

      startRobotLifecycle(DEFAULT_LOCALE_ID);
      stopRobotLifecycle();
      expect(unsubscribe).toHaveBeenCalledTimes(1);

      stopRobotLifecycle(); // second stop — must not throw, must not call unsubscribe again
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('starting again after a stop subscribes a new listener', () => {
      startRobotLifecycle(DEFAULT_LOCALE_ID);
      stopRobotLifecycle();
      startRobotLifecycle(DEFAULT_LOCALE_ID);
      expect(subscribeToMeasure).toHaveBeenCalledTimes(2);
      stopRobotLifecycle();
    });
  });
});
