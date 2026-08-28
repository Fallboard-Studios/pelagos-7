import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { RobotSelectionCard } from './RobotSelectionCard';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { JOB_TYPE_LABELS, UNASSIGNED_JOB_LABEL, DOCKING_STATE_LABELS, AUDIO_MODE_LABELS } from '@/data/robotSelectionConfig';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'r1',
    name: 'Unit One',
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
    batteryLevel: 72.4,
    ...overrides,
  } as Robot;
}

describe('RobotSelectionCard', () => {
  afterEach(() => {
    cleanup();
    useUIStore.getState().selectRobot(null);
    useUIStore.getState().setActiveLocaleLocalTime(null);
  });

  it("renders the robot's name", () => {
    render(<RobotSelectionCard robot={makeRobot({ name: 'Unit One' })} />);
    expect(screen.getByText('Unit One')).toBeTruthy();
  });

  it('falls back to the robot id when it has no name', () => {
    render(<RobotSelectionCard robot={makeRobot({ name: undefined, id: 'unnamed-1' })} />);
    expect(screen.getByText('unnamed-1')).toBeTruthy();
  });

  it("renders the assigned job's human label when job is set", () => {
    const robot = makeRobot({ job: { type: 'acousticSurvey', assignedAtMeasure: 1 } });
    render(<RobotSelectionCard robot={robot} />);
    expect(screen.getByText(JOB_TYPE_LABELS.acousticSurvey.humanLabel)).toBeTruthy();
  });

  it('renders "Unassigned" when the robot has no job', () => {
    render(<RobotSelectionCard robot={makeRobot({ job: undefined })} />);
    expect(screen.getByText(UNASSIGNED_JOB_LABEL.humanLabel)).toBeTruthy();
  });

  it('renders battery level rounded to the nearest whole percent', () => {
    render(<RobotSelectionCard robot={makeRobot({ batteryLevel: 72.4 })} />);
    expect(screen.getByText('72%')).toBeTruthy();
  });

  it('renders the docking state human label', () => {
    render(<RobotSelectionCard robot={makeRobot({ docking: 'docked' })} />);
    expect(screen.getByText(DOCKING_STATE_LABELS.docked.humanLabel)).toBeTruthy();
  });

  it('renders an AudioStatusBadge reflecting audioMode, defaulting to Off/none when unset', () => {
    render(<RobotSelectionCard robot={makeRobot({ audioMode: undefined })} />);
    const label = AUDIO_MODE_LABELS.none;
    expect(screen.getByRole('status', { name: new RegExp(`${label.humanLabel}.*${label.loreLabel}`) })).toBeTruthy();
  });

  it('renders an AudioStatusBadge reflecting an explicit audioMode', () => {
    render(<RobotSelectionCard robot={makeRobot({ audioMode: 'solo' })} />);
    const label = AUDIO_MODE_LABELS.solo;
    expect(screen.getByRole('status', { name: new RegExp(`${label.humanLabel}.*${label.loreLabel}`) })).toBeTruthy();
  });

  it('clicking the card selects the robot', () => {
    render(<RobotSelectionCard robot={makeRobot({ id: 'r1' })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(useUIStore.getState().selectedRobotId).toBe('r1');
  });

  it('pressing Enter on the card selects the robot', () => {
    render(<RobotSelectionCard robot={makeRobot({ id: 'r1' })} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(useUIStore.getState().selectedRobotId).toBe('r1');
  });

  it('pressing Space on the card selects the robot', () => {
    render(<RobotSelectionCard robot={makeRobot({ id: 'r1' })} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(useUIStore.getState().selectedRobotId).toBe('r1');
  });

  it('is not the Button primitive — it is a plain focusable role="button" element', () => {
    render(<RobotSelectionCard robot={makeRobot()} />);
    const card = screen.getByRole('button');
    expect(card.tagName).not.toBe('BUTTON');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('renders an avatar whose color is unaffected by activeLocaleLocalTime (ignoreDaylight passed through)', () => {
    const robot = makeRobot();

    useUIStore.getState().setActiveLocaleLocalTime(12);
    const { container: noon, unmount } = render(<RobotSelectionCard robot={robot} />);
    const noonFill = noon.querySelector('path')?.getAttribute('fill');
    unmount();

    useUIStore.getState().setActiveLocaleLocalTime(0);
    const { container: midnight } = render(<RobotSelectionCard robot={robot} />);
    const midnightFill = midnight.querySelector('path')?.getAttribute('fill');

    expect(noonFill).not.toBeNull();
    expect(midnightFill).toBe(noonFill);
  });

  it("has an accessible name matching the robot's name", () => {
    render(<RobotSelectionCard robot={makeRobot({ name: 'Unit One' })} />);
    expect(screen.getByRole('button', { name: 'Unit One' })).toBeTruthy();
  });

  describe('company assignment (Roadmap Phase 10)', () => {
    const localeId = getActiveLocaleId();

    afterEach(() => {
      useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
    });

    it('defaults to "Freelance" for an unassigned robot', () => {
      render(<RobotSelectionCard robot={makeRobot({ companyId: undefined })} />);
      expect(screen.getByRole('combobox').textContent).toContain('Freelance');
    });

    it('shows the assigned company\'s name when the robot belongs to one', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
      render(<RobotSelectionCard robot={makeRobot({ id: 'r1', companyId: 'c1' })} />);
      expect(screen.getByRole('combobox').textContent).toContain('Iron Consortium');
    });

    it('selecting a company calls assignRobotToCompany with that company\'s id', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
      const assignSpy = vi.spyOn(useLocaleStore.getState(), 'assignRobotToCompany');
      render(<RobotSelectionCard robot={makeRobot({ id: 'r1', companyId: undefined })} />);

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('option', { name: 'Iron Consortium' }));

      expect(assignSpy).toHaveBeenCalledWith(localeId, 'r1', 'c1');
    });

    it('selecting "Freelance" calls assignRobotToCompany with null', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
      const assignSpy = vi.spyOn(useLocaleStore.getState(), 'assignRobotToCompany');
      render(<RobotSelectionCard robot={makeRobot({ id: 'r1', companyId: 'c1' })} />);

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('option', { name: 'Freelance' }));

      expect(assignSpy).toHaveBeenCalledWith(localeId, 'r1', null);
    });

    it('clicking the company Select trigger does not also select the robot (no nested-interactive double-fire)', () => {
      render(<RobotSelectionCard robot={makeRobot({ id: 'r1' })} />);

      fireEvent.click(screen.getByRole('combobox'));

      expect(useUIStore.getState().selectedRobotId).toBeNull();
    });

    it('selecting a portaled dropdown option does not also select the robot — React re-propagates portal events along the component tree, not the DOM tree, so this is the case a DOM-only guard would miss', () => {
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
      render(<RobotSelectionCard robot={makeRobot({ id: 'r1' })} />);

      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('option', { name: 'Iron Consortium' }));

      expect(useUIStore.getState().selectedRobotId).toBeNull();
    });

    it('clicking elsewhere on the card still selects the robot as before', () => {
      render(<RobotSelectionCard robot={makeRobot({ id: 'r1', name: 'Unit One' })} />);

      fireEvent.click(screen.getByText('Unit One'));

      expect(useUIStore.getState().selectedRobotId).toBe('r1');
    });
  });
});
