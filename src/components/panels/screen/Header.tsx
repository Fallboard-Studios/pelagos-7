import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useRef } from 'react';

import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '@/stores/attenuationStyleStore';
import { useLocaleStore } from '@/stores/localeStore';
import { Toggle } from '@/components/ui/controls/Toggle';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { HEADER_NAV_SCHEMA } from '@/data/headerNavConfig';
import { useUIStore } from '@/stores/uiStore';
import { useAudioStore } from '@/stores/audioStore';
import type { ToggleSchema, SliderLinearSchema } from '@/types/controls';
import type { HubTile } from '@/types/hub';

import './Header.css';

/** No JS-side constant for --touch-target-size (index.css) existed before
 *  this feature — the nav RadioButton's boxSize needs the same literal
 *  44px, so it's defined once here rather than duplicated.
 *  docs/specs/HEADER_HUB_CONSOLIDATION.md §1.4. */
const TOUCH_TARGET_SIZE = 44;

/** humanLabel: 'Mute' feeds the switch's accessible name (resolveAccessibleName)
 *  but is never visibly shown as its own DualLabel row — the Toggle usage
 *  below passes text facade content instead (which suppresses Toggle's
 *  external DualLabel automatically), doing double duty as row 1's own
 *  "Volume" label since the slider itself no longer carries one (see
 *  VOLUME_SCHEMA below). Keeping humanLabel here is strictly better than
 *  dropping it (a real aria-label instead of falling back to schema.id),
 *  since it's never rendered as visible text either way. */
const MUTE_SCHEMA: ToggleSchema = { id: 'headerMute', type: 'toggle', humanLabel: 'Mute' };

/** Row 1's volume slider, the shared Cabinetry SliderLinear (same primitive
 *  the robot detail page's own Volume control uses, see
 *  AudioSettingSection.tsx/VOLUME_SCHEMA) instead of a bare Radix slider.
 *  0-100 display range, 1% steps — audioStore.volume itself is 0..1, so
 *  Header converts pct/100 on write and volume*100 on read, same
 *  display-vs-storage split VOLUME_SCHEMA's own doc-comment describes.
 *  No humanLabel/loreLabel — the Mute toggle sitting beside it (below) is
 *  what visibly reads "Volume" now, so a second DualLabel row here would be
 *  redundant. Accepts the same id-fallback aria-label trade-off already
 *  flagged for MUTE_SCHEMA/HEADER_NAV_SCHEMA (docs/specs/HEADER_HUB_CONSOLIDATION.md
 *  §7 item #2) rather than reintroducing a visible label just for a11y. */
const VOLUME_SCHEMA: SliderLinearSchema = {
  id: 'headerVolume',
  min: 0,
  max: 100,
  step: 1,
  unit: '%',
  orientation: 'horizontal',
  type: 'sliderLinear',
};

/** Row 2's Attenuation Style readout — truncated past 15 chars so a long
 *  name doesn't blow out the row's width, falling back to a placeholder
 *  when the style/name itself isn't available yet. Extracted out of an
 *  inline nested ternary (code review, 2026-09-12) for readability. */
function formatAttenuationStyleName(name: string | undefined): string {
  if (!name) return 'CORRUPT NAME';
  return name.length < 15 ? name : `${name.slice(0, 12)}...`;
}

/**
 * The header docked to the top of ScreenViewport (roadmap-adjacent,
 * docs/specs/HEADER_HUB_CONSOLIDATION.md), replacing TransportBar (Task 9
 * retired that file) and absorbing HubNav's tile-grid navigation into an
 * always-visible nav group. Responsive layout is now a fixed set of
 * hand-authored breakpoints in Header.css (430/480/880/1220px) rather than
 * the original spec's ResizeObserver-driven row merge — see
 * docs/tasks/HEADER_HUB_CONSOLIDATION.md's "Post-implementation follow-up".
 */
function Header() {
  const headerRef = useRef<HTMLElement>(null);

  const isPoweredOn = useUIStore((s) => s.isPoweredOn);
  const activeLocaleLocalTime = useUIStore((s) => s.activeLocaleLocalTime);
  const activeLocaleTemperature = useUIStore((s) => s.activeLocaleTemperature);
  const activeHubTile = useUIStore((s) => s.activeHubTile);

  const isMuted = useAudioStore((s) => s.isMuted);
  const volume = useAudioStore((s) => s.volume);

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

  const handleVolumeChange = (pct: number) => {
    if (!isPoweredOn) return;
    useAudioStore.getState().setVolume(pct / 100);
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
  const currentAttenuationStyle = useAttenuationStyleStore(selectCurrentAttenuationStyle);
  const displayAttenuationStyleName = formatAttenuationStyleName(currentAttenuationStyle?.name);
  const currentLocaleId = currentAttenuationStyle?.currentLocaleId;
  const currentLocale = useLocaleStore((s) => (currentLocaleId ? s.locales[currentLocaleId] : undefined));

  return (
    <header ref={headerRef} className="header">
      <div className="rocker-spacer">
        <div className="header__row header__row--volume">
          <Toggle
            schema={MUTE_SCHEMA}
            value={isMuted}
            onChange={(v) => useAudioStore.getState().setMuted(v)}
            disabled={!isPoweredOn}
          >
            {/* Both possible strings render stacked in the same grid cell
             (Header.css) — the box's content-sized width always reflects
             whichever is wider, so it never resizes as isMuted flips; only
             the one matching the current state stays visible. */}
            <span className="header__mute-facade">
              <span className="header__mute-facade-text" data-visible={!isMuted ? 'true' : undefined}>Volume/Mute</span>
              <span className="header__mute-facade-text" data-visible={isMuted ? 'true' : undefined}>Volume Muted</span>
            </span>
          </Toggle>
          <SliderLinear
            schema={VOLUME_SCHEMA}
            value={volume * 100}
            onChange={handleVolumeChange}
            disabled={!isPoweredOn}
          />
        </div>
        <div className="header__row--status-nav">
          <div className="header__row header__row--status">
            <div className="header__status__row">
              <span className="header__attenuation-style">
                <VisuallyHidden>Attenuation style: </VisuallyHidden>
                {displayAttenuationStyleName}
              </span>
              <span className="header__coordinates">
                <VisuallyHidden>Coordinates: </VisuallyHidden>
                @ {currentLocale?.coordinates?.x ?? 'CORRUPT X'}, {currentLocale?.coordinates?.y ?? 'CORRUPT Y'}
              </span>
            </div>
            <div className="header__status__row">
              <span className="header__time">
                <VisuallyHidden>Local time: </VisuallyHidden>
                {hh}:{mm}
              </span>
              <span className="header__temp">
                <VisuallyHidden>Temperature: </VisuallyHidden>
                {activeLocaleTemperature !== null ? `${activeLocaleTemperature}°C` : 'CORRUPT TEMPERATURE'}
              </span>
            </div>
          </div>
          <div className="header__row header__row--nav primary">
            <RadioButton
              schema={HEADER_NAV_SCHEMA}
              value={activeHubTile ?? ''}
              onChange={handleNavChange}
              onDeselect={handleNavDeselect}
              boxSize={TOUCH_TARGET_SIZE}
            />
          </div>
        </div>
      </div>
      <div className="header__row header__row--nav secondary">
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
