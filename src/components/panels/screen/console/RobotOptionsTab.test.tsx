import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import RobotOptionsTab from './RobotOptionsTab';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import * as spawnSystem from '@/systems/spawnSystem';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

// Minimal robot fixture, matching RobotAudioTab.test.tsx's pattern.
const makeRobot = (id = 'new-robot') => ({
  id,
  name: 'New Robot',
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

describe('RobotOptionsTab — post-spawn navigation', () => {
  const localeId = getActiveLocaleId();

  beforeEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
    useUIStore.getState().setActiveHubTile(null);
    useUIStore.getState().selectRobot(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  it('selects the new robot and navigates to the robotEditor tile after spawning', () => {
    // spawnRobot touches AudioEngine internally (real Tone.js, unavailable in
    // jsdom) — stub it to just add a robot to the store, the same boundary
    // ScreenViewport.test.tsx draws around Tone/GSAP-touching children.
    vi.spyOn(spawnSystem, 'spawnRobot').mockImplementation((id: string) => {
      useLocaleStore.getState().addRobot(id, makeRobot('spawned-1') as unknown as Robot);
    });

    render(<RobotOptionsTab />);

    fireEvent.click(screen.getByText('+ New Robot'));

    expect(useUIStore.getState().selectedRobotId).toBe('spawned-1');
    expect(useUIStore.getState().activeHubTile).toBe('robotEditor');
  });
});
