// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import { getAvailableNotes } from '../engine/harmonySystem';
import { AudioEngine } from '../engine/AudioEngine';
import { getCurrentMeasure } from '../engine/beatClock';
import { useOceanStore } from '../stores/oceanStore';
import { RobotState } from '../types/Robot';
import { DEV_TUNING } from '../constants';
import { handleRobotIdle } from './idleSystem';
import { killTimeline } from '../animation/timelineMap';
import { getRef } from '../utils/refs';

// ========================================
// CONSTANTS
// ========================================
const INTERACTION_COOLDOWN_MEASURES = 8; // 8 measures between interactions
const INTERACTION_DURATION = 0.5; // 0.5 second interaction before returning to idle
const FLURRY_NOTE_COUNT = 4; // Number of notes from each robot's melody

// ========================================
// MODULE STATE
// ========================================
/** Track pending interaction recovery delays by robot ID to allow cleanup */
const pendingInteractionRecoveries = new Map<string, gsap.core.Tween>();

/**
 * Play rapid notes from both robots' melodies to create an "interaction flurry" sound.
 * Picks random notes from each robot and schedules them with staggered timing.
 * Notes play immediately (no delay) via AudioEngine.
 */
function playInteractionFlurry(robotAId: string, robotBId: string): void {
  const store = useOceanStore.getState();
  const robotA = store.getRobotById(robotAId);
  const robotB = store.getRobotById(robotBId);
  const notes = getAvailableNotes();

  if (!robotA || !robotB || robotA.melody.length === 0 || robotB.melody.length === 0) {
    return;
  }

  const noteSpacing = 0.125; // 16th note spacing in seconds

  // Play flurry from Robot A (starting immediately)
  for (let i = 0; i < FLURRY_NOTE_COUNT && i < robotA.melody.length; i++) {
    const randomEventA = robotA.melody[Math.floor(Math.random() * robotA.melody.length)];
    const noteA = notes[randomEventA.noteIndex];

    if (noteA) {
      gsap.delayedCall(i * noteSpacing, () => {
        AudioEngine.scheduleNote({
          robotId: robotAId,
          note: noteA,
          duration: '16n',
          velocity: 0.7,
        });
      });
    }
  }

  // Play flurry from Robot B (slightly staggered overlap)
  for (let i = 0; i < FLURRY_NOTE_COUNT && i < robotB.melody.length; i++) {
    const randomEventB = robotB.melody[Math.floor(Math.random() * robotB.melody.length)];
    const noteB = notes[randomEventB.noteIndex];

    if (noteB) {
      gsap.delayedCall(noteSpacing * 0.5 + i * noteSpacing, () => {
        AudioEngine.scheduleNote({
          robotId: robotBId,
          note: noteB,
          duration: '16n',
          velocity: 0.7,
        });
      });
    }
  }

  if (DEV_TUNING) {
    console.log(
      `[Interaction] Flurry: ${FLURRY_NOTE_COUNT} notes from each robot (16th notes)`
    );
  }
}

/**
 * Trigger visual effects for robot interaction (rotation wobble).
 */
function playInteractionAnimation(robotAId: string, robotBId: string): void {
  const refA = getRef(`robot-${robotAId}`);
  const refB = getRef(`robot-${robotBId}`);

  // Rotation wobble: ±10 degrees
  if (refA) {
    gsap.to(refA, {
      rotation: '+=10',
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
    });
  }

  if (refB) {
    gsap.to(refB, {
      rotation: '+=10',
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'sine.inOut',
    });
  }
}

/**
 * Trigger interaction between two robots.
 * Sets both robots to interacting state, plays note flurry, and triggers visual effects.
 * After brief interaction, returns robots to idle state.
 */
export function triggerInteraction(robotAId: string, robotBId: string): void {
  const store = useOceanStore.getState();
  const currentMeasure = getCurrentMeasure();

  // Kill any active swim timelines (stop current movement)
  killTimeline(`swim-${robotAId}`);
  killTimeline(`swim-${robotBId}`);

  // Play interaction effects (audio + visual)
  playInteractionFlurry(robotAId, robotBId);
  playInteractionAnimation(robotAId, robotBId);

  // Increment total interaction counter for debug display
  store.incrementInteractions();

  // Update both robots to interacting state with measure-based cooldown
  store.updateRobot(robotAId, {
    state: RobotState.Interacting,
    lastInteractionMeasure: currentMeasure,
  });

  store.updateRobot(robotBId, {
    state: RobotState.Interacting,
    lastInteractionMeasure: currentMeasure,
  });

  if (DEV_TUNING) {
    console.log(
      `[Interaction] Robots ${robotAId} and ${robotBId} interacting (measure ${currentMeasure}, cooldown: ${INTERACTION_COOLDOWN_MEASURES} measures)`
    );
  }

  // Return robots to idle state after interaction completes
  // Store the recovery delays so they can be cancelled if robots are removed
  const recoveryDelayA = gsap.delayedCall(INTERACTION_DURATION, () => {
    pendingInteractionRecoveries.delete(robotAId);
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

  const recoveryDelayB = gsap.delayedCall(INTERACTION_DURATION, () => {
    pendingInteractionRecoveries.delete(robotBId);
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

  pendingInteractionRecoveries.set(robotAId, recoveryDelayA);
  pendingInteractionRecoveries.set(robotBId, recoveryDelayB);
}

/**
 * Cancel any pending interaction recovery delay for a robot
 * Called when a robot is removed to prevent orphaned timers
 */
export function cancelPendingInteractionRecovery(robotId: string): void {
  const delayTween = pendingInteractionRecoveries.get(robotId);
  if (delayTween) {
    delayTween.kill();
    pendingInteractionRecoveries.delete(robotId);
  }
}
