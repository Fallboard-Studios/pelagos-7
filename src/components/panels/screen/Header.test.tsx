import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('./useHeaderRowFit', () => ({
  useHeaderRowFit: vi.fn(() => false),
  MIN_VOLUME_RESERVE_PX: 80,
}));

import Header from './Header';
import { useHeaderRowFit } from './useHeaderRowFit';
import { useUIStore } from '@/stores/uiStore';
import { useAudioStore } from '@/stores/audioStore';

function setStoreFixtures() {
  useAudioStore.setState({ isMuted: false, volume: 0.6 });
  useUIStore.setState({
    isPoweredOn: true,
    activeLocaleLocalTime: 14.5, // 14:30
    activeLocaleTemperature: -45,
    activeHubTile: null,
    selectedRobotId: null,
  });
}

// Controllable ResizeObserver mock, mirroring useHeaderRowFit.test.ts's own
// — useHeaderRowFit itself is mocked above (no real observer from it), so
// this one exclusively exercises the --header-height measurement effect
// (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.6, Task 9).
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observedTargets: Element[] = [];
  disconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observedTargets.push(target);
  }

  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }

  fire(height: number) {
    this.callback([{ contentRect: { height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

/** CabinetBox (Toggle's mute box + RadioButton's 3 option boxes — 4 real
 *  instances render here) also constructs its own ResizeObserver, which
 *  would otherwise be indistinguishable from the height-measurement
 *  effect's own instance under the same mocked global. Find the one
 *  observing the <header> root specifically. */
function findHeaderHeightObserver(headerEl: Element): MockResizeObserver {
  const found = MockResizeObserver.instances.find((o) => o.observedTargets.includes(headerEl));
  if (!found) throw new Error('No MockResizeObserver observed the <header> root element');
  return found;
}

let originalResizeObserver: typeof ResizeObserver;

describe('Header', () => {
  beforeEach(() => {
    setStoreFixtures();
    vi.mocked(useHeaderRowFit).mockReturnValue(false);
    MockResizeObserver.instances = [];
    originalResizeObserver = globalThis.ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = originalResizeObserver;
    document.documentElement.style.removeProperty('--header-height');
  });

  it('renders exactly one volume slider bound to audioStore.volume', () => {
    render(<Header />);
    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider.getAttribute('aria-valuenow')).toBe('0.6');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('1');
  });

  it('stepping the volume slider with the keyboard calls setVolume, observable as a real store update', () => {
    render(<Header />);
    const slider = screen.getByRole('slider', { name: /volume/i });
    slider.focus();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(useAudioStore.getState().volume).toBeGreaterThan(0.6);
  });

  it('disables the volume slider when powered off', () => {
    useUIStore.setState({ isPoweredOn: false });
    render(<Header />);
    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider.getAttribute('data-disabled')).toBe('');
  });

  it('renders the local time as HH:MM', () => {
    render(<Header />);
    expect(screen.getByText(/14:30/)).toBeTruthy();
  });

  it('renders temperature as an integer °C reading', () => {
    render(<Header />);
    expect(screen.getByText(/-45°C/)).toBeTruthy();
  });

  it('falls back to a placeholder when temperature has not been set yet (null)', () => {
    useUIStore.setState({ activeLocaleTemperature: null });
    render(<Header />);
    expect(screen.queryByText(/°C/)).toBeNull();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('renders mute as a switch reflecting audioStore.isMuted', () => {
    render(<Header />);
    const muteSwitch = screen.getByRole('switch', { name: /mute/i });
    expect(muteSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('clicking mute flips audioStore.isMuted, independent of volume', () => {
    useAudioStore.setState({ volume: 0.8, isMuted: false });
    render(<Header />);
    fireEvent.click(screen.getByRole('switch', { name: /mute/i }));
    expect(useAudioStore.getState().isMuted).toBe(true);
    expect(useAudioStore.getState().volume).toBe(0.8);
  });

  it('disables the mute switch when powered off', () => {
    useUIStore.setState({ isPoweredOn: false });
    render(<Header />);
    expect((screen.getByRole('switch', { name: /mute/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders exactly one nav group with 3 options', () => {
    render(<Header />);
    expect(screen.getByRole('radio', { name: 'Robots' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Audio Rig' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sector Settings' })).toBeTruthy();
  });

  it('selecting a nav option calls setActiveHubTile', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Audio Rig' }));
    expect(useUIStore.getState().activeHubTile).toBe('audioRig');
  });

  it('re-selecting the active nav option clears activeHubTile back to null (deselect-to-empty, via RadioButton\'s onDeselect)', () => {
    useUIStore.setState({ activeHubTile: 'settings' });
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Sector Settings' }));
    expect(useUIStore.getState().activeHubTile).toBeNull();
  });

  it('re-selecting Robots while selectedRobotId is set drops to the list instead of blanking all the way out', () => {
    useUIStore.setState({ activeHubTile: 'robots', selectedRobotId: 'robot-3' });
    render(<Header />);
    // Clicking the already-active 'Robots' option fires RadioButton's
    // onDeselect (not onChange) — handleNavDeselect must still recognize the
    // robots+selectedRobotId case and drop to the list, not blank
    // activeHubTile to null.
    fireEvent.click(screen.getByRole('radio', { name: 'Robots' }));
    expect(useUIStore.getState().selectedRobotId).toBeNull();
    expect(useUIStore.getState().activeHubTile).toBe('robots');
  });

  it('re-selecting Robots while selectedRobotId is already null blanks all the way out, same as any other tile', () => {
    useUIStore.setState({ activeHubTile: 'robots', selectedRobotId: null });
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Robots' }));
    expect(useUIStore.getState().activeHubTile).toBeNull();
  });

  it('selecting a non-robots tile does not touch selectedRobotId', () => {
    useUIStore.setState({ activeHubTile: null, selectedRobotId: 'robot-3' });
    render(<Header />);
    fireEvent.click(screen.getByRole('radio', { name: 'Audio Rig' }));
    expect(useUIStore.getState().selectedRobotId).toBe('robot-3');
  });

  it('applies the header--inline class when useHeaderRowFit returns true', () => {
    vi.mocked(useHeaderRowFit).mockReturnValue(true);
    const { container } = render(<Header />);
    expect(container.querySelector('.header.header--inline')).toBeTruthy();
  });

  it('omits the header--inline class when useHeaderRowFit returns false', () => {
    vi.mocked(useHeaderRowFit).mockReturnValue(false);
    const { container } = render(<Header />);
    expect(container.querySelector('.header--inline')).toBeNull();
    expect(container.querySelector('.header')).toBeTruthy();
  });

  it('renders no restart, pause/play, Attenuation Style, coordinates, or BPM readouts — all removed per docs/specs/HEADER_HUB_CONSOLIDATION.md §1.8', () => {
    render(<Header />);
    expect(screen.queryByRole('button', { name: /restart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /pause/i })).toBeNull();
    expect(screen.queryByText(/BPM/)).toBeNull();
  });

  // docs/specs/HEADER_HUB_CONSOLIDATION.md §1.6 (Task 9) — Console.css's
  // vertical deadzone clearance reads --header-height off document.documentElement,
  // since Header is a sibling of Console, not an ancestor.
  describe('--header-height measurement (§1.6)', () => {
    it('writes its own measured height to document.documentElement as --header-height', () => {
      const { container } = render(<Header />);
      const observer = findHeaderHeightObserver(container.querySelector('header')!);

      act(() => observer.fire(140));
      expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('140px');
    });

    it('updates --header-height again when the header resizes, not just once on mount', () => {
      const { container } = render(<Header />);
      const observer = findHeaderHeightObserver(container.querySelector('header')!);

      act(() => observer.fire(140));
      expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('140px');

      act(() => observer.fire(96));
      expect(document.documentElement.style.getPropertyValue('--header-height')).toBe('96px');
    });

    it('disconnects the height observer on unmount', () => {
      const { container, unmount } = render(<Header />);
      const observer = findHeaderHeightObserver(container.querySelector('header')!);
      expect(observer.disconnected).toBe(false);
      unmount();
      expect(observer.disconnected).toBe(true);
    });
  });
});
