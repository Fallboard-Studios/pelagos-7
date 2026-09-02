// ========================================
// IMPORTS
// ========================================
import * as Toolbar from '@radix-ui/react-toolbar';
import * as Slider from '@radix-ui/react-slider';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { useLocaleStore } from '../../../stores/localeStore';
import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '../../../stores/attenuationStyleStore';
import { useUIStore } from '../../../stores/uiStore';
import { useAudioStore } from '../../../stores/audioStore';

import './TransportBar.css';

// ========================================
// COMPONENT
// ========================================

function TransportBar() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);
  const activeLocaleLocalTime = useUIStore((s) => s.activeLocaleLocalTime);
  const attenuationStyleName = useAttenuationStyleStore((s) => selectCurrentAttenuationStyle(s)?.name ?? '—');
  const localeId = useAttenuationStyleStore((s) => selectCurrentAttenuationStyle(s)?.currentLocaleId ?? '');
  const coordinates = useLocaleStore((s) => s.locales[localeId]?.coordinates);
  const _localTime = activeLocaleLocalTime ?? 0;
  const localHour = Math.floor(_localTime);
  const localMinute = Math.floor((_localTime % 1) * 60);
  const bpm = useAudioStore((s) => s.bpm);

  const isMuted = useAudioStore((s) => s.isMuted);
  const volume = useAudioStore((s) => s.volume);

  const handleMuteClick = () => {
    if (!isPoweredOn) return;
    useAudioStore.getState().setMuted(!isMuted);
  };

  const handleVolumeChange = (values: number[]) => {
    if (!isPoweredOn) return;
    useAudioStore.getState().setVolume(values[0]);
  };

  const hh = String(Math.max(0, Math.min(23, Math.floor(localHour ?? 0)))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Math.floor(localMinute ?? 0)))).padStart(2, '0');
  const coordX = coordinates ? Math.round(coordinates.x) : null;
  const coordY = coordinates ? Math.round(coordinates.y) : null;

  return (
    <Toolbar.Root className="transport-bar" aria-label="Transport controls">
      <div className="transport-bar__buttons">
        <Toolbar.Button
          className={`transport-bar__btn transport-bar__btn--mute${isMuted ? ' transport-bar__btn--muted' : ''}`}
          aria-label="Mute"
          aria-pressed={isMuted}
          disabled={!isPoweredOn}
          onClick={handleMuteClick}
        >
          {isMuted ? '🔇' : '🔊'}
        </Toolbar.Button>

        <Slider.Root
          className="transport-bar__volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onValueChange={handleVolumeChange}
          disabled={!isPoweredOn}
        >
          <Slider.Track className="transport-bar__volume-track">
            <Slider.Range className="transport-bar__volume-range" />
          </Slider.Track>
          <Slider.Thumb className="transport-bar__volume-thumb" aria-label="Volume" />
        </Slider.Root>
      </div>

      <Toolbar.Separator className="transport-bar__separator" />

      <div className={`transport-bar__displays${isPoweredOn ? '' : ' transport-bar__displays--dim'}`}>
        {/* A bare <span>'s implicit ARIA role ("generic") doesn't support
            aria-label per the ARIA spec, so labels are real (visually
            hidden) text instead — that reaches assistive tech regardless
            of role support, since it's part of the element's own content. */}
        <span className="transport-bar__attenuation-style">
          <VisuallyHidden>Attenuation Style: </VisuallyHidden>
          {attenuationStyleName}
        </span>
        <span className="transport-bar__coords">
          <VisuallyHidden>Locale coordinates: </VisuallyHidden>
          {coordX !== null && coordY !== null ? `@ ${coordX}, ${coordY}` : '—'}
        </span>
        <span className="transport-bar__time">
          <VisuallyHidden>Local time: </VisuallyHidden>
          {hh}:{mm}
        </span>
        <span className="transport-bar__bpm">
          <VisuallyHidden>Beats per minute: </VisuallyHidden>
          {bpm} BPM
        </span>
      </div>
    </Toolbar.Root>
  );
}

export default TransportBar;