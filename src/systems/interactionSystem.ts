// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import { useOceanStore } from '../stores/oceanStore';
import { RobotState } from '../types/Robot';
import { DEV_TUNING } from '../constants';
import { handleRobotIdle } from './idleSystem';
import { killTimeline } from '../animation/timelineMap';
import { getRef } from '../utils/refs';

// ========================================
// CONSTANTS
// ========================================
const INTERACTION_COOLDOWN_MS = 5000; // 5 seconds between interactions
const INTERACTION_DURATION = 1.0; // 1 second interaction before returning to idle

// ========================================
// INTERACTION LOGIC
// ========================================

/**
 * Trigger interaction between two robots.
 * Sets both robots to interacting state and applies cooldown.
 * After brief interaction, returns robots to idle state.
 * 
 * NOTE: This is a stub implementation. Full interaction logic
 * (audio events, animations, etc.) will be implemented in M4.2+
 */
export function triggerInteraction(robotAId: string, robotBId: string): void {
  const store = useOceanStore.getState();
  const cooldownExpiry = Date.now() + INTERACTION_COOLDOWN_MS;

  // Kill any active swim timelines (stop current movement)
  killTimeline(`swim-${robotAId}`);
  killTimeline(`swim-${robotBId}`);

  // Update both robots to interacting state
  store.updateRobot(robotAId, {
    state: RobotState.Interacting,
    interactionCooldown: cooldownExpiry,
  });

  store.updateRobot(robotBId, {
    state: RobotState.Interacting,
    interactionCooldown: cooldownExpiry,
  });

  if (DEV_TUNING) {
    console.log(
      `[Interaction] Robots ${robotAId} and ${robotBId} interacting (cooldown: ${INTERACTION_COOLDOWN_MS}ms)`
    );
  }

  // Return robots to idle state after interaction completes
  gsap.delayedCall(INTERACTION_DURATION, () => {
    const robotA = store.getRobotById(robotAId);
    if (robotA) {
      // Sync position to where robot visually is (get from GSAP values)
      const refA = getRef(`robot-${robotAId}`);
      if (refA) {
        const x = gsap.getProperty(refA, 'x') as number;
        const y = gsap.getProperty(refA, 'y') as number;
        store.updateRobot(robotAId, {
          state: RobotState.Idle,
          position: { x, y },
        });
      }
      handleRobotIdle(robotAId);
    }
  });

  gsap.delayedCall(INTERACTION_DURATION, () => {
    const robotB = store.getRobotById(robotBId);
    if (robotB) {
      // Sync position to where robot visually is (get from GSAP values)
      const refB = getRef(`robot-${robotBId}`);
      if (refB) {
        const x = gsap.getProperty(refB, 'x') as number;
        const y = gsap.getProperty(refB, 'y') as number;
        store.updateRobot(robotBId, {
          state: RobotState.Idle,
          position: { x, y },
        });
      }
      handleRobotIdle(robotBId);
    }
  });

  // TODO (M4.2+): Implement full interaction behavior:
  // - Play interaction audio event
  // - Trigger interaction animation
  // - Handle melody exchange/modification
}
