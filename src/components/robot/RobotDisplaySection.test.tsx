import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { RobotDisplaySection } from './RobotDisplaySection';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { lfoEngine } from '@/engine/lfoEngine';
import { AudioEngine } from '@/engine/AudioEngine';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

vi.mock('@/engine/lfoEngine', () => ({
  lfoEngine: {
    connectLfoTarget: vi.fn(() => true),
    disconnectLfoTarget: vi.fn(),
    setLfoRate: vi.fn(),
    setLfoDepth: vi.fn(),
    setLfoShape: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'r1',
    name: 'Test Robot',
    state: 'idle',
    position: { x: 0, y: 0 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: {
      adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 },
      filterFreq: 0,
      waveform: 'sine',
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 82,
    audioMode: 'none',
    job: { type: 'acousticSurvey', assignedAtMeasure: 0 },
    ...overrides,
  } as Robot;
}

describe('RobotDisplaySection', () => {
  const localeId = getActiveLocaleId();

  beforeEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
    useUIStore.getState().setActiveLocaleLocalTime(null);
  });

  it('renders the same sunlight/time-agnostic robot avatar RobotSelectionCard uses (ignoreDaylight passed through)', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);

    useUIStore.getState().setActiveLocaleLocalTime(12);
    const { container: noon, unmount } = render(<RobotDisplaySection robot={robot} />);
    const noonPath = noon.querySelector('path');
    expect(noonPath).not.toBeNull();
    const noonFill = noonPath!.getAttribute('fill');
    unmount();

    useUIStore.getState().setActiveLocaleLocalTime(0);
    const { container: midnight, unmount: unmountMidnight } = render(<RobotDisplaySection robot={robot} />);
    const midnightPath = midnight.querySelector('path');
    expect(midnightPath).not.toBeNull();
    const midnightFill = midnightPath!.getAttribute('fill');
    unmountMidnight();

    expect(noonFill).not.toBeNull();
    expect(midnightFill).toBe(noonFill);
  });

  it('renders Name/Job/Battery/Docking as plain text with no input/button role attached', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<RobotDisplaySection robot={robot} />);

    // Scoped to the component's own read-only value spans — 'Active' alone is ambiguous
    // (Lfo.tsx's own nested Active toggle renders the same text, always mounted via Radix's
    // Accordion forceMount regardless of open/closed state).
    const values = Array.from(container.querySelectorAll('.robot-display-section__value')).map((el) => el.textContent);
    expect(values).toEqual(['Test Robot', 'Acoustic Survey', '82%', 'Active']);

    container.querySelectorAll('.robot-display-section__value').forEach((el) => {
      expect(el.closest('button, input, [role="button"], [role="radio"], [role="switch"]')).toBeNull();
    });
  });

  it('shows "Unassigned" when the robot has no job', () => {
    const robot = makeRobot({ job: undefined, docking: 'docked' });
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<RobotDisplaySection robot={robot} />);
    expect(screen.getByText('Unassigned')).toBeTruthy();
  });

  it('renders no job-reassignment or docking-override control anywhere', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<RobotDisplaySection robot={robot} />);

    expect(screen.queryByRole('combobox', { name: /job/i })).toBeNull();
    expect(screen.queryByRole('radio', { name: /docked|docking|departing|active/i })).toBeNull();
  });

  it('Audio Setting radio includes all 4 options and calls updateRobot with the matching audioMode', () => {
    const robot = makeRobot({ audioMode: 'none' });
    useLocaleStore.getState().addRobot(localeId, robot);
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    render(<RobotDisplaySection robot={robot} />);

    ['Off', 'Mute', 'Solo', 'Highlight'].forEach((label) => {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Solo' }));
    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { audioMode: 'solo' });
  });

  it('Volume slider displays 0-100% of the stored masterVolume, in 1% steps', () => {
    const robot = makeRobot({ masterVolume: 0.42 });
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<RobotDisplaySection robot={robot} />);

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider.getAttribute('aria-valuenow')).toBe('42');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
  });

  it('a Volume edit converts the percent back to 0..1, writes the store, and updates the live AudioEngine cache', () => {
    const robot = makeRobot({ masterVolume: 0.42 });
    useLocaleStore.getState().addRobot(localeId, robot);
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const volumeSpy = vi.spyOn(AudioEngine, 'updateRobotMasterVolume').mockImplementation(() => {});
    render(<RobotDisplaySection robot={robot} />);

    const slider = screen.getByRole('slider', { name: /volume/i });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    expect(updateSpy).toHaveBeenCalled();
    const [, , update] = updateSpy.mock.calls[0];
    const newVolume = (update as Partial<Robot>).masterVolume!;
    expect(newVolume).toBeCloseTo(0.43, 5); // one 1% step up from 42%
    // The whole point of this bug fix: a Volume edit must also update AudioEngine's live cache,
    // not just the store - otherwise the change is silently inaudible (see
    // AudioEngine.updateRobotMasterVolume's own tests for why).
    expect(volumeSpy).toHaveBeenCalledWith(robot.id, newVolume);
  });

  it('Volume\'s Lfo accordion reflects lfoSettings.volume and wires connectLfoTarget on activation', () => {
    const robot = makeRobot({
      lfoSettings: {
        volume: { shape: 'sine', rate: 1, depth: 20, active: false },
      } as unknown as Robot['lfoSettings'],
    });
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<RobotDisplaySection robot={robot} />);

    const lfoActiveToggle = screen.getByRole('switch', { name: /active/i });
    fireEvent.click(lfoActiveToggle);

    expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('volume', robot.id);
    expect(lfoEngine.start).toHaveBeenCalledWith('volume', robot.id);
  });
});
