import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../engine/AudioEngine', () => ({ AudioEngine: { start: vi.fn(), killAll: vi.fn() } }));
vi.mock('../engine/harmonySystem', () => ({ resetHarmony: vi.fn() }));
vi.mock('./spawnSystem', () => ({ reRegisterAllRobotsAudio: vi.fn(), removeNonPersistentRobots: vi.fn(), stopSpawnScheduler: vi.fn() }));
vi.mock('./collisionSystem', () => ({ stopCollisionDetection: vi.fn() }));
const setPowerOnSpy = vi.fn();
const setPowerOffSpy = vi.fn();
vi.mock('../stores/uiStore', () => ({ useUIStore: { getState: () => ({ setPowerOn: setPowerOnSpy, setPowerOff: setPowerOffSpy }) } }));
const setLocaleDataSpy = vi.fn();
vi.mock('../stores/localeStore', () => ({ useLocaleStore: { getState: () => ({ setLocaleData: setLocaleDataSpy }) } }));
vi.mock('../utils/localeHelpers', () => ({ getActiveLocaleId: () => 'pelagos-default' }));

import { powerController } from './powerController';
import { AudioEngine } from '../engine/AudioEngine';
import { resetHarmony } from '../engine/harmonySystem';
import { reRegisterAllRobotsAudio, stopSpawnScheduler } from './spawnSystem';
import { stopCollisionDetection } from './collisionSystem';
import { useUIStore } from '../stores/uiStore';
import { useLocaleStore } from '../stores/localeStore';

describe('powerController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('start calls audio start, resetHarmony and reRegisterAllRobotsAudio', async () => {
    await powerController.start();
    expect(AudioEngine.start).toHaveBeenCalled();
    expect(resetHarmony).toHaveBeenCalled();
    expect(reRegisterAllRobotsAudio).toHaveBeenCalled();
  });

  it('shutdown halts systems and clears state', async () => {
    // shutdown returns after running its small timeline; call and await
    const p = powerController.shutdown();
    await p;
    expect(stopSpawnScheduler).toHaveBeenCalled();
    expect(stopCollisionDetection).toHaveBeenCalled();
    expect(AudioEngine.killAll).toHaveBeenCalled();
    // locale actors cleared and ui setPowerOff should be called
    expect(useLocaleStore.getState().setLocaleData).toHaveBeenCalled();
    expect(useUIStore.getState().setPowerOff).toHaveBeenCalled();
  });
});
