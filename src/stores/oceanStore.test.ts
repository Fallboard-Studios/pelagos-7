import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Robot } from '../types/Robot';
import { RobotState } from '../types/Robot';

const killTimeline = vi.fn<(id: string) => void>();

vi.mock('../animation/timelineMap', () => ({
  killTimeline,
}));

let useOceanStore: typeof import('./oceanStore')['useOceanStore'];

const createRobot = (overrides: Partial<Robot> = {}): Robot => ({
  id: overrides.id ?? 'r-1',
  state: overrides.state ?? RobotState.Idle,
  position: overrides.position ?? { x: 0, y: 0, z: 0 },
  destination: overrides.destination ?? null,
  melody:
    overrides.melody ?? [{ id: 'm-1', startStep: 1, length: '8n', noteIndex: 0 }],
  audioAttributes:
    overrides.audioAttributes ?? {
      synthType: 'AMSynth',
      adsr: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.3 },
      pitchRange: { min: 220, max: 440 },
      filterFreq: 800,
      reverb: 0.4,
    },
});

describe('oceanStore', () => {
  beforeEach(async () => {
    vi.resetModules();
    killTimeline.mockClear();
    ({ useOceanStore } = await import('./oceanStore'));
    useOceanStore.setState({ robots: [], settings: { bpm: 60, maxRobots: 12 } });
  });

  it('adds robots to state', () => {
    const robot = createRobot();
    useOceanStore.getState().addRobot(robot);
    expect(useOceanStore.getState().robots).toHaveLength(1);
  });

  it('removes robots and kills swim timeline', () => {
    const robot = createRobot({ id: 'r-remove' });
    useOceanStore.getState().addRobot(robot);
    useOceanStore.getState().removeRobot('r-remove');
    expect(killTimeline).toHaveBeenCalledWith('swim-r-remove');
    expect(useOceanStore.getState().robots).toHaveLength(0);
  });

  it('updates robot properties immutably', () => {
    const robot = createRobot({ id: 'r-update' });
    useOceanStore.getState().addRobot(robot);
    useOceanStore.getState().updateRobot('r-update', {
      state: RobotState.Moving,
      destination: { x: 10, y: 5, z: 0 },
    });
    const updated = useOceanStore.getState().getRobotById('r-update');
    expect(updated?.state).toBe(RobotState.Moving);
    expect(updated?.destination).toEqual({ x: 10, y: 5, z: 0 });
  });

  it('retrieves robots by id', () => {
    const robotA = createRobot({ id: 'a' });
    const robotB = createRobot({ id: 'b' });
    useOceanStore.getState().addRobot(robotA);
    useOceanStore.getState().addRobot(robotB);
    expect(useOceanStore.getState().getRobotById('b')).toMatchObject({ id: 'b' });
  });
});
