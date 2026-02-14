// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { calculateDistanceSquared, canInteract } from './collisionSystem';
import { RobotState } from '../types/Robot';
import type { Robot } from '../types/Robot';

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

    it('returns false when robot is on cooldown', () => {
      const futureTime = Date.now() + 5000; // 5 seconds from now
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Idle,
        interactionCooldown: futureTime,
      };

      expect(canInteract(robot)).toBe(false);
    });

    it('returns true when cooldown has expired', () => {
      const pastTime = Date.now() - 1000; // 1 second ago
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Idle,
        interactionCooldown: pastTime,
      };

      expect(canInteract(robot)).toBe(true);
    });

    it('returns false for moving robot on cooldown', () => {
      const futureTime = Date.now() + 5000;
      const robot: Robot = {
        ...baseRobot,
        state: RobotState.Moving,
        interactionCooldown: futureTime,
      };

      expect(canInteract(robot)).toBe(false);
    });
  });
});
