import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PingContourDrawer } from './PingContourDrawer';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { AudioEngine } from '@/engine/AudioEngine';
import type { Robot } from '@/types/Robot';
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
      adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
      filterFreq: 0,
      waveform: 'sine',
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 100,
    ...overrides,
  } as Robot;
}

describe('PingContourDrawer', () => {
  const localeId = getActiveLocaleId();

  beforeEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  it('reads Attack/Decay/Release from audioAttributes.adsr directly', () => {
    // SliderLog's Radix root operates on the internal t in [0,1] (see sliderLogMath.ts) —
    // aria-valuenow reflects t, not the schema-space value — so this checks the visible
    // formatted-value text instead, which is what actually shows the real domain value.
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<PingContourDrawer robot={robot} />);

    const values = Array.from(container.querySelectorAll('.sc-slider-log__value')).map((el) => el.textContent);
    expect(values).toEqual(['0.2s', '0.3s', '1.5s']);
  });

  it('Sustain displays as 0-100% of the stored 0..1 value', () => {
    const robot = makeRobot({
      audioAttributes: { adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 }, filterFreq: 0, waveform: 'sine' },
    });
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<PingContourDrawer robot={robot} />);
    expect(screen.getByRole('slider', { name: /sustain/i }).getAttribute('aria-valuenow')).toBe('80');
  });

  it('an Attack edit writes audioAttributes.adsr and calls AudioEngine.updateVoiceEnvelope, not reReserveVoice', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const envelopeSpy = vi.spyOn(AudioEngine, 'updateVoiceEnvelope').mockImplementation(() => {});
    const reReserveSpy = vi.spyOn(AudioEngine, 'reReserveVoice').mockImplementation(() => true);
    render(<PingContourDrawer robot={robot} />);

    const attackSlider = screen.getByRole('slider', { name: /attack/i });
    fireEvent.keyDown(attackSlider, { key: 'ArrowRight' });

    expect(updateSpy).toHaveBeenCalled();
    const [, , update] = updateSpy.mock.calls[0];
    const newAdsr = (update as Partial<Robot>).audioAttributes!.adsr;
    expect(newAdsr.attack).toBeGreaterThan(0.2);
    expect(newAdsr.decay).toBe(0.3);
    expect(newAdsr.sustain).toBe(0.8);
    expect(newAdsr.release).toBe(1.5);

    expect(envelopeSpy).toHaveBeenCalledWith(robot.id, newAdsr);
    expect(reReserveSpy).not.toHaveBeenCalled();
  });

  it('a Sustain edit converts the displayed percent back to the stored 0..1 value', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    vi.spyOn(AudioEngine, 'updateVoiceEnvelope').mockImplementation(() => {});
    render(<PingContourDrawer robot={robot} />);

    const sustainSlider = screen.getByRole('slider', { name: /sustain/i });
    fireEvent.keyDown(sustainSlider, { key: 'ArrowLeft' });

    const [, , update] = updateSpy.mock.calls[0];
    const newAdsr = (update as Partial<Robot>).audioAttributes!.adsr;
    // Moved down from 80% by at least one step, still stored as a 0..1 fraction
    expect(newAdsr.sustain).toBeLessThan(0.8);
    expect(newAdsr.sustain).toBeGreaterThanOrEqual(0);
  });

  it('wraps its controls in exactly one AccordionContainer', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    render(<PingContourDrawer robot={robot} />);
    expect(screen.getAllByText('Ping Contour')).toHaveLength(1);
  });
});
