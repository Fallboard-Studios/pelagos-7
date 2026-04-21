// ========================================
// IMPORTS
// ========================================
import gsap from 'gsap';

import { getAvailableNotes } from '../engine/harmonySystem';
import { AudioEngine } from '../engine/AudioEngine';
import { getCurrentMeasure } from '../engine/beatClock';
import useLocaleStore from '../stores/localeStore';
import { usePlanetStore } from '../stores/planetStore';
import { RobotState } from '../types/Robot';
import { DEV_TUNING } from '../constants';
import { handleRobotIdle } from './idleSystem';
import { killTimeline } from '../animation/timelineMap';
import { getRef } from '../utils/refs';
import { getLocaleNoiseMap } from '../utils/noiseMaps';
import { getSeededVal } from '../utils/getSeededVal';

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
 * Picks random notes from each robot and schedules them with staggered Tone.js timing.
 * All notes are scheduled via AudioEngine using future AudioContext timestamps —
 * no GSAP involvement in audio timing.
 */
function playInteractionFlurry(localeId: string, robotAId: string, robotBId: string): void {
  const store = useLocaleStore.getState();
  const robotA = store.getRobotById(localeId, robotAId);
  const robotB = store.getRobotById(localeId, robotBId);
  const notes = getAvailableNotes();

  if (!robotA || !robotB || robotA.melody.length === 0 || robotB.melody.length === 0) {
    return;
  }

  // Resolve locale noise map for deterministic event selection
  const locale = store.getLocaleById(localeId);
  const planet = locale ? usePlanetStore.getState().planets.find((p) => p.id === locale.planetId) : undefined;
  const noiseMap = locale && planet
    ? getLocaleNoiseMap(localeId, locale.planetId, planet.name, locale.coordinates.x, locale.coordinates.y)
    : null;

  // Stable robot indices for offset calculation
  const robotAIndex = locale?.robots.findIndex((r) => r.id === robotAId) ?? 0;
  const robotBIndex = locale?.robots.findIndex((r) => r.id === robotBId) ?? 1;

  const noteSpacing = 0.125; // 16th note spacing in seconds
  const baseTime = AudioEngine.now();

  // Schedule flurry from Robot A (starting at baseTime)
  for (let i = 0; i < FLURRY_NOTE_COUNT && i < robotA.melody.length; i++) {
    const eventIndex = noiseMap
      ? Math.floor(getSeededVal(noiseMap, 'interaction.eventA', robotAIndex + i, 0, robotA.melody.length))
      : Math.floor(Math.random() * robotA.melody.length);
    const randomEventA = robotA.melody[eventIndex];
    const noteName = notes[randomEventA.noteIndex];

    if (noteName) {
      AudioEngine.scheduleNote({
        robotId: robotAId,
        note: `${noteName}${randomEventA.octave}`,
        duration: '16n',
        time: baseTime + i * noteSpacing,
        velocity: 0.7,
      });
    }
  }

  // Schedule flurry from Robot B (slightly staggered overlap)
  for (let i = 0; i < FLURRY_NOTE_COUNT && i < robotB.melody.length; i++) {
    const eventIndex = noiseMap
      ? Math.floor(getSeededVal(noiseMap, 'interaction.eventB', robotBIndex + i, 0, robotB.melody.length))
      : Math.floor(Math.random() * robotB.melody.length);
    const randomEventB = robotB.melody[eventIndex];
    const noteName = notes[randomEventB.noteIndex];

    if (noteName) {
      AudioEngine.scheduleNote({
        robotId: robotBId,
        note: `${noteName}${randomEventB.octave}`,
        duration: '16n',
        time: baseTime + noteSpacing * 0.5 + i * noteSpacing,
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
export function triggerInteraction(localeId: string, robotAId: string, robotBId: string): void {
  const store = useLocaleStore.getState();
  const currentMeasure = getCurrentMeasure();

  // Kill any active swim timelines (stop current movement)
  killTimeline(`swim-${robotAId}`);
  killTimeline(`swim-${robotBId}`);

  // Play interaction effects (audio + visual)
  playInteractionFlurry(localeId, robotAId, robotBId);
  playInteractionAnimation(robotAId, robotBId);

  // Update both robots to interacting state with measure-based cooldown
  store.updateRobot(localeId, robotAId, {
    state: RobotState.Interacting,
    lastInteractionMeasure: currentMeasure,
  });
  store.updateRobot(localeId, robotBId, {
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
    const robotA = store.getRobotById(localeId, robotAId);
    if (robotA) {
      // Sync position to where robot visually is (get from GSAP values)
      const refA = getRef(`robot-${robotAId}`);
      if (refA) {
        const x = gsap.getProperty(refA, 'x') as number;
        const y = gsap.getProperty(refA, 'y') as number;
        store.updateRobot(localeId, robotAId, {
          state: RobotState.Idle,
          position: { x, y },
        });
      }
      handleRobotIdle(localeId, robotAId);
    }
  });

  const recoveryDelayB = gsap.delayedCall(INTERACTION_DURATION, () => {
    pendingInteractionRecoveries.delete(robotBId);
    const robotB = store.getRobotById(localeId, robotBId);
    if (robotB) {
      // Sync position to where robot visually is (get from GSAP values)
      const refB = getRef(`robot-${robotBId}`);
      if (refB) {
        const x = gsap.getProperty(refB, 'x') as number;
        const y = gsap.getProperty(refB, 'y') as number;
        store.updateRobot(localeId, robotBId, {
          state: RobotState.Idle,
          position: { x, y },
        });
      }
      handleRobotIdle(localeId, robotBId);
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

// (no default wrapper) callers must provide explicit localeId
