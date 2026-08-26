import { AudioEngine } from '../engine/AudioEngine';
import { useAudioStore } from '../stores/audioStore';
import { resetHarmony } from '../engine/harmonySystem';
import { reRegisterAllRobotsAudio } from './spawnSystem';
import { stopRobotLifecycle } from './robotSystems';
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
    // stopRobotLifecycle() must run before AudioEngine.killAll() — killAll
    // triggers resetBeatClock(), which silently clears every subscribeToMeasure
    // listener; without this call first, the module's own lifecycleUnsubscribe
    // reference would go stale, and a later startRobotLifecycle() would think
    // it's "already running" and skip resubscribing, permanently killing the
    // tick after this power cycle. No robots are removed anymore — every robot
    // survives a power cycle now (docking replaces the old persists model).
    stopRobotLifecycle();
    stopCollisionDetection();
    AudioEngine.killAll();
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

    stopRobotLifecycle(); // see shutdown()'s comment on why this must precede killAll()
    stopCollisionDetection();
    AudioEngine.killAll();
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
