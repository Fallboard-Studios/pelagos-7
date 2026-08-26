import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import RobotMetaTab from './RobotMetaTab';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { DockingState } from '@/types/Robot';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

const makeRobot = (id: string, name?: string): Robot => ({
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
  docking: DockingState.Active,
  batteryLevel: 100,
});

describe('RobotMetaTab', () => {
  const localeId = getActiveLocaleId();

  function resetStores() {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
    useUIStore.getState().selectRobot(null);
  }

  it('does not render a Persist control — retired along with the persists field', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One'));
    useUIStore.getState().selectRobot('r1');

    render(<RobotMetaTab />);

    expect(screen.queryByLabelText('Persist robot')).toBeNull();
    expect(screen.queryByText('Persist')).toBeNull();
  });

  it('still renders the Name field with the selected robot\'s name', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One'));
    useUIStore.getState().selectRobot('r1');

    render(<RobotMetaTab />);

    expect((screen.getByLabelText('Robot name') as HTMLInputElement).value).toBe('Unit One');
  });

  it('still renders the Copy Robot control, unaffected by the Persist removal', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One'));
    useLocaleStore.getState().addRobot(localeId, makeRobot('r2', 'Unit Two'));
    useUIStore.getState().selectRobot('r1');

    render(<RobotMetaTab />);

    expect(screen.getByLabelText('Copy robot target')).toBeTruthy();
  });

  it('shows the empty-state message when no robot is selected', () => {
    resetStores();

    render(<RobotMetaTab />);

    expect(screen.getByText('Select a robot to edit its meta.')).toBeTruthy();
  });
});
