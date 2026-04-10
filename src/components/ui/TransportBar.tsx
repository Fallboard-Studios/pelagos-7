// ========================================
// IMPORTS
// ========================================
import * as Toolbar from '@radix-ui/react-toolbar';

import { useOceanStore } from '../../stores/oceanStore';
import { useUIStore } from '../../stores/uiStore';
import { useAudioStore } from '../../stores/audioStore';

import './TransportBar.css';

// ========================================
// COMPONENT
// ========================================

export function TransportBar() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);
  const currentMeasure = useOceanStore((s) => s.currentMeasure);
  const bpm = useAudioStore((s) => s.bpm);

  const measureLabel = isPoweredOn ? `M: ${currentMeasure}` : 'M: ---';

  return (
    <Toolbar.Root className="transport-bar" aria-label="Transport controls">
      <div className="transport-bar__buttons">
        <Toolbar.Button asChild>
          <button
            className="transport-bar__btn transport-bar__btn--power"
            type="button"
            aria-label="Power"
          >
            ⏻
          </button>
        </Toolbar.Button>

        <Toolbar.Button asChild>
          <button
            className="transport-bar__btn transport-bar__btn--restart"
            type="button"
            aria-label="Restart"
            disabled={!isPoweredOn}
          >
            ⏮
          </button>
        </Toolbar.Button>

        <Toolbar.Button asChild>
          <button
            className="transport-bar__btn transport-bar__btn--pause"
            type="button"
            aria-label="Pause"
            disabled={!isPoweredOn}
          >
            ⏸
          </button>
        </Toolbar.Button>

        <Toolbar.Button asChild>
          <button
            className="transport-bar__btn transport-bar__btn--mute"
            type="button"
            aria-label="Mute"
            disabled={!isPoweredOn}
          >
            🔇
          </button>
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
  );
}
