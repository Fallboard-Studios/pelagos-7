import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PingControlsDrawer } from './PingControlsDrawer';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import * as melodyGen from '@/engine/melodyGenerator';
import { AudioEngine } from '@/engine/AudioEngine';
import type { Robot } from '@/types/Robot';
import type { RobotMelodyEvent } from '@/engine/melodyGenerator';
import type { Locale } from '@/types/locale';

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
    batteryLevel: 100,
    rhythmicDensity: 50,
    rhythmicMotifLength: { active: true, value: 8 },
    noteVariance: { active: false, value: 1 },
    ...overrides,
  } as Robot;
}

describe('PingControlsDrawer', () => {
  const localeId = getActiveLocaleId();

  beforeEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  function stubMelodyPipeline() {
    const sampleMelody = [{ id: 'm1', startStep: 1, length: '8n', noteIndex: 0, octave: 3 }];
    vi.spyOn(melodyGen, 'generateMelodyForRobot').mockReturnValue(sampleMelody as unknown as RobotMelodyEvent[]);
    vi.spyOn(AudioEngine, 'registerRobotMelody').mockImplementation(() => {});
    vi.spyOn(AudioEngine, 'unregisterRobotMelody').mockImplementation(() => {});
  }

  it('wraps its controls in exactly one AccordionContainer', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    stubMelodyPipeline();
    render(<PingControlsDrawer robot={robot} />);
    expect(screen.getAllByText('Ping Controls')).toHaveLength(1);
  });

  it('changing Density calls updateRobot and regenerates the melody', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    stubMelodyPipeline();
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const genSpy = vi.spyOn(melodyGen, 'generateMelodyForRobot');
    render(<PingControlsDrawer robot={robot} />);

    fireEvent.click(screen.getByRole('button', { name: /Increment Density/i }));

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { rhythmicDensity: 51 });
    expect(genSpy).toHaveBeenCalled();
  });

  it('changing Motif Length\'s active toggle calls updateRobot and regenerates the melody', () => {
    const robot = makeRobot({ rhythmicMotifLength: { active: false, value: 4 } });
    useLocaleStore.getState().addRobot(localeId, robot);
    stubMelodyPipeline();
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const genSpy = vi.spyOn(melodyGen, 'generateMelodyForRobot');
    render(<PingControlsDrawer robot={robot} />);

    fireEvent.click(screen.getByRole('switch', { name: /Motif Length/i }));

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { rhythmicMotifLength: { active: true, value: 4 } });
    expect(genSpy).toHaveBeenCalled();
  });

  it('changing Octave Range Min calls updateRobot with the updated tuple', () => {
    const robot = makeRobot({ octaveRange: [3, 5] });
    useLocaleStore.getState().addRobot(localeId, robot);
    stubMelodyPipeline();
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    render(<PingControlsDrawer robot={robot} />);

    fireEvent.click(screen.getByRole('button', { name: /Increment Octave Range Min/i }));

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { octaveRange: [4, 5] });
  });

  it('changing Note Variance\'s active toggle calls updateRobot and regenerates the melody', () => {
    const robot = makeRobot({ noteVariance: { active: false, value: 1 } });
    useLocaleStore.getState().addRobot(localeId, robot);
    stubMelodyPipeline();
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const genSpy = vi.spyOn(melodyGen, 'generateMelodyForRobot');
    render(<PingControlsDrawer robot={robot} />);

    fireEvent.click(screen.getByRole('switch', { name: /Note Variance/i }));

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { noteVariance: { active: true, value: 1 } });
    expect(genSpy).toHaveBeenCalled();
  });

  it('Reset Melody is a plain one-click Button - no confirmation dialog', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    stubMelodyPipeline();
    const genSpy = vi.spyOn(melodyGen, 'generateMelodyForRobot');
    render(<PingControlsDrawer robot={robot} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset Melody' }));

    // Fires immediately - no "are you sure?" step to click through first
    expect(genSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
