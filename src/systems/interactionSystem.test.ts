// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { triggerInteraction } from './interactionSystem';
import { RobotState } from '../types/Robot';
import type { Robot } from '../types/Robot';
import { useOceanStore } from '../stores/oceanStore';
import * as TimelineMap from '../animation/timelineMap';
import * as AudioEngineModule from '../engine/AudioEngine';

// ========================================
// MOCKS
// ========================================

let delayedCallbacks: Array<() => void> = [];

// Mock BeatClock
vi.mock('../engine/beatClock', () => ({
  getCurrentMeasure: vi.fn(() => 100),
}));

// Mock GSAP
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    delayedCall: vi.fn((delay, callback) => {
      // Store callback instead of executing immediately
      // Tests can control when callbacks execute via flushDelayedCalls()
      delayedCallbacks.push(callback);
    }),
    getProperty: vi.fn(() => 0),
  },
}));

// Mock audio engine
vi.mock('../engine/AudioEngine', () => ({
  AudioEngine: {
    scheduleNote: vi.fn(),
    unregisterRobotMelody: vi.fn(),
  },
}));

// Mock harmony system
vi.mock('../engine/harmonySystem', () => ({
  getAvailableNotes: vi.fn(() => ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']),
}));

// Mock animation/timeline
vi.mock('../animation/timelineMap', () => ({
  killTimeline: vi.fn(),
}));

// Mock refs
vi.mock('../utils/refs', () => ({
  getRef: vi.fn(() => ({})), // Return valid ref object for state updates
}));

// Mock idle system
vi.mock('./idleSystem', () => ({
  handleRobotIdle: vi.fn(),
}));

// ========================================
// SETUP
// ========================================

const createTestRobot = (id: string, state = RobotState.Idle): Robot => ({
  id,
  state,
  position: { x: 0, y: 0 },
  destination: null,
  melody: [
    {
      id: 'melody-1',
      startStep: 1,
      length: '16n',
      noteIndex: 0,
    },
    {
      id: 'melody-2',
      startStep: 3,
      length: '16n',
      noteIndex: 1,
    },
  ],
  audioAttributes: {
    synthType: 'PolySynth',
    adsr: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.3 },
    pitchRange: { min: 200, max: 400 },
    filterFreq: 1000,
    reverb: 0.3,
  },
});

beforeEach(() => {
  // Reset store state
  useOceanStore.setState({
    robots: [],
    selectedRobotId: null,
    totalInteractions: 0,
  });

  // Clear all mocks and delayed callbacks
  vi.clearAllMocks();
  delayedCallbacks = [];
});

afterEach(() => {
  vi.clearAllMocks();
  delayedCallbacks = [];
});

// ========================================
// TESTS
// ========================================

describe('InteractionSystem', () => {
  describe('triggerInteraction', () => {
    it('sets both robots to interacting state', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');

      useOceanStore.setState({
        robots: [robotA, robotB],
      });

      triggerInteraction('robot-a', 'robot-b');

      const state = useOceanStore.getState();
      const updatedA = state.getRobotById('robot-a');
      const updatedB = state.getRobotById('robot-b');

      expect(updatedA?.state).toBe(RobotState.Interacting);
      expect(updatedB?.state).toBe(RobotState.Interacting);
    });

    it('applies cooldown to both robots', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');

      useOceanStore.setState({
        robots: [robotA, robotB],
      });

      triggerInteraction('robot-a', 'robot-b');

      const state = useOceanStore.getState();
      const updatedA = state.getRobotById('robot-a');
      const updatedB = state.getRobotById('robot-b');

      // Both should have cooldown set to current measure (100)
      expect(updatedA?.lastInteractionMeasure).toBe(100);
      expect(updatedB?.lastInteractionMeasure).toBe(100);
    });

    it('increments total interaction counter', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');

      useOceanStore.setState({
        robots: [robotA, robotB],
        totalInteractions: 5,
      });

      triggerInteraction('robot-a', 'robot-b');

      const state = useOceanStore.getState();
      expect(state.totalInteractions).toBe(6);
    });

    it('kills swim timelines for both robots', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');

      useOceanStore.setState({
        robots: [robotA, robotB],
      });

      triggerInteraction('robot-a', 'robot-b');

      const killTimeline = vi.mocked(TimelineMap.killTimeline);

      expect(killTimeline).toHaveBeenCalledWith('swim-robot-a');
      expect(killTimeline).toHaveBeenCalledWith('swim-robot-b');
    });

    it('plays interaction flurry for both robots', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');

      useOceanStore.setState({
        robots: [robotA, robotB],
      });

      triggerInteraction('robot-a', 'robot-b');

      // Execute delayed callbacks (flurry scheduling happens in delayedCall)
      delayedCallbacks.forEach(cb => cb());

      const MockedAudioEngine = vi.mocked(AudioEngineModule.AudioEngine);

      // Should call scheduleNote for flurry from both robots
      expect(MockedAudioEngine.scheduleNote).toHaveBeenCalled();
      // We expect multiple calls (FLURRY_NOTE_COUNT = 4 per robot with stagger)
      const callCount = MockedAudioEngine.scheduleNote.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(4);
    });

    it('returns robots to idle state after interaction duration', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');

      useOceanStore.setState({
        robots: [robotA, robotB],
      });

      triggerInteraction('robot-a', 'robot-b');

      // Initially both should be in Interacting state
      let state = useOceanStore.getState();
      expect(state.getRobotById('robot-a')?.state).toBe(RobotState.Interacting);
      expect(state.getRobotById('robot-b')?.state).toBe(RobotState.Interacting);

      // Execute delayed callbacks (simulates time passing)
      delayedCallbacks.forEach(cb => cb());

      // After callbacks, both should be back to Idle
      state = useOceanStore.getState();
      const updatedA = state.getRobotById('robot-a');
      const updatedB = state.getRobotById('robot-b');

      expect(updatedA?.state).toBe(RobotState.Idle);
      expect(updatedB?.state).toBe(RobotState.Idle);
    });

    it('handles interaction with non-existent robots gracefully', () => {
      const robotA = createTestRobot('robot-a');

      useOceanStore.setState({
        robots: [robotA],
      });

      // Should not throw error
      expect(() => {
        triggerInteraction('robot-a', 'robot-nonexistent');
      }).not.toThrow();
    });

    it('handles interaction with empty melody gracefully', () => {
      const robotA = createTestRobot('robot-a');
      robotA.melody = [];
      const robotB = createTestRobot('robot-b');
      robotB.melody = [];

      useOceanStore.setState({
        robots: [robotA, robotB],
      });

      // Should not throw error (playInteractionFlurry checks for empty melody)
      expect(() => {
        triggerInteraction('robot-a', 'robot-b');
      }).not.toThrow();

      // Execute delayed callbacks
      delayedCallbacks.forEach(cb => cb());

      const state = useOceanStore.getState();
      const updatedA = state.getRobotById('robot-a');
      const updatedB = state.getRobotById('robot-b');

      // State should still update despite no audio
      expect(updatedA?.state).toBe(RobotState.Idle);
      expect(updatedB?.state).toBe(RobotState.Idle);
    });

    it('supports multiple simultaneous interactions', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');
      const robotC = createTestRobot('robot-c');
      const robotD = createTestRobot('robot-d');

      useOceanStore.setState({
        robots: [robotA, robotB, robotC, robotD],
        totalInteractions: 0,
      });

      // Two interactions happen simultaneously (or in rapid succession)
      triggerInteraction('robot-a', 'robot-b');
      triggerInteraction('robot-c', 'robot-d');

      // Before callbacks execute: all robots should be Interacting
      let state = useOceanStore.getState();
      expect(state.getRobotById('robot-a')?.state).toBe(RobotState.Interacting);
      expect(state.getRobotById('robot-b')?.state).toBe(RobotState.Interacting);
      expect(state.getRobotById('robot-c')?.state).toBe(RobotState.Interacting);
      expect(state.getRobotById('robot-d')?.state).toBe(RobotState.Interacting);

      // Execute delayed callbacks
      delayedCallbacks.forEach(cb => cb());

      state = useOceanStore.getState();

      // All robots should be Idle after callbacks execute
      const countByState = {
        [RobotState.Idle]: state.robots.filter(r => r.state === RobotState.Idle).length,
        [RobotState.Interacting]: state.robots.filter(
          r => r.state === RobotState.Interacting
        ).length,
      };

      expect(countByState[RobotState.Idle]).toBe(4);
      expect(countByState[RobotState.Interacting]).toBe(0);

      // Interaction counter should increment twice
      expect(state.totalInteractions).toBe(2);
    });

    it('maintains interaction counter across multiple interactions', () => {
      const robotA = createTestRobot('robot-a');
      const robotB = createTestRobot('robot-b');
      const robotC = createTestRobot('robot-c');

      useOceanStore.setState({
        robots: [robotA, robotB, robotC],
        totalInteractions: 0,
      });

      triggerInteraction('robot-a', 'robot-b');
      triggerInteraction('robot-b', 'robot-c');
      triggerInteraction('robot-a', 'robot-c');

      const state = useOceanStore.getState();
      expect(state.totalInteractions).toBe(3);
    });
  });
});
