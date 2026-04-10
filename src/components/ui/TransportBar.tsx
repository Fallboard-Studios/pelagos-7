// ========================================
// IMPORTS
// ========================================
import { useState, useEffect } from 'react';
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Dialog from '@radix-ui/react-dialog';
import gsap from 'gsap';

import { useOceanStore } from '../../stores/oceanStore';
import { useUIStore } from '../../stores/uiStore';
import { useAudioStore } from '../../stores/audioStore';
import { AudioEngine } from '../../engine/AudioEngine';
import { resetHarmony } from '../../engine/harmonySystem';
import { setTimeline, killTimeline } from '../../animation/timelineMap';
import { stopAllFactoryProduction } from '../../systems/factorySystem';
import { stopSpawnScheduler, reRegisterAllRobotsAudio, removeNonPersistentRobots } from '../../systems/spawnSystem';
import { stopCollisionDetection } from '../../systems/collisionSystem';

import './TransportBar.css';

// ========================================
// COMPONENT
// ========================================

export function TransportBar() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);
  const currentMeasure = useOceanStore((s) => s.currentMeasure);
  const bpm = useAudioStore((s) => s.bpm);

  const [showConfirm, setShowConfirm] = useState(false);

  // Kill power timelines on unmount to prevent leaks
  useEffect(() => {
    return () => {
      killTimeline('tablet-power-on');
      killTimeline('tablet-power-off');
    };
  }, []);

  const measureLabel = isPoweredOn ? `M: ${currentMeasure}` : 'M: ---';

  async function handlePowerOn() {
    await AudioEngine.start();
    resetHarmony();

    // Re-register persistent robots' audio before the OceanScene mounts so
    // their voices are ready when the scene's spawn effects run.
    reRegisterAllRobotsAudio();

    // setPowerOn triggers OceanScene to mount; its useEffect handles
    // placeFactories, spawnRobot×2, startFactoryProduction, startSpawnScheduler,
    // and startCollisionDetection.
    useUIStore.getState().setPowerOn();

    // GSAP wake-up timeline: brighten display area
    killTimeline('tablet-power-on');
    const tl = gsap.timeline();
    tl.fromTo(
      '.transport-bar__displays',
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    ).fromTo(
      '.transport-bar__btn:not(.transport-bar__btn--power)',
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power1.out', stagger: 0.05, clearProps: 'opacity' },
      '-=0.2'
    );
    setTimeline('tablet-power-on', tl);
  }

  function handlePowerOffConfirm() {
    setShowConfirm(false);
    // Stop all scheduled systems first so nothing fires during teardown
    stopSpawnScheduler();
    stopAllFactoryProduction();
    stopCollisionDetection();
    AudioEngine.killAll();
    // Remove transient robots; persistent robots stay in the store
    removeNonPersistentRobots();
    // Clear factory actors so OceanScene places them fresh on next power-on
    useOceanStore.getState().setActors([]);
    useUIStore.getState().setPowerOff();

    // GSAP power-down timeline: dim display area
    killTimeline('tablet-power-off');
    const tl = gsap.timeline();
    tl.to('.transport-bar__displays', { opacity: 0.25, duration: 0.5, ease: 'power2.in' })
      .to(
        '.transport-bar__btn:not(.transport-bar__btn--power)',
        { opacity: 0.35, duration: 0.4, ease: 'power1.in', stagger: 0.04, clearProps: 'opacity' },
        '-=0.3'
      );
    setTimeline('tablet-power-off', tl);
  }

  function handlePowerClick() {
    if (isPoweredOn) {
      setShowConfirm(true);
    } else {
      void handlePowerOn();
    }
  }

  return (
    <>
      <Toolbar.Root className="transport-bar" aria-label="Transport controls">
        <div className="transport-bar__buttons">
          <Toolbar.Button
            className="transport-bar__btn transport-bar__btn--power"
            aria-label="Power"
            onClick={handlePowerClick}
          >
            ⏻
          </Toolbar.Button>

          <Toolbar.Button
            className="transport-bar__btn transport-bar__btn--restart"
            aria-label="Restart"
            disabled={!isPoweredOn}
          >
            ⏮
          </Toolbar.Button>

          <Toolbar.Button
            className="transport-bar__btn transport-bar__btn--pause"
            aria-label="Pause"
            disabled={!isPoweredOn}
          >
            ⏸
          </Toolbar.Button>

          <Toolbar.Button
            className="transport-bar__btn transport-bar__btn--mute"
            aria-label="Mute"
            disabled={!isPoweredOn}
          >
            🔇
          </Toolbar.Button>
        </div>

        <Toolbar.Separator className="transport-bar__separator" />

        <div className="transport-bar__displays">
          <span className="transport-bar__measure" aria-label="Current measure">
            {measureLabel}
          </span>
          <span
            className={`transport-bar__bpm${isPoweredOn ? '' : ' transport-bar__bpm--dim'}`}
            aria-label="Beats per minute"
          >
            {bpm} BPM
          </span>
        </div>
      </Toolbar.Root>

      <Dialog.Root open={showConfirm} onOpenChange={setShowConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="power-confirm__overlay" />
          <Dialog.Content className="power-confirm__content">
            <Dialog.Title className="power-confirm__title">Power off?</Dialog.Title>
            <Dialog.Description className="power-confirm__description">
              All audio will stop and the measure will reset.
            </Dialog.Description>
            <div className="power-confirm__actions">
              <button
                className="power-confirm__btn power-confirm__btn--confirm"
                onClick={handlePowerOffConfirm}
              >
                Confirm
              </button>
              <Dialog.Close asChild>
                <button className="power-confirm__btn power-confirm__btn--cancel">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
