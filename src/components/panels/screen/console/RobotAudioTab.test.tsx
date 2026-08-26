import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import RobotAudioTab from './RobotAudioTab';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import * as melodyGen from '@/engine/melodyGenerator';
import { AudioEngine } from '@/engine/AudioEngine';
import type { Robot } from '@/types/Robot';
import type { RobotMelodyEvent } from '@/engine/melodyGenerator';
import type { Locale } from '@/types/locale';

// Minimal robot fixture matching the `Robot` shape used by the component
const makeRobot = (id = 'r1') => ({
  id,
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
  rhythmicDensity: 50,
  rhythmicMotifLength: { active: true, value: 8 },
  noteVariance: { active: false, value: 1 },
});

describe('RobotAudioTab', () => {
  const localeId = getActiveLocaleId();

  beforeEach(() => {
    // Reset store to a known state
    const state = useLocaleStore.getState();
    // Ensure locale exists and is clean
    state.setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear robots
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  it('updates the store when density changes and triggers regeneration', () => {
    const robot = makeRobot('robot-density');
    useLocaleStore.getState().addRobot(localeId, robot as unknown as Robot);
    // mark as selected so component's commitUpdate runs
    useUIStore.getState().selectRobot(robot.id);

    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');

    const sampleMelody = [{ id: 'm1', startStep: 1, length: '8n', noteIndex: 0, octave: 3 }];
    const genSpy = vi.spyOn(melodyGen, 'generateMelodyForRobot').mockReturnValue(sampleMelody as unknown as RobotMelodyEvent[]);
    const regSpy = vi.spyOn(AudioEngine, 'registerRobotMelody').mockImplementation(() => { });
    vi.spyOn(AudioEngine, 'unregisterRobotMelody').mockImplementation(() => { });

    render(<RobotAudioTab robot={robot as unknown as Robot} />);

    const densityInput = screen.getByLabelText('Rhythmic density') as HTMLInputElement;
    expect(densityInput).toBeTruthy();

    // Change density to a new value (0-100 range)
    fireEvent.change(densityInput, { target: { value: '75' } });

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { rhythmicDensity: 75 });

    // scheduleRegenerate is now synchronous — no flush needed
    expect(genSpy).toHaveBeenCalled();
    expect(regSpy).toHaveBeenCalledWith(robot.id, sampleMelody as unknown as RobotMelodyEvent[]);
  });

  it('updates the store when motif length value changes and triggers regeneration', () => {
    const robot = makeRobot('robot-motif');
    useLocaleStore.getState().addRobot(localeId, robot as unknown as Robot);
    // mark as selected so component's commitUpdate runs
    useUIStore.getState().selectRobot(robot.id);

    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');

    const sampleMelody = [{ id: 'm2', startStep: 1, length: '8n', noteIndex: 0, octave: 3 }];
    const genSpy = vi.spyOn(melodyGen, 'generateMelodyForRobot').mockReturnValue(sampleMelody as unknown as RobotMelodyEvent[]);
    const regSpy = vi.spyOn(AudioEngine, 'registerRobotMelody').mockImplementation(() => { });
    vi.spyOn(AudioEngine, 'unregisterRobotMelody').mockImplementation(() => { });

    render(<RobotAudioTab robot={robot as unknown as Robot} />);

    const motifInput = screen.getByLabelText('Motif length') as HTMLInputElement;
    expect(motifInput).toBeTruthy();

    // Valid range is now 1-8 (was 1-16)
    fireEvent.change(motifInput, { target: { value: '5' } });

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { rhythmicMotifLength: { active: true, value: 5 } });

    // scheduleRegenerate is now synchronous — no flush needed
    expect(genSpy).toHaveBeenCalled();
    expect(regSpy).toHaveBeenCalledWith(robot.id, sampleMelody as unknown as RobotMelodyEvent[]);
  });

  it('toggling motif length\'s Active checkbox off updates the store and triggers regeneration', () => {
    const robot = makeRobot('robot-motif-toggle');
    useLocaleStore.getState().addRobot(localeId, robot as unknown as Robot);
    useUIStore.getState().selectRobot(robot.id);

    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const sampleMelody = [{ id: 'm3', startStep: 1, length: '8n', noteIndex: 0, octave: 3 }];
    vi.spyOn(melodyGen, 'generateMelodyForRobot').mockReturnValue(sampleMelody as unknown as RobotMelodyEvent[]);
    const regSpy = vi.spyOn(AudioEngine, 'registerRobotMelody').mockImplementation(() => { });
    vi.spyOn(AudioEngine, 'unregisterRobotMelody').mockImplementation(() => { });

    render(<RobotAudioTab robot={robot as unknown as Robot} />);

    const activeCheckbox = screen.getByLabelText('Motif length active') as HTMLInputElement;
    expect(activeCheckbox.checked).toBe(true); // fixture starts active: true

    fireEvent.click(activeCheckbox);

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { rhythmicMotifLength: { active: false, value: 8 } });
    expect(regSpy).toHaveBeenCalled();
  });

  it('the motif length slider/input is disabled when its Active toggle is off', () => {
    const robot = makeRobot('robot-motif-disabled');
    robot.rhythmicMotifLength = { active: false, value: 4 };
    useLocaleStore.getState().addRobot(localeId, robot as unknown as Robot);
    useUIStore.getState().selectRobot(robot.id);

    render(<RobotAudioTab robot={robot as unknown as Robot} />);

    const motifInput = screen.getByLabelText('Motif length') as HTMLInputElement;
    expect(motifInput.disabled).toBe(true);
  });

  it('updates the store when note variance value changes and triggers regeneration', () => {
    const robot = makeRobot('robot-variance');
    useLocaleStore.getState().addRobot(localeId, robot as unknown as Robot);
    useUIStore.getState().selectRobot(robot.id);

    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const sampleMelody = [{ id: 'm4', startStep: 1, length: '8n', noteIndex: 0, octave: 3 }];
    vi.spyOn(melodyGen, 'generateMelodyForRobot').mockReturnValue(sampleMelody as unknown as RobotMelodyEvent[]);
    vi.spyOn(AudioEngine, 'registerRobotMelody').mockImplementation(() => { });
    vi.spyOn(AudioEngine, 'unregisterRobotMelody').mockImplementation(() => { });

    render(<RobotAudioTab robot={robot as unknown as Robot} />);

    const varianceInput = screen.getByLabelText('Note variance') as HTMLInputElement;
    fireEvent.change(varianceInput, { target: { value: '3' } });

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { noteVariance: { active: false, value: 3 } });
  });

  it('toggling note variance\'s Active checkbox on updates the store and triggers regeneration', () => {
    const robot = makeRobot('robot-variance-toggle');
    useLocaleStore.getState().addRobot(localeId, robot as unknown as Robot);
    useUIStore.getState().selectRobot(robot.id);

    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const sampleMelody = [{ id: 'm5', startStep: 1, length: '8n', noteIndex: 0, octave: 3 }];
    vi.spyOn(melodyGen, 'generateMelodyForRobot').mockReturnValue(sampleMelody as unknown as RobotMelodyEvent[]);
    const regSpy = vi.spyOn(AudioEngine, 'registerRobotMelody').mockImplementation(() => { });
    vi.spyOn(AudioEngine, 'unregisterRobotMelody').mockImplementation(() => { });

    render(<RobotAudioTab robot={robot as unknown as Robot} />);

    const activeCheckbox = screen.getByLabelText('Note variance active') as HTMLInputElement;
    expect(activeCheckbox.checked).toBe(false); // fixture starts active: false

    fireEvent.click(activeCheckbox);

    expect(updateSpy).toHaveBeenCalledWith(localeId, robot.id, { noteVariance: { active: true, value: 1 } });
    expect(regSpy).toHaveBeenCalled();
  });
});
