// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createRobotFromFactory, startFactoryProduction } from './factorySystem';
import { useOceanStore } from '../stores/oceanStore';
import { ActorType } from '../types/Actor';
import { RobotState } from '../types/Robot';
import type { Actor } from '../types/Actor';
import type { Robot } from '../types/Robot';

// ========================================
// MOCKS
// ========================================
vi.mock('tone', () => ({
  getTransport: vi.fn(() => ({
    bpm: { value: 120 },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scheduleRepeat: vi.fn((callback, interval) => {
      // Return a mock ID
      return `transport-schedule-${Date.now()}`;
    }),
  })),
}));

vi.mock('../engine/AudioEngine', () => ({
  AudioEngine: {
    registerRobotMelody: vi.fn(),
    unregisterRobotMelody: vi.fn(),
  },
}));

vi.mock('../engine/beatClock', () => ({
  scheduleRepeat: vi.fn((interval: string, callback: () => void) => {
    // For tests, invoke callback immediately
    callback();
    return `schedule-id-${Date.now()}`;
  }),
  cancelSchedule: vi.fn(),
}));

vi.mock('../engine/melodyGenerator', () => ({
  generateMelodyForRobot: vi.fn(() => []),
}));

vi.mock('./spawnSystem', () => ({
  generateAudioAttributes: vi.fn(() => ({
    synthType: 'AMSynth',
    adsr: { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.1 },
    pitchRange: { min: 100, max: 200 },
    filterFreq: 1000,
    reverb: 0.5,
  })),
}));

// Import mocked modules for test access
import { scheduleRepeat as beatClockScheduleRepeat } from '../engine/beatClock';
import { AudioEngine } from '../engine/AudioEngine';

// ========================================
// TEST SUITE
// ========================================
describe('FactorySystem', () => {
  beforeEach(() => {
    // Reset store state before each test
    useOceanStore.setState({
      robots: [],
      actors: [],
      selectedRobotId: null,
      totalInteractions: 0,
      settings: { bpm: 120, maxRobots: 12 },
    });
    vi.clearAllMocks();
  });

  describe('createRobotFromFactory', () => {
    it('creates a robot at factory position in background layer', () => {
      const factory: Actor = {
        id: 'factory-1',
        type: ActorType.FACTORY,
        position: { x: 500, y: 300 },
        isActive: true,
        cooldownRemaining: 0,
      };

      const robot = createRobotFromFactory(factory);

      expect(robot.state).toBe(RobotState.Idle);
      expect(robot.position).toEqual({ x: 500, y: 300 });
      expect(robot.destination).toBeNull();
      expect(robot.melody).toBeDefined();
      expect(robot.audioAttributes).toBeDefined();
    });

    it('generates unique robot IDs', () => {
      const factory: Actor = {
        id: 'factory-1',
        type: ActorType.FACTORY,
        position: { x: 500, y: 300 },
        isActive: true,
        cooldownRemaining: 0,
      };

      const robot1 = createRobotFromFactory(factory);
      const robot2 = createRobotFromFactory(factory);

      expect(robot1.id).not.toBe(robot2.id);
    });

    it('robot data is serializable (JSON-compatible)', () => {
      const factory: Actor = {
        id: 'factory-1',
        type: ActorType.FACTORY,
        position: { x: 500, y: 300 },
        isActive: true,
        cooldownRemaining: 0,
      };

      const robot = createRobotFromFactory(factory);

      // Should not throw
      expect(() => JSON.stringify(robot)).not.toThrow();
    });
  });

  describe('startFactoryProduction', () => {
    it('calls scheduleRepeat with 60 measure interval', () => {
      const scheduleRepeatMock = vi.mocked(beatClockScheduleRepeat);
      scheduleRepeatMock.mockClear();

      const factory: Actor = {
        id: 'factory-1',
        type: ActorType.FACTORY,
        position: { x: 500, y: 300 },
        isActive: true,
        cooldownRemaining: 0,
      };

      useOceanStore.setState({ actors: [factory] });

      startFactoryProduction('factory-1');

      expect(scheduleRepeatMock).toHaveBeenCalledWith(
        '60m',
        expect.any(Function)
      );
    });

    it('respects MAX_ROBOTS limit', () => {
      const AudioEngineMock = vi.mocked(AudioEngine);
      AudioEngineMock.registerRobotMelody.mockClear();

      const factory: Actor = {
        id: 'factory-2',
        type: ActorType.FACTORY,
        position: { x: 500, y: 300 },
        isActive: true,
        cooldownRemaining: 0,
      };

      useOceanStore.setState({
        actors: [factory],
        settings: { bpm: 120, maxRobots: 2 },
        robots: [
          { id: 'robot-1' } as unknown as Robot,
          { id: 'robot-2' } as unknown as Robot,
        ],
      });

      startFactoryProduction('factory-2');

      // Callback runs immediately in the mock; MAX_ROBOTS is reached so no robot spawns
      const state = useOceanStore.getState();
      expect(state.robots).toHaveLength(2); // Still at maxRobots
      expect(AudioEngineMock.registerRobotMelody).not.toHaveBeenCalled();
    });

    it('adds spawned robot to store', () => {
      const AudioEngineMock = vi.mocked(AudioEngine);
      AudioEngineMock.registerRobotMelody.mockClear();

      const factory: Actor = {
        id: 'factory-3',
        type: ActorType.FACTORY,
        position: { x: 500, y: 300 },
        isActive: true,
        cooldownRemaining: 0,
      };

      useOceanStore.setState({ actors: [factory] });

      startFactoryProduction('factory-3');

      // Callback runs immediately; robot should be spawned
      const state = useOceanStore.getState();
      expect(state.robots).toHaveLength(1);
      expect(AudioEngineMock.registerRobotMelody).toHaveBeenCalled();
    });

    it('does not schedule twice for same factory', () => {
      const scheduleRepeatMock = vi.mocked(beatClockScheduleRepeat);
      scheduleRepeatMock.mockClear();

      const factory: Actor = {
        id: 'factory-4',
        type: ActorType.FACTORY,
        position: { x: 500, y: 300 },
        isActive: true,
        cooldownRemaining: 0,
      };

      useOceanStore.setState({ actors: [factory] });

      startFactoryProduction('factory-4');
      const callCountAfterFirst = scheduleRepeatMock.mock.calls.length;

      startFactoryProduction('factory-4');
      const callCountAfterSecond = scheduleRepeatMock.mock.calls.length;

      // Should not call scheduleRepeat again
      expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });
  });
});
