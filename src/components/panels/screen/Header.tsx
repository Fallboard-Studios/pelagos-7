import * as Slider from '@radix-ui/react-slider';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useRef } from 'react';

import { useHeaderRowFit } from './useHeaderRowFit';
import { Toggle } from '@/components/ui/controls/Toggle';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { useVoxelTrackGap } from '@/components/ui/controls/useCabinetBoxHeight';
import { HEADER_NAV_SCHEMA } from '@/data/headerNavConfig';
import { useUIStore } from '@/stores/uiStore';
import { useAudioStore } from '@/stores/audioStore';
import type { ToggleSchema } from '@/types/controls';
import type { HubTile } from '@/types/hub';

import './Header.css';

/** No JS-side constant for --touch-target-size (index.css) existed before
 *  this feature — both Toggle's boxSize and useHeaderRowFit's own threshold
 *  math need the same literal 44px, so it's defined once here rather than
 *  duplicated. docs/specs/HEADER_HUB_CONSOLIDATION.md §1.4. */
const TOUCH_TARGET_SIZE = 44;

/** humanLabel: 'Mute' feeds the switch's accessible name (resolveAccessibleName)
 *  but is never visibly shown — the Toggle usage below passes the mute/
 *  unmute icon as facade content instead, which suppresses Toggle's
 *  external DualLabel automatically. No separate "silence 'Mute'" flag
 *  needed; keeping humanLabel here is strictly better than dropping it
 *  (a real aria-label instead of falling back to schema.id), since it's
 *  never rendered as visible text either way. */
const MUTE_SCHEMA: ToggleSchema = { id: 'headerMute', type: 'toggle', humanLabel: 'Mute' };

/** Total buttons in row 3 — Mute (Toggle) + HEADER_NAV_SCHEMA's 3 options
 *  (RadioButton) — used by useHeaderRowFit's own fit threshold math. */
const ROW_3_BUTTON_COUNT = HEADER_NAV_SCHEMA.options.length + 1;

/**
 * The 3-row header docked to the top of ScreenViewport (roadmap-adjacent,
 * docs/specs/HEADER_HUB_CONSOLIDATION.md), replacing TransportBar (Task 9
 * retires that file) and absorbing HubNav's tile-grid navigation into an
 * always-visible row 3. Row 1 (volume) and row 3 (buttons) merge into one
 * inline row on wide viewports (useHeaderRowFit); row 2 (time+temp) never
 * participates in that merge, per the confirmed intent.
 */
function Header() {
  const headerRef = useRef<HTMLElement>(null);

  const isPoweredOn = useUIStore((s) => s.isPoweredOn);
  const activeLocaleLocalTime = useUIStore((s) => s.activeLocaleLocalTime);
  const activeLocaleTemperature = useUIStore((s) => s.activeLocaleTemperature);
  const activeHubTile = useUIStore((s) => s.activeHubTile);

  const isMuted = useAudioStore((s) => s.isMuted);
  const volume = useAudioStore((s) => s.volume);

  const gap = useVoxelTrackGap();
  const inline = useHeaderRowFit(headerRef, ROW_3_BUTTON_COUNT, TOUCH_TARGET_SIZE, gap);

  // Console.css's vertical deadzone clearance (margin-top) needs Header's
  // real rendered height, which varies by breakpoint/content — no longer
  // safely assumable from the old fixed --power-corner-height constant
  // alone (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.6). Written to
  // document.documentElement rather than a local ref/context, since Console
  // is a sibling of Header (not a descendant) — a plain inline custom
  // property on this element's own subtree wouldn't reach it.
  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      document.documentElement.style.setProperty('--header-height', `${entries[0].contentRect.height}px`);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleVolumeChange = (values: number[]) => {
    if (!isPoweredOn) return;
    useAudioStore.getState().setVolume(values[0]);
  };

  // A genuine selection of a different tile — never fires for a re-click of
  // the already-active option (RadioButton's own onChange never sees that
  // event; see handleNavDeselect below). Selecting 'robots' fresh (e.g. from
  // Audio Rig) also clears selectedRobotId defensively, so it always lands
  // on the list rather than some stale detail view from an earlier visit.
  const handleNavChange = (next: string) => {
    const tile = next as HubTile;
    useUIStore.getState().setActiveHubTile(tile);
    if (tile === 'robots') useUIStore.getState().selectRobot(null);
  };

  // Re-clicking the already-active option (RadioButton's onChange swallows
  // this event — docs/specs/HEADER_HUB_CONSOLIDATION.md's RadioButton
  // onDeselect addition exists specifically for it). Deep in a robot's
  // detail screen, this drops to the list rather than blanking all the way
  // out, matching the interview's confirmed behavior; from anywhere else,
  // it's a second way back to the blank hub alongside the existing per-tile
  // Back button.
  const handleNavDeselect = () => {
    const { activeHubTile, selectedRobotId } = useUIStore.getState();
    if (activeHubTile === 'robots' && selectedRobotId) {
      useUIStore.getState().selectRobot(null);
    } else {
      useUIStore.getState().setActiveHubTile(null);
    }
  };

  const _localTime = activeLocaleLocalTime ?? 0;
  const localHour = Math.floor(_localTime);
  const localMinute = Math.floor((_localTime % 1) * 60);
  const hh = String(Math.max(0, Math.min(23, localHour))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, localMinute))).padStart(2, '0');

  return (
    <header ref={headerRef} className={`header${inline ? ' header--inline' : ''}`}>
      <div className="header__row header__row--volume">
        <Slider.Root
          className="header__volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={[volume]}
          onValueChange={handleVolumeChange}
          disabled={!isPoweredOn}
        >
          <Slider.Track className="header__volume-track">
            <Slider.Range className="header__volume-range" />
          </Slider.Track>
          <Slider.Thumb className="header__volume-thumb" aria-label="Volume" />
        </Slider.Root>
      </div>

      <div className="header__row header__row--status">
        <span className="header__time">
          <VisuallyHidden>Local time: </VisuallyHidden>
          {hh}:{mm}
        </span>
        <span className="header__temp">
          <VisuallyHidden>Temperature: </VisuallyHidden>
          {activeLocaleTemperature !== null ? `${activeLocaleTemperature}°C` : '—'}
        </span>
      </div>

      <div className="header__row header__row--nav">
        <Toggle
          schema={MUTE_SCHEMA}
          value={isMuted}
          onChange={(v) => useAudioStore.getState().setMuted(v)}
          disabled={!isPoweredOn}
          boxSize={TOUCH_TARGET_SIZE}
        >
          {isMuted ? '🔇' : '🔊'}
        </Toggle>
        <RadioButton
          schema={HEADER_NAV_SCHEMA}
          value={activeHubTile ?? ''}
          onChange={handleNavChange}
          onDeselect={handleNavDeselect}
          boxSize={TOUCH_TARGET_SIZE}
        />
      </div>
    </header>
  );
}

export default Header;
