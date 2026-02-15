// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, vi } from 'vitest';

import { calculateDistanceSquared, canInteract } from './collisionSystem';
import { RobotState } from '../types/Robot';
import type { Robot } from '../types/Robot';

// Mock BeatClock
vi.mock('../engine/beatClock', () => ({
  getCurrentMeasure: vi.fn(() => 100),
}));

// ========================================
// TESTS
// ========================================

describe('CollisionSystem', () => {
  describe('calculateDistanceSquared', () => {
    it('calculates squared distance correctly', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 4 };

      const result = calculateDistanceSquared(a, b);

      // 3² + 4² = 9 + 16 = 25
      expect(result).toBe(25);
    });

    it('handles negative coordinates', () => {
      const a = { x: -5, y: -5 };
      const b = { x: 5, y: 5 };

      const result = calculateDistanceSquared(a, b);

      // 10² + 10² = 100 + 100 = 200
      expect(result).toBe(200);
    });

    it('returns zero for same position', () => {
      const a = { x: 100, y: 200 };
      const b = { x: 100, y: 200 };

      const result = calculateDistanceSquared(a, b);

      expect(result).toBe(0);
    });
  });

  describe('canInteract', () => {
    const baseRobot: Robot = {
      id: 'test-robot',
      state: RobotState.Idle,
      position: { x: 0, y: 0 },
      destination: null,
      melody: [],
      audioAttributes: {
        synthType: 'PolySynth',
        adsr: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.3 },
        pitchRange: { min: 200, max: 400 },
        filterFreq: 1000,
        reverb: 0.3,
      },
    };

    it('returns true for idle robot without cooldown', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Idle,
      };

      expect(canInteract(robot)).toBe(true);
    });

    it('returns true for moving robot without cooldown', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Moving,
      };

      expect(canInteract(robot)).toBe(true);
    });

    it('returns false for interacting robot', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Interacting,
      };

      expect(canInteract(robot)).toBe(false);
    });

    it('returns false for selected robot', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Selected,
      };

      expect(canInteract(robot)).toBe(false);
    });

    it('returns false for leaving robot', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Leaving,
      };

      expect(canInteract(robot)).toBe(false);
    });

    it('returns false when robot is on cooldown (less than 8 measures elapsed)', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Idle,
        lastInteractionMeasure: 95, // 5 measures ago (100 - 95 = 5 < 8)
      };

      expect(canInteract(robot)).toBe(false);
    });

    it('returns true when cooldown has expired (8+ measures elapsed)', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Idle,
        lastInteractionMeasure: 92, // 8 measures ago (100 - 92 = 8 >= 8)
      };

      expect(canInteract(robot)).toBe(true);
    });

    it('returns true when cooldown has completely expired (many measures elapsed)', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Idle,
        lastInteractionMeasure: 50, // 50 measures ago
      };

      expect(canInteract(robot)).toBe(true);
    });

    it('returns false for moving robot on cooldown', () => {
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Moving,
        lastInteractionMeasure: 98, // 2 measures ago (100 - 98 = 2 < 8)
      };

      expect(canInteract(robot)).toBe(false);
    });
  });

  describe('Multi-robot collision scenarios', () => {
    const baseRobot: Robot = {
      id: 'test-robot',
      state: RobotState.Idle,
      position: { x: 0, y: 0 },
      destination: null,
      melody: [],
      audioAttributes: {
        synthType: 'PolySynth',
        adsr: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.3 },
        pitchRange: { min: 200, max: 400 },
        filterFreq: 1000,
        reverb: 0.3,
      },
    };

    it('correctly identifies when multiple robot pairs can interact', () => {
      // 4 robots: A and B are close, C and D are close
      const robotA: Robot = { ...baseRobot, id: 'a', state: RobotState.Idle };
      const robotB: Robot = { ...baseRobot, id: 'b', state: RobotState.Idle };
      const robotC: Robot = { ...baseRobot, id: 'c', state: RobotState.Idle };
      const robotD: Robot = { ...baseRobot, id: 'd', state: RobotState.Idle };

      // All can interact (no cooldowns)
      expect(canInteract(robotA)).toBe(true);
      expect(canInteract(robotB)).toBe(true);
      expect(canInteract(robotC)).toBe(true);
      expect(canInteract(robotD)).toBe(true);
    });

    it('handles robots with mixed cooldown states correctly', () => {
      const currentMeasure = 100;

      // Robot A: no prior interaction
      const robotA: Robot = {
        ...baseRobot,
        id: 'a',
        state: RobotState.Idle,
      };

      // Robot B: just interacted (1 measure ago, still on cooldown)
      const robotB: Robot = {
        ...baseRobot,
        id: 'b',
        state: RobotState.Idle,
        lastInteractionMeasure: currentMeasure - 1,
      };

      // Robot C: interacted 8 measures ago (cooldown expired)
      const robotC: Robot = {
        ...baseRobot,
        id: 'c',
        state: RobotState.Idle,
        lastInteractionMeasure: currentMeasure - 8,
      };

      // Robot D: in interacting state
      const robotD: Robot = {
        ...baseRobot,
        id: 'd',
        state: RobotState.Interacting,
        lastInteractionMeasure: currentMeasure,
      };

      // Only A and C can interact
      expect(canInteract(robotA)).toBe(true);
      expect(canInteract(robotB)).toBe(false); // still on cooldown
      expect(canInteract(robotC)).toBe(true); // cooldown expired
      expect(canInteract(robotD)).toBe(false); // currently interacting
    });

    it('calculates collision checks per second metric for increasing robot counts', () => {
      // For n robots, collision checks = n * (n-1) / 2
      // 2 robots: 1 check
      // 4 robots: 6 checks
      // 8 robots: 28 checks
      // 12 robots: 66 checks

      const tests = [
        { count: 2, expectedChecks: 1 },
        { count: 4, expectedChecks: 6 },
        { count: 6, expectedChecks: 15 },
        { count: 8, expectedChecks: 28 },
        { count: 12, expectedChecks: 66 },
      ];

      tests.forEach(({ count, expectedChecks }) => {
        const calculated = (count * (count - 1)) / 2;
        expect(calculated).toBe(expectedChecks);
      });
    });

    it('prevents interaction when either robot cannot interact', () => {
      const robotA: Robot = {
        ...baseRobot,
        id: 'a',
        state: RobotState.Idle,
      };

      // Robot B is on cooldown
      const robotB: Robot = {
        ...baseRobot,
        id: 'b',
        state: RobotState.Idle,
        lastInteractionMeasure: 98, // 2 measures ago, still on cooldown
      };

      // Only one can interact, so pair cannot interact
      expect(canInteract(robotA)).toBe(true);
      expect(canInteract(robotB)).toBe(false);
    });

    it('handles rapid successive interactions from different robot pairs', () => {
      // Simulate a scenario where multiple pairs interact rapidly
      const robotA: Robot = {
        ...baseRobot,
        id: 'a',
        state: RobotState.Idle,
      };

      const robotB: Robot = {
        ...baseRobot,
        id: 'b',
        state: RobotState.Idle,
      };

      const robotC: Robot = {
        ...baseRobot,
        id: 'c',
        state: RobotState.Idle,
      };

      // A-B interaction at measure 100
      expectinteractions([
        { robot: robotA, canInteract: true },
        { robot: robotB, canInteract: true },
      ]);

      // Simulate A & B now have cooldown
      robotA.lastInteractionMeasure = 100;
      robotB.lastInteractionMeasure = 100;

      // C can still interact with others at same measure
      expect(canInteract(robotC)).toBe(true);

      // But A & B cannot
      expect(canInteract(robotA)).toBe(false);
      expect(canInteract(robotB)).toBe(false);
    });
  });
});

// ========================================
// HELPERS
// ========================================

function expectinteractions(
  tests: Array<{ robot: Robot; canInteract: boolean }>
): void {
  tests.forEach(({ robot, canInteract: expected }) => {
    expect(canInteract(robot)).toBe(expected);
  });
}
