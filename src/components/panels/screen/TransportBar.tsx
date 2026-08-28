// ========================================
// IMPORTS
// ========================================
import * as Toolbar from '@radix-ui/react-toolbar';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { useLocaleStore } from '../../../stores/localeStore';
import { usePlanetStore, selectCurrentPlanet } from '../../../stores/planetStore';
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
  const activeLocaleLocalTime = useUIStore((s) => s.activeLocaleLocalTime);
  const planetName = usePlanetStore((s) => selectCurrentPlanet(s)?.name ?? '—');
  const localeId = usePlanetStore((s) => selectCurrentPlanet(s)?.currentLocaleId ?? '');
  const coordinates = useLocaleStore((s) => s.locales[localeId]?.coordinates);
  const _localTime = activeLocaleLocalTime ?? 0;
  const planetHour = Math.floor(_localTime);
  const planetMinute = Math.floor((_localTime % 1) * 60);
  const bpm = useAudioStore((s) => s.bpm);

  const isMuted = useAudioStore((s) => s.isMuted);

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

  const hh = String(Math.max(0, Math.min(23, Math.floor(planetHour ?? 0)))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Math.floor(planetMinute ?? 0)))).padStart(2, '0');
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
      </div>

      <Toolbar.Separator className="transport-bar__separator" />

      <div className={`transport-bar__displays${isPoweredOn ? '' : ' transport-bar__displays--dim'}`}>
        {/* A bare <span>'s implicit ARIA role ("generic") doesn't support
            aria-label per the ARIA spec, so labels are real (visually
            hidden) text instead — that reaches assistive tech regardless
            of role support, since it's part of the element's own content. */}
        <span className="transport-bar__planet">
          <VisuallyHidden>Attenuation Style: </VisuallyHidden>
          {planetName}
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