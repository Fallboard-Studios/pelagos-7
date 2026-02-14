// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import { getAvailableNotes } from '../engine/harmonySystem';
import { AudioEngine } from '../engine/AudioEngine';
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
const INTERACTION_DURATION = 0.5; // 0.5 second interaction before returning to idle
const FLURRY_NOTE_COUNT = 4; // Number of notes from each robot's melody

// ========================================
// INTERACTION LOGIC
// ========================================

/**
 * Play rapid notes from both robots' melodies to create an "interaction flurry" sound.
 * Picks random notes from each robot and schedules them with 32nd note spacing.
 */
function playInteractionFlurry(robotAId: string, robotBId: string): void {
  const store = useOceanStore.getState();
  const robotA = store.getRobotById(robotAId);
  const robotB = store.getRobotById(robotBId);
  const notes = getAvailableNotes();

  if (!robotA || !robotB || robotA.melody.length === 0 || robotB.melody.length === 0) {
    return;
  }

  const now = gsap.ticker.time;
  const noteSpacing = 0.125; // 32nd note in seconds at 120 BPM

  // Play flurry from Robot A (starting at now)
  for (let i = 0; i < FLURRY_NOTE_COUNT && i < robotA.melody.length; i++) {
    const randomEventA = robotA.melody[Math.floor(Math.random() * robotA.melody.length)];
    const noteA = notes[randomEventA.noteIndex];

    if (noteA) {
      AudioEngine.scheduleNote({
        robotId: robotAId,
        note: noteA,
        duration: '16n',
        time: now + i * noteSpacing,
        velocity: 0.7,
      });
    }
  }

  // Play flurry from Robot B (slightly staggered overlap)
  for (let i = 0; i < FLURRY_NOTE_COUNT && i < robotB.melody.length; i++) {
    const randomEventB = robotB.melody[Math.floor(Math.random() * robotB.melody.length)];
    const noteB = notes[randomEventB.noteIndex];

    if (noteB) {
      AudioEngine.scheduleNote({
        robotId: robotBId,
        note: noteB,
        duration: '16n',
        time: now + noteSpacing * 0.5 + i * noteSpacing,
        velocity: 0.7,
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
 * Trigger visual effects for robot interaction (scale pulse + rotation).
 */
function playInteractionAnimation(robotAId: string, robotBId: string): void {
  const refA = getRef(`robot-${robotAId}`);
  const refB = getRef(`robot-${robotBId}`);

  // Scale pulse: grow to 1.25x and back
  if (refA) {
    gsap.to(refA, {
      scale: 1.25,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: 'back.out',
    });
  }

  if (refB) {
    gsap.to(refB, {
      scale: 1.25,
      duration: 0.15,
      yoyo: true,
      repeat: 1,
      ease: 'back.out',
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
  const cooldownExpiry = Date.now() + INTERACTION_COOLDOWN_MS;

  // Kill any active swim timelines (stop current movement)
  killTimeline(`swim-${robotAId}`);
  killTimeline(`swim-${robotBId}`);

  // Play interaction effects (audio + visual)
  playInteractionFlurry(robotAId, robotBId);
  playInteractionAnimation(robotAId, robotBId);

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
      `[Interaction] Robots ${robotAId} and ${robotBId} interacting (cooldown: ${INTERACTION_COOLDOWN_MS}ms, duration: ${INTERACTION_DURATION}s)`
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
}
