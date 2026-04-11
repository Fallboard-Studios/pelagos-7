import gsap from 'gsap';
import { AudioEngine } from '../engine/AudioEngine';
import { resetHarmony } from '../engine/harmonySystem';
import { reRegisterAllRobotsAudio, removeNonPersistentRobots, stopSpawnScheduler } from './spawnSystem';
import { stopAllFactoryProduction } from './factorySystem';
import { stopCollisionDetection } from './collisionSystem';
import { useUIStore } from '../stores/uiStore';
import { useOceanStore } from '../stores/oceanStore';

/**
 * powerController centralizes power on/off side effects so components stay thin.
 */
export const powerController = {
  async start() {
    await AudioEngine.start();
    resetHarmony();
    reRegisterAllRobotsAudio();
  },

  async shutdown() {
    // Halt systems immediately
    stopSpawnScheduler();
    stopAllFactoryProduction();
    stopCollisionDetection();
    AudioEngine.killAll();

    // Return a promise that resolves after the sleeve-drain UI timeline finishes
    return new Promise<void>((resolve) => {
      const tl = gsap.timeline({ onComplete: () => {
        removeNonPersistentRobots();
        useOceanStore.getState().setActors([]);
        useUIStore.getState().setPowerOff();
        resolve();
      }});
      // Minimal drain visual; callers may also provide their own timelines
      tl.to('.sleeve-shape', { opacity: 0, duration: 0.14, ease: 'power2.in' });
    });
  },

  // High-level power-on sequence that mounts UI in caller when appropriate.
  async powerOnSequence() {
    // ensure audio ready and systems primed
    await this.start();
    // flip app state
    useUIStore.getState().setPowerOn();
  }
};

export default powerController;
