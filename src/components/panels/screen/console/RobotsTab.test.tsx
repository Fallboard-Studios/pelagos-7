import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import RobotsTab from './RobotsTab';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import * as spawnSystem from '@/systems/spawnSystem';
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
});

describe('RobotsTab', () => {
  const localeId = getActiveLocaleId();

  function resetStores() {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
    useUIStore.getState().selectRobot(null);
  }

  it('lists every robot in the active locale by name', () => {
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

  it('clicking a robot selects it', () => {
    resetStores();
    useLocaleStore.getState().addRobot(localeId, makeRobot('r1', 'Unit One') as unknown as Robot);

    render(<RobotsTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Unit One' }));

    expect(useUIStore.getState().selectedRobotId).toBe('r1');
  });

  it('"+ New Robot" spawns and selects a robot without touching activeHubTile', () => {
    resetStores();
    useUIStore.getState().setActiveHubTile('robots');
    vi.spyOn(spawnSystem, 'spawnRobot').mockImplementation((id: string) => {
      useLocaleStore.getState().addRobot(id, makeRobot('spawned-1', 'New Unit') as unknown as Robot);
    });

    render(<RobotsTab />);
    fireEvent.click(screen.getByRole('button', { name: '+ New Robot' }));

    expect(useUIStore.getState().selectedRobotId).toBe('spawned-1');
    expect(useUIStore.getState().activeHubTile).toBe('robots');

    vi.restoreAllMocks();
  });
});
