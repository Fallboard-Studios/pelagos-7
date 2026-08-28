import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import RobotsTab from './RobotsTab';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

const makeRobot = (id: string, name?: string) => ({
  id,
  name,
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
  rhythmicDensity: 6,
  rhythmicMotifLength: 8,
  docking: 'active',
  batteryLevel: 80,
});

describe('RobotsTab', () => {
  const localeId = getActiveLocaleId();

  function resetStores() {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
    useUIStore.getState().selectRobot(null);
  }

  it('lists every robot in the active locale as a card, by name', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One') as unknown as Robot);
    useLocaleStore.getState().addRobot(localeId, makeRobot('r2', 'Unit Two') as unknown as Robot);

    render(<RobotsTab />);

    expect(screen.getByRole('button', { name: 'Unit One' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unit Two' })).toBeTruthy();
  });

  it('falls back to the robot id when a robot has no name', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('unnamed-1') as unknown as Robot);

    render(<RobotsTab />);

    expect(screen.getByRole('button', { name: 'unnamed-1' })).toBeTruthy();
  });

  it('falls back to the robot id when a robot has a blank (empty-string) name', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('blank-1', '') as unknown as Robot);

    render(<RobotsTab />);

    expect(screen.getByRole('button', { name: 'blank-1' })).toBeTruthy();
  });

  it("renders each robot's job, battery, docking, and audio status", () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, {
      ...makeRobot('r1', 'Unit One'),
      job: { type: 'acousticSurvey', assignedAtMeasure: 1 },
      batteryLevel: 63,
      docking: 'active',
      audioMode: 'highlight',
    } as unknown as Robot);

    render(<RobotsTab />);

    // Scoped to the robot's own card — 'Active' alone is ambiguous once CompanyManager mounts
    // (Lfo.tsx's own nested Active toggle renders the same text, always mounted via Radix's
    // Accordion forceMount regardless of open/closed state; see RobotDisplaySection.test.tsx's
    // identical note).
    const card = screen.getByRole('button', { name: 'Unit One' });
    expect(within(card).getByText('Acoustic Survey')).toBeTruthy();
    expect(within(card).getByText('63%')).toBeTruthy();
    expect(within(card).getByText('Active')).toBeTruthy();
    expect(within(card).getByRole('status', { name: /Highlight/ })).toBeTruthy();
  });

  it('clicking a robot card selects it', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One') as unknown as Robot);

    render(<RobotsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Unit One' }));

    expect(useUIStore.getState().selectedRobotId).toBe('r1');
  });

  it('does not render a "+ New Robot" button — the roster is fixed at 12, created once at locale load', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One') as unknown as Robot);

    render(<RobotsTab />);

    expect(screen.queryByRole('button', { name: '+ New Robot' })).toBeNull();
  });

  it('renders CompanyManager beneath the robot card list (Roadmap Phase 10)', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One') as unknown as Robot);

    const { container } = render(<RobotsTab />);

    const list = container.querySelector('.robots-tab__list');
    const manager = container.querySelector('.company-manager');
    expect(list).toBeTruthy();
    expect(manager).toBeTruthy();
    expect(list!.compareDocumentPosition(manager!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
