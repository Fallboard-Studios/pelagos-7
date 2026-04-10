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
        <Toolbar.Button
          className="transport-bar__btn transport-bar__btn--power"
          aria-label="Power"
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
  );
}
