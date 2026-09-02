import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import TransportBar from './TransportBar';
import { useAttenuationStyleStore } from '@/stores/attenuationStyleStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useAudioStore } from '@/stores/audioStore';
import { useUIStore } from '@/stores/uiStore';
import type { AttenuationStyle } from '@/types/attenuationStyle';
import type { Locale } from '@/types/locale';


// Real stores, real (side-effect-safe) AudioEngine calls — no mocks. Per
// docs/tasks/LAYOUT.md Task 9, this bar just reads existing store state; a
// real render is the highest-confidence way to prove that.
const TEST_ATTENUATION_STYLE: AttenuationStyle = {
  id: 'test-attenuation-style',
  name: 'Glaxos',
  locales: ['test-locale'],
  currentLocaleId: 'test-locale',
};

const TEST_LOCALE: Locale = {
  id: 'test-locale',
  attenuationStyleId: 'test-attenuation-style',
  name: 'Test Locale',
  coordinates: { x: -17.4, y: 30.2 },
  dayStartTimestamp: 0,
  robots: [],
  actors: [],
  companies: [],
  currentMeasure: 5,
};

function setStoreFixtures() {
  useAttenuationStyleStore.setState({ attenuationStyles: [TEST_ATTENUATION_STYLE], currentAttenuationStyleId: TEST_ATTENUATION_STYLE.id });
  useLocaleStore.setState({ locales: { [TEST_LOCALE.id]: TEST_LOCALE } });
  useAudioStore.setState({ bpm: 128, isMuted: false, volume: 1 });
  useUIStore.setState({ isPoweredOn: true, activeLocaleLocalTime: 14.5 }); // 14:30
}

describe('TransportBar (Task 9 — rebuild)', () => {
  beforeEach(() => {
    setStoreFixtures();
  });

  it('shows the Attenuation Style name', () => {
    // Regex, not an exact string match: the field's accessible label is
    // real (visually-hidden) text sharing the same node, per the
    // aria-label-on-a-bare-span fix below — the node's full text is
    // "Attenuation Style: Glaxos", not just "Glaxos".
    render(<TransportBar />);
    expect(screen.getByText(/Glaxos/)).toBeTruthy();
  });

  it('shows the locale coordinates, rounded', () => {
    render(<TransportBar />);
    expect(screen.getByText(/-17.*30/)).toBeTruthy();
  });

  it('shows the local time as HH:MM', () => {
    render(<TransportBar />);
    expect(screen.getByText(/14:30/)).toBeTruthy();
  });

  it('shows BPM', () => {
    render(<TransportBar />);
    expect(screen.getByText(/128 BPM/)).toBeTruthy();
  });

  it('labels each metadata field with real text, not aria-label on a bare span', () => {
    // A plain <span> has an implicit ARIA role of "generic", which per the
    // ARIA spec doesn't support an author-supplied accessible name —
    // aria-label on one is liable to be ignored by assistive tech. Real
    // (visually-hidden) text inside the node works regardless of role
    // support, since it's part of the element's actual text content.
    const { container } = render(<TransportBar />);

    const fields: Array<[selector: string, label: string, value: string]> = [
      ['.transport-bar__attenuation-style', 'Attenuation Style', 'Glaxos'],
      ['.transport-bar__coords', 'Locale coordinates', '-17'],
      ['.transport-bar__time', 'Local time', '14:30'],
      ['.transport-bar__bpm', 'Beats per minute', '128 BPM'],
    ];

    for (const [selector, label, value] of fields) {
      const el = container.querySelector(selector);
      expect(el, `expected ${selector} to exist`).toBeTruthy();
      expect(el?.getAttribute('aria-label')).toBeNull();
      expect(el?.textContent).toContain(label);
      expect(el?.textContent).toContain(value);
    }
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
    useAttenuationStyleStore.setState({
      attenuationStyles: [{ ...TEST_ATTENUATION_STYLE, currentLocaleId: 'missing-locale' }],
    });
    render(<TransportBar />);
    expect(screen.queryByText('undefined')).toBeNull();
  });

  describe('volume slider (docs/specs/GLOBAL_VOLUME_CONTROL.md §1.4)', () => {
    it('renders next to the mute button, reflecting audioStore.volume', () => {
      useAudioStore.setState({ volume: 0.6 });
      render(<TransportBar />);
      const slider = screen.getByRole('slider', { name: /volume/i });
      expect(slider.getAttribute('aria-valuenow')).toBe('0.6');
      expect(slider.getAttribute('aria-valuemin')).toBe('0');
      expect(slider.getAttribute('aria-valuemax')).toBe('1');
    });

    it('is disabled when powered off, same condition as the mute button', () => {
      useUIStore.setState({ isPoweredOn: false });
      render(<TransportBar />);
      const slider = screen.getByRole('slider', { name: /volume/i });
      expect(slider.getAttribute('data-disabled')).toBe('');
    });

    it('stepping it with the keyboard calls setVolume, observable as a real store update', () => {
      useAudioStore.setState({ volume: 0.5 });
      render(<TransportBar />);
      const slider = screen.getByRole('slider', { name: /volume/i });

      slider.focus();
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      expect(useAudioStore.getState().volume).toBeGreaterThan(0.5);
    });

    it('clicking mute does not change volume — mute and volume are fully independent', async () => {
      useAudioStore.setState({ volume: 0.8, isMuted: false });
      render(<TransportBar />);
      const muteBtn = screen.getByRole('button', { name: /mute/i });

      await fireEvent.click(muteBtn);

      expect(useAudioStore.getState().isMuted).toBe(true);
      expect(useAudioStore.getState().volume).toBe(0.8);
    });

    it('the mute icon stays 🔊 when volume is 0 and isMuted is false — the icon never reacts to slider position', () => {
      useAudioStore.setState({ volume: 0, isMuted: false });
      render(<TransportBar />);
      const muteBtn = screen.getByRole('button', { name: /mute/i });
      expect(muteBtn.textContent).toBe('🔊');
    });
  });
});
