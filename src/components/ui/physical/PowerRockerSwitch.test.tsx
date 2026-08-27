import { describe, it, vi, beforeEach, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('@/systems/powerController', () => ({ powerController: { start: vi.fn(), shutdown: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

// `let`, not `const` — a couple of new tests need isPoweredOn: true, which a static mock
// factory can't express. Reset in beforeEach so tests can't leak state into each other.
let mockIsPoweredOn = false;
vi.mock('@/stores/uiStore', () => {
  const setPowerOn = vi.fn();
  const setPowerOff = vi.fn();
  const useUIStore = (selector: unknown) => (typeof selector === 'function' ? (selector as (s: { isPoweredOn: boolean }) => unknown)({ isPoweredOn: mockIsPoweredOn }) : { isPoweredOn: mockIsPoweredOn });
  (useUIStore as unknown as { getState: () => { setPowerOn: typeof setPowerOn; setPowerOff: typeof setPowerOff } }).getState = () => ({ setPowerOn, setPowerOff });
  return { useUIStore };
});

import { PowerRockerSwitch } from './PowerRockerSwitch';
import { powerController } from '@/systems/powerController';
import { setTimeline } from '@/animation/timelineMap';
import { getStatusLightColor } from '@/utils/statusLightColors';

// jsdom's CSSOM normalizes `hsl(...)` inline-style values to `rgb(...)` on read — round-tripping
// the expected value through the same normalization keeps the assertion about "is it the
// statusLightColors color", not about jsdom's serialization format.
function normalizeColor(color: string): string {
  const probe = document.createElement('span');
  probe.style.color = color;
  return probe.style.color;
}

describe('PowerRockerSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPoweredOn = false;
  });

  it('clicking when off starts powerController.start and registers sequence', async () => {
    const { getByRole } = render(<PowerRockerSwitch />);
    const btn = getByRole('button', { name: /Power on/i });
    await fireEvent.click(btn);
    expect(powerController.start).toHaveBeenCalled();
    expect(setTimeline).toHaveBeenCalled();
  });

  it('colors the light red (via statusLightColors) when powered off', () => {
    const { container } = render(<PowerRockerSwitch />);
    const light = container.querySelector('.rocker-light') as HTMLElement;
    expect(light.getAttribute('data-power-state')).toBe('off');
    expect(light.style.color).toBe(normalizeColor(getStatusLightColor('red').color));
  });

  it('colors the light green (via statusLightColors) when powered on', () => {
    mockIsPoweredOn = true;
    const { container } = render(<PowerRockerSwitch />);
    const light = container.querySelector('.rocker-light') as HTMLElement;
    expect(light.getAttribute('data-power-state')).toBe('on');
    expect(light.style.color).toBe(normalizeColor(getStatusLightColor('green').color));
  });

  it('colors the light amber (via statusLightColors) while transitioning', async () => {
    const { container, getByRole } = render(<PowerRockerSwitch />);
    await fireEvent.click(getByRole('button', { name: /Power on/i }));
    const light = container.querySelector('.rocker-light') as HTMLElement;
    expect(light.getAttribute('data-transitioning')).toBe('true');
    expect(light.style.color).toBe(normalizeColor(getStatusLightColor('amber').color));
  });

  it("gives the 'on' glow more presence than 'off' or 'transitioning' — not just a different hue", () => {
    // Regression guard: unifying all three states onto statusLightColors must not flatten the
    // original hand-tuned distinction ("on" reads deliberately brighter/bigger than the others).
    const { container: offContainer } = render(<PowerRockerSwitch />);
    const offGlow = (offContainer.querySelector('.rocker-light') as HTMLElement).style.boxShadow;

    mockIsPoweredOn = true;
    const { container: onContainer } = render(<PowerRockerSwitch />);
    const onGlow = (onContainer.querySelector('.rocker-light') as HTMLElement).style.boxShadow;

    expect(onGlow).not.toBe(offGlow);
  });
});
