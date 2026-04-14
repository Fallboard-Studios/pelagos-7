import { describe, it, vi, beforeEach, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('@/systems/powerController', () => ({ powerController: { start: vi.fn(), shutdown: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));
vi.mock('@/stores/uiStore', () => {
  const setPowerOn = vi.fn();
  const setPowerOff = vi.fn();
  const useUIStore = (selector: unknown) => (typeof selector === 'function' ? (selector as (s: { isPoweredOn: boolean }) => unknown)({ isPoweredOn: false }) : { isPoweredOn: false });
  (useUIStore as unknown as { getState: () => { setPowerOn: typeof setPowerOn; setPowerOff: typeof setPowerOff } }).getState = () => ({ setPowerOn, setPowerOff });
  return { useUIStore };
});

import { PowerRockerSwitch } from './PowerRockerSwitch';
import { powerController } from '@/systems/powerController';
import { setTimeline } from '@/animation/timelineMap';

describe('PowerRockerSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clicking when off starts powerController.start and registers sequence', async () => {
    const { getByRole } = render(<PowerRockerSwitch />);
    const btn = getByRole('button', { name: /Power on/i });
    await fireEvent.click(btn);
    expect(powerController.start).toHaveBeenCalled();
    expect(setTimeline).toHaveBeenCalled();
  });
});
