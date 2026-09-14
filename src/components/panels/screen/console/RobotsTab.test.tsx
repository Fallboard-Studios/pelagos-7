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
    useUIStore.getState().selectCompany(null);
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

  it("renders each robot's job, battery, docking, and audibility status (Roadmap 15.2 redesign)", () => {
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
    // identical note). Docking and Status now render as one combined line, not two standalone
    // texts — 'highlight' still counts as audible (isRobotAudible), so it reads "Emitting".
    const card = screen.getByRole('button', { name: 'Unit One' });
    expect(within(card).getByText('Acoustic Survey')).toBeTruthy();
    expect(within(card).getByText('63%')).toBeTruthy();
    expect(within(card).getByText('Active · Emitting')).toBeTruthy();
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

  // Roadmap: Robot Selection Filter Panel — selecting a specific company now filters the list
  // (hides non-members) instead of just reordering it. filterRobotsByCompanyFocus's own
  // pure-function unit tests live in src/utils/robotListFilter.test.ts; these cover the rendered
  // integration only.
  describe('company-selection-driven filter (rendered)', () => {
    function robotNamesInOrder(container: HTMLElement): (string | null)[] {
      return Array.from(container.querySelectorAll('.robot-selection-card__name')).map((el) => el.textContent);
    }

    function seedRobotsAndCompany() {
      useLocaleStore.getState().addRobot(localeId, { ...makeRobot('r1', 'Alpha'), companyId: 'c1' } as unknown as Robot);
      useLocaleStore.getState().addRobot(localeId, makeRobot('r2', 'Beta') as unknown as Robot);
      useLocaleStore.getState().addRobot(localeId, { ...makeRobot('r3', 'Gamma'), companyId: 'c1' } as unknown as Robot);
      useLocaleStore.getState().addRobot(localeId, makeRobot('r4', 'Delta') as unknown as Robot);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', color: '#4f6d7a', robotIds: ['r1', 'r3'] });
    }

    it('renders every robot, in original roster order, with no company selected', () => {
      resetStores();
      useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
      seedRobotsAndCompany();

      const { container } = render(<RobotsTab />);
      expect(robotNamesInOrder(container)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    });

    it('shows only the selected company\'s members, hiding everyone else', () => {
      resetStores();
      useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
      seedRobotsAndCompany();
      useUIStore.getState().selectCompany('c1');

      const { container } = render(<RobotsTab />);
      expect(robotNamesInOrder(container)).toEqual(['Alpha', 'Gamma']);
    });

    it('reverts to showing every robot once selectAllRobots() is called', () => {
      resetStores();
      useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
      seedRobotsAndCompany();
      useUIStore.getState().selectCompany('c1');
      useUIStore.getState().selectAllRobots();

      const { container } = render(<RobotsTab />);
      expect(robotNamesInOrder(container)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    });
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

  // Roadmap: Robot Selection Filter Panel — CompanyOptionsSection moved out of CompanyManager to
  // be RobotsTab's own direct child, in the same relative position CompanyManager used to render
  // it (beneath the robot card list, following CompanyManager itself).
  it('renders CompanyOptionsSection directly, following CompanyManager', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One') as unknown as Robot);

    const { container } = render(<RobotsTab />);

    const manager = container.querySelector('.company-manager');
    const optionsSection = container.querySelector('.company-options-section');
    expect(manager).toBeTruthy();
    expect(optionsSection).toBeTruthy();
    expect(manager!.compareDocumentPosition(optionsSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Direct child of .robots-tab, not nested inside .company-manager anymore.
    expect(container.querySelector('.company-manager .company-options-section')).toBeNull();
  });
});
