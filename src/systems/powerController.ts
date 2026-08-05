import { AudioEngine } from '../engine/AudioEngine';
import { useAudioStore } from '../stores/audioStore';
import { resetHarmony } from '../engine/harmonySystem';
import { reRegisterAllRobotsAudio, removeNonPersistentRobots, stopSpawnScheduler } from './spawnSystem';
import { stopCollisionDetection } from './collisionSystem';
import { useUIStore } from '../stores/uiStore';
import { useLocaleStore } from '../stores/localeStore';
import { getActiveLocaleId } from '../utils/localeHelpers';
import { playTabletPowerOff, playTabletPowerOn } from './powerAnimations';
import { swallow } from '../utils/helpers';
import { DEV_TUNING } from '../constants';

/**
 * powerController centralizes power on/off side effects so components stay thin.
 */
export const powerController = {
  async start() {
    await AudioEngine.start();
    AudioEngine.setBPM(useAudioStore.getState().bpm);
    resetHarmony();
    reRegisterAllRobotsAudio(getActiveLocaleId());
  },

  async shutdown() {
    // Immediate stop (no UI animation). Use this when caller already handled
    // visuals or when a hard shutdown is required.
    stopSpawnScheduler();
    stopCollisionDetection();
    AudioEngine.killAll();
    removeNonPersistentRobots(getActiveLocaleId());
    try {
      useLocaleStore.getState().setLocaleData(getActiveLocaleId(), { actors: [] });
    } catch (e) {
      if (DEV_TUNING) swallow(e, 'powerController.setActors');
    }
    useUIStore.getState().setPowerOff();
  },

  /**
   * Orchestrated shutdown that stops systems and runs the tablet power-off UI animation.
   */
  async shutdownWithAnimation() {

    stopSpawnScheduler();
    stopCollisionDetection();
    AudioEngine.killAll();
    removeNonPersistentRobots(getActiveLocaleId());
    useUIStore.getState().setPowerOff();

    // Play the dimming sequence. If the animation throws in edge-cases
    // we only log it in dev tuning mode via `swallow` so shutdown still completes.
    try {
      playTabletPowerOff();
    } catch (e) {
      if (DEV_TUNING) swallow(e, 'powerController.playTabletPowerOff');
    }
    return;
  },

  // High-level power-on sequence that mounts UI in caller when appropriate.
  async powerOnSequence() {
    await this.start();
    useUIStore.getState().setPowerOn();
    try {
      playTabletPowerOn();
    } catch (e) {
      if (DEV_TUNING) swallow(e, 'powerController.playTabletPowerOn');
    }
  }
};

export default powerController;
