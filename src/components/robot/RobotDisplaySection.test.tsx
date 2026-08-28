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
    useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
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

  // Audio Setting/Volume/Volume-LFO assertions live in AudioSettingSection.test.tsx as of Task 13
  // (Roadmap Phase 10) — RobotDisplaySection now only wires that component's value/callbacks
  // through robotOptionsActions, it doesn't own that rendering itself anymore.

  it('renders AudioSettingSection wired to the robot\'s current audioMode/masterVolume/volumeLfo', () => {
    const robot = makeRobot({ audioMode: 'solo', masterVolume: 0.6 });
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<RobotDisplaySection robot={robot} />);

    expect(screen.getByRole('radio', { name: 'Solo' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('slider', { name: /volume/i }).getAttribute('aria-valuenow')).toBe('60');
  });

  it('an Audio Setting edit calls updateRobot via robotOptionsActions.applyAudioMode', () => {
    const robot = makeRobot({ audioMode: 'none' });
    useLocaleStore.getState().addRobot(localeId, robot);
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    render(<RobotDisplaySection robot={robot} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Solo' }));

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { audioMode: 'solo' });
  });

  it('a Volume edit calls updateRobot and AudioEngine.updateRobotMasterVolume via robotOptionsActions.applyVolume', () => {
    const robot = makeRobot({ masterVolume: 0.42 });
    useLocaleStore.getState().addRobot(localeId, robot);
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const volumeSpy = vi.spyOn(AudioEngine, 'updateRobotMasterVolume').mockImplementation(() => {});
    render(<RobotDisplaySection robot={robot} />);

    fireEvent.keyDown(screen.getByRole('slider', { name: /volume/i }), { key: 'ArrowRight' });

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { masterVolume: expect.closeTo(0.43, 5) });
    expect(volumeSpy).toHaveBeenCalledWith(robot.id, expect.closeTo(0.43, 5));
  });

  it('a Volume LFO activation calls lfoEngine.connectLfoTarget via robotOptionsActions.applyVolumeLfo', () => {
    const robot = makeRobot({
      lfoSettings: {
        volume: { shape: 'sine', rate: 1, depth: 20, active: false },
      } as unknown as Robot['lfoSettings'],
    });
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<RobotDisplaySection robot={robot} />);

    fireEvent.click(screen.getByRole('switch', { name: /active/i }));

    expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('volume', robot.id);
    expect(lfoEngine.start).toHaveBeenCalledWith('volume', robot.id);
  });

  describe('company assignment (Roadmap Phase 10)', () => {
    it('defaults to "Freelance" for an unassigned robot', () => {
      const robot = makeRobot({ companyId: undefined });
      useLocaleStore.getState().addRobot(localeId, robot);
      render(<RobotDisplaySection robot={robot} />);

      expect(screen.getByRole('combobox').textContent).toContain('Freelance');
    });

    it('shows the assigned company\'s name when the robot belongs to one', () => {
      const robot = makeRobot({ companyId: 'c1' });
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [robot.id] });
      useLocaleStore.getState().addRobot(localeId, robot);
      render(<RobotDisplaySection robot={robot} />);

      expect(screen.getByRole('combobox').textContent).toContain('Iron Consortium');
    });

    it('selecting a company calls assignRobotToCompany with that company\'s id', () => {
      const robot = makeRobot({ companyId: undefined });
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
      useLocaleStore.getState().addRobot(localeId, robot);
      const assignSpy = vi.spyOn(useLocaleStore.getState(), 'assignRobotToCompany');
      render(<RobotDisplaySection robot={robot} />);

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('option', { name: 'Iron Consortium' }));

      expect(assignSpy).toHaveBeenCalledWith(localeId, robot.id, 'c1');
    });

    it('selecting "Freelance" calls assignRobotToCompany with null', () => {
      const robot = makeRobot({ companyId: 'c1' });
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [robot.id] });
      useLocaleStore.getState().addRobot(localeId, robot);
      const assignSpy = vi.spyOn(useLocaleStore.getState(), 'assignRobotToCompany');
      render(<RobotDisplaySection robot={robot} />);

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('option', { name: 'Freelance' }));

      expect(assignSpy).toHaveBeenCalledWith(localeId, robot.id, null);
    });
  });
});
