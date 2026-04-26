// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// MOCKS
// ========================================
vi.mock('./AudioEngine', () => ({
  AudioEngine: {
    registerRobotMelody: vi.fn(),
  },
}));

vi.mock('../stores/localeStore', () => ({
  useLocaleStore: {
    getState: () => ({ updateRobot: updateRobotMock }),
  },
}));

// ========================================
// SUBJECT UNDER TEST
// ========================================
import { regenerateMelody } from './regenerateMelody';
import { AudioEngine } from './AudioEngine';
import type { Robot } from '../types/Robot';
import { RobotState } from '../types/Robot';

// Hoisted mock spy references — resolved after imports so vi.mocked() works.
const updateRobotMock = vi.fn();

// ========================================
// HELPERS
// ========================================

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'robot-1',
    state: RobotState.Idle,
    position: { x: 0, y: 0 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: {
      synthType: 'AMSynth',
      adsr: { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.1 },
      pitchRange: { min: 100, max: 200 },
      filterFreq: 1000,
      reverb: 0.5,
    },
    octaveRange: [3, 5],
    audioMode: 'none',
    rhythmicDensity: 6,
    rhythmicMotifLength: 8,
    noteVariance: 0,
    masterVolume: 0.8,
    createdAt: Date.now(),
    ...overrides,
  } as Robot;
}

// ========================================
// TEST SUITE: regenerateMelody
// ========================================

describe('regenerateMelody', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateRobot on the locale store with the generated melody', () => {
    const robot = makeRobot();
    regenerateMelody(robot, 'locale-1');

    expect(updateRobotMock).toHaveBeenCalledOnce();
    const [localeId, robotId, updates] = updateRobotMock.mock.calls[0];
    expect(localeId).toBe('locale-1');
    expect(robotId).toBe('robot-1');
    expect(Array.isArray(updates.melody)).toBe(true);
    expect(updates.melody.length).toBeGreaterThan(0);
  });

  it('calls AudioEngine.registerRobotMelody with the same melody written to the store', () => {
    const robot = makeRobot();
    regenerateMelody(robot, 'locale-1');

    const registerMock = vi.mocked(AudioEngine.registerRobotMelody);
    expect(registerMock).toHaveBeenCalledOnce();
    const [robotId, registeredMelody] = registerMock.mock.calls[0];
    expect(robotId).toBe('robot-1');

    // The melody passed to AudioEngine must be the same object as stored
    const storedMelody = updateRobotMock.mock.calls[0][2].melody;
    expect(registeredMelody).toBe(storedMelody);
  });

  it('store update is called before AudioEngine registration', () => {
    const callOrder: string[] = [];
    updateRobotMock.mockImplementation(() => callOrder.push('store'));
    vi.mocked(AudioEngine.registerRobotMelody).mockImplementation(() => callOrder.push('engine'));

    regenerateMelody(makeRobot(), 'locale-1');
    expect(callOrder).toEqual(['store', 'engine']);
  });

  it('generated melody events all have noteIndex in [0, 7]', () => {
    regenerateMelody(makeRobot(), 'locale-1');
    const melody: Array<{ noteIndex: number }> = updateRobotMock.mock.calls[0][2].melody;
    melody.forEach((e) => {
      expect(e.noteIndex).toBeGreaterThanOrEqual(0);
      expect(e.noteIndex).toBeLessThanOrEqual(7);
    });
  });

  it('generated melody events all have octave within robot.octaveRange', () => {
    const robot = makeRobot({ octaveRange: [2, 4] });
    regenerateMelody(robot, 'locale-1');
    const melody: Array<{ octave: number }> = updateRobotMock.mock.calls[0][2].melody;
    melody.forEach((e) => {
      expect(e.octave).toBeGreaterThanOrEqual(2);
      expect(e.octave).toBeLessThanOrEqual(4);
    });
  });

  it('uses robot.rhythmicDensity as eventCount when present', () => {
    const robot = makeRobot({ rhythmicDensity: 8 });
    regenerateMelody(robot, 'locale-1');
    const melody: unknown[] = updateRobotMock.mock.calls[0][2].melody;
    expect(melody).toHaveLength(8);
  });

  it('falls back to 6 events when rhythmicDensity is absent', () => {
    const robot = makeRobot({ rhythmicDensity: undefined });
    regenerateMelody(robot, 'locale-1');
    const melody: unknown[] = updateRobotMock.mock.calls[0][2].melody;
    expect(melody).toHaveLength(6);
  });
});
