import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import TransportBar from './TransportBar';
import { usePlanetStore } from '@/stores/planetStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useAudioStore } from '@/stores/audioStore';
import { useUIStore } from '@/stores/uiStore';
import type { Planet } from '@/types/planet';
import type { Locale } from '@/types/locale';


// Real stores, real (side-effect-safe) AudioEngine calls — no mocks. Per
// docs/tasks/LAYOUT.md Task 9, this bar just reads existing store state; a
// real render is the highest-confidence way to prove that.
const TEST_PLANET: Planet = {
  id: 'test-planet',
  name: 'Glaxos',
  size: 'medium',
  locales: ['test-locale'],
  currentLocaleId: 'test-locale',
  dayStartTimestamp: 0,
  currentHour: 0,
};

const TEST_LOCALE: Locale = {
  id: 'test-locale',
  planetId: 'test-planet',
  name: 'Test Locale',
  coordinates: { x: -17.4, y: 30.2 },
  robots: [],
  actors: [],
  settings: {},
  currentMeasure: 5,
};

function setStoreFixtures() {
  usePlanetStore.setState({ planets: [TEST_PLANET], currentPlanetId: TEST_PLANET.id });
  useLocaleStore.setState({ locales: { [TEST_LOCALE.id]: TEST_LOCALE } });
  useAudioStore.setState({ bpm: 128, isMuted: false, preMuteVolume: 1.0 });
  useUIStore.setState({ isPoweredOn: true, activeLocaleLocalTime: 14.5 }); // 14:30
}

describe('TransportBar (Task 9 — rebuild)', () => {
  beforeEach(() => {
    setStoreFixtures();
  });

  it('shows the planet name', () => {
    render(<TransportBar />);
    expect(screen.getByText('Glaxos')).toBeTruthy();
  });

  it('shows the locale coordinates, rounded', () => {
    render(<TransportBar />);
    expect(screen.getByText(/-17.*30/)).toBeTruthy();
  });

  it('shows the local time as HH:MM', () => {
    render(<TransportBar />);
    expect(screen.getByText('14:30')).toBeTruthy();
  });

  it('shows BPM', () => {
    render(<TransportBar />);
    expect(screen.getByText('128 BPM')).toBeTruthy();
  });

  it('renders no restart or pause/play controls', () => {
    // Edge case: the whole point of this task is that these are gone with
    // no replacement.
    render(<TransportBar />);
    expect(screen.queryByRole('button', { name: /restart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /pause/i })).toBeNull();
  });

  it('renders mute as a standalone toggle button (aria-pressed), not a radiogroup item', () => {
    // Mute is the only toggle in the bar now that restart/pause are gone —
    // wrapping a single item in Toolbar.ToggleGroup (a radiogroup, for
    // choosing among multiple mutually-exclusive options) was vestigial
    // from when there were two groups. A standalone toggle's correct ARIA
    // pattern is a plain button with aria-pressed, not one radio in a
    // group of one.
    render(<TransportBar />);
    const muteBtn = screen.getByRole('button', { name: /mute/i });
    expect(muteBtn.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('still flips audioStore.isMuted and reflects it via aria-pressed', async () => {
    render(<TransportBar />);
    const muteBtn = screen.getByRole('button', { name: /mute/i });
    await fireEvent.click(muteBtn);
    expect(useAudioStore.getState().isMuted).toBe(true);
    expect(muteBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('disables the mute toggle when powered off', () => {
    useUIStore.setState({ isPoweredOn: false });
    render(<TransportBar />);
    const muteBtn = screen.getByRole('button', { name: /mute/i });
    expect(muteBtn.hasAttribute('disabled')).toBe(true);
  });

  it('falls back to a dash when there is no active locale', () => {
    // Edge case: currentLocaleId points at a locale that doesn't exist in
    // useLocaleStore.locales — must not crash or show "undefined".
    usePlanetStore.setState({
      planets: [{ ...TEST_PLANET, currentLocaleId: 'missing-locale' }],
    });
    render(<TransportBar />);
    expect(screen.queryByText('undefined')).toBeNull();
  });
});
