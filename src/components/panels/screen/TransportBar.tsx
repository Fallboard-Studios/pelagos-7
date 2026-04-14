// ========================================
// IMPORTS
// ========================================
import { useState } from 'react';
import * as Toolbar from '@radix-ui/react-toolbar';

import { useOceanStore } from '../../../stores/oceanStore';
import { useUIStore } from '../../../stores/uiStore';
import { useAudioStore } from '../../../stores/audioStore';
import { AudioEngine } from '../../../engine/AudioEngine';
import { swallow } from '../../../utils/helpers';

import './TransportBar.css';

// ========================================
// COMPONENT
// ========================================

function TransportBar() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);
  const currentMeasure = useOceanStore((s) => s.currentMeasure);
  const planetHour = useOceanStore((s) => s.planetHour);
  const planetMinute = useOceanStore((s) => s.planetMinute);
  const bpm = useAudioStore((s) => s.bpm);

  const [isPaused, setIsPaused] = useState(false);
  const isMuted = useAudioStore((s) => s.isMuted);

  const handleRestartClick = async () => {
    try {
      AudioEngine.killAll();
      useOceanStore.getState().setCurrentMeasure(0);
      await AudioEngine.start();
      setIsPaused(false);
    } catch (err) {
      swallow(err, '[TransportBar] Restart failed');
    }
  };

  const handlePauseClick = async () => {
    if (!isPoweredOn) return;
    try {
      if (!isPaused) {
        await AudioEngine.pause();
        setIsPaused(true);
      } else {
        await AudioEngine.resume();
        setIsPaused(false);
      }
    } catch (err) {
      swallow(err, '[TransportBar] Pause toggle failed');
    }
  };

  const handleMuteClick = async () => {
    if (!isPoweredOn) return;
    try {
      const store = useAudioStore.getState();
      if (!isMuted) {
        const current = AudioEngine.getMasterVolume();
        store.setPreMuteVolume(current);
        AudioEngine.setMasterVolume(0);
        store.setMuted(true);
      } else {
        const pre = store.preMuteVolume ?? 1.0;
        AudioEngine.setMasterVolume(pre);
        store.setMuted(false);
      }
    } catch (err) {
      swallow(err, '[TransportBar] Mute toggle failed');
    }
  };

  const padMeasure = (m: number) => String(m).padStart(3, '0');
  const hh = String(Math.max(0, Math.min(23, Math.floor(planetHour ?? 0)))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Math.floor(planetMinute ?? 0)))).padStart(2, '0');
  const measureLabel = isPoweredOn ? `M: ${padMeasure(currentMeasure)} H: ${hh}:${mm}` : `M: --- H: ${hh}:${mm}`;

  return (
    <Toolbar.Root className="transport-bar" aria-label="Transport controls">
      <div className="transport-bar__buttons">
        <Toolbar.Button
          className="transport-bar__btn transport-bar__btn--restart"
          aria-label="Restart"
          disabled={!isPoweredOn}
          onClick={handleRestartClick}
        >
          ⏮
        </Toolbar.Button>

        <Toolbar.ToggleGroup
          type="single"
          value={isPaused ? 'pause' : undefined}
          aria-label="Playback controls"
          className="transport-bar__toggle-group"
        >
          <Toolbar.ToggleItem
            value="pause"
            className={`transport-bar__btn transport-bar__btn--pause${isPaused ? ' transport-bar__btn--active' : ''}`}
            aria-label="Pause"
            disabled={!isPoweredOn}
            onClick={handlePauseClick}
          >
            {isPaused ? '▶' : '⏸'}
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>

        <Toolbar.ToggleGroup
          type="single"
          value={isMuted ? 'mute' : undefined}
          aria-label="Mute controls"
          className="transport-bar__toggle-group"
        >
          <Toolbar.ToggleItem
            value="mute"
            className={`transport-bar__btn transport-bar__btn--mute${isMuted ? ' transport-bar__btn--muted' : ''}`}
            aria-label="Mute"
            disabled={!isPoweredOn}
            onClick={handleMuteClick}
          >
            {isMuted ? '🔇' : '🔊'}
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>
      </div>

      <Toolbar.Separator className="transport-bar__separator" />

      <div className={`transport-bar__displays${isPoweredOn ? '' : ' transport-bar__displays--dim'}`}>
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
  );
}

export default TransportBar;