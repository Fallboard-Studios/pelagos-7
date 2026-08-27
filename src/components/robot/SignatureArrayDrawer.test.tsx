import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';

import { SignatureArrayDrawer } from './SignatureArrayDrawer';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { AudioEngine } from '@/engine/AudioEngine';
import { lfoEngine } from '@/engine/lfoEngine';
import type { Robot } from '@/types/Robot';
import type { OscillatorLayer } from '@/types/layeredAudio';
import type { Locale } from '@/types/locale';

vi.mock('@/engine/lfoEngine', () => ({
  lfoEngine: {
    connectLfoTarget: vi.fn(() => true),
    disconnectLfoTarget: vi.fn(),
    setLfoRate: vi.fn(),
    setLfoDepth: vi.fn(),
    setLfoShape: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

function makeLayers(): OscillatorLayer[] {
  return [
    { type: 'sine', gain: 1, detune: 0, phase: 0, active: true },
    { type: 'square', gain: 0.8, detune: 5, phase: 10, pulseWidth: 0.4, active: true },
    { type: 'triangle', gain: 0.6, detune: -5, phase: 20, active: false },
  ];
}

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
      layers: makeLayers(),
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 100,
    ...overrides,
  } as Robot;
}

function layerSection(container: HTMLElement, key: 'layer0' | 'layer1' | 'layer2') {
  const el = container.querySelector(`[data-layer-key="${key}"]`);
  if (!el) throw new Error(`no section for ${key}`);
  return el as HTMLElement;
}

describe('SignatureArrayDrawer', () => {
  const localeId = getActiveLocaleId();

  beforeEach(() => {
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  it('renders exactly 3 layer sections, in Baseline/Coaxial/Harmonic order', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<SignatureArrayDrawer robot={robot} />);
    const sections = container.querySelectorAll('[data-layer-key]');
    expect(sections).toHaveLength(3);
    expect(Array.from(sections).map((s) => s.getAttribute('data-layer-key'))).toEqual(['layer0', 'layer1', 'layer2']);
  });

  it('Baseline has no Active toggle; Coaxial and Harmonic each do', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    // 'Active' alone is ambiguous per-layer: each LFO frame also has its own generic 'Active'
    // toggle (Lfo.tsx), always mounted via Radix's Accordion forceMount — the layer's own toggle
    // has a distinguishing '<Label> Active' name.
    expect(within(layerSection(container, 'layer0')).queryByRole('switch', { name: 'Baseline Active' })).toBeNull();
    expect(within(layerSection(container, 'layer1')).getByRole('switch', { name: 'Coaxial Active' })).toBeTruthy();
    expect(within(layerSection(container, 'layer2')).getByRole('switch', { name: 'Harmonic Active' })).toBeTruthy();
  });

  it('each layer\'s Type radio has exactly the 5 waveform options, no Noise', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    (['layer0', 'layer1', 'layer2'] as const).forEach((key) => {
      // Type is always the first .sc-radio-button rendered per layer — every LFO frame's own
      // Shape RadioButton (also .sc-radio-button, 4 TRIANGLE/SINE/SQUARE/SAWTOOTH options) comes
      // after it, so scoping to the first one isolates Type's own 5 options.
      const typeGroup = layerSection(container, key).querySelector<HTMLElement>('.sc-radio-button')!;
      const options = within(typeGroup).getAllByRole('radio').map((r) => r.getAttribute('aria-label'));
      expect(options.sort()).toEqual(['BINARY', 'BURST', 'GRADIENT', 'KINETIC', 'SWEEP'].sort());
    });
  });

  it('shows Interval only for Burst(pulse) layers', () => {
    // Not 'square' too — Tone.js's OmniOscillator.width getter returns undefined for any type
    // other than 'pulse' (verified against node_modules/tone/build/esm/source/oscillator/
    // OmniOscillator.js). AudioEngine's own pulseWidth LFO gate already knows this
    // (getRobotModulationTarget: `if (layerEntry.layer.type !== 'pulse') return null`) — showing
    // an editable Interval slider for Binary/square was a control that silently did nothing.
    const layers = makeLayers();
    layers[1] = { ...layers[1], type: 'pulse' };
    const robot = makeRobot({ audioAttributes: { ...makeRobot().audioAttributes, layers } });
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    // layer0 is sine -> no Interval slider
    expect(within(layerSection(container, 'layer0')).queryByText(/Interval/i)).toBeNull();
    // layer1 is pulse -> has Interval slider
    expect(within(layerSection(container, 'layer1')).getByText(/Interval/i)).toBeTruthy();
  });

  it('hides Interval for Binary(square) layers — Tone.js has no width param outside \'pulse\', so it would silently do nothing', () => {
    const robot = makeRobot(); // layer1 is 'square' per makeLayers()
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    expect(within(layerSection(container, 'layer1')).queryByText(/Interval/i)).toBeNull();
  });

  it('a Type change calls AudioEngine.reReserveVoice (structural)', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const reReserveSpy = vi.spyOn(AudioEngine, 'reReserveVoice').mockImplementation(() => true);
    const continuousSpy = vi.spyOn(AudioEngine, 'updateVoiceLayerParams').mockImplementation(() => {});
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    const baselineTypeRadio = within(layerSection(container, 'layer0')).getByRole('radio', { name: 'GRADIENT' });
    fireEvent.click(baselineTypeRadio);

    expect(reReserveSpy).toHaveBeenCalledWith(robot.id);
    expect(continuousSpy).not.toHaveBeenCalled();
  });

  it('a Gain change calls AudioEngine.updateVoiceLayerParams (continuous), not reReserveVoice', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const reReserveSpy = vi.spyOn(AudioEngine, 'reReserveVoice').mockImplementation(() => true);
    const continuousSpy = vi.spyOn(AudioEngine, 'updateVoiceLayerParams').mockImplementation(() => {});
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    const baselineGainSlider = within(layerSection(container, 'layer0')).getByRole('slider', { name: /gain/i });
    fireEvent.keyDown(baselineGainSlider, { key: 'ArrowRight' });

    expect(continuousSpy).toHaveBeenCalled();
    expect(reReserveSpy).not.toHaveBeenCalled();
  });

  it('toggling Coaxial\'s Active off calls reReserveVoice and keeps its Type/Gain values rendered, not cleared', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    const reReserveSpy = vi.spyOn(AudioEngine, 'reReserveVoice').mockImplementation(() => true);
    const updateSpy = vi.spyOn(useLocaleStore.getState(), 'updateRobot');
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    const coaxialActiveToggle = within(layerSection(container, 'layer1')).getByRole('switch', { name: 'Coaxial Active' });
    fireEvent.click(coaxialActiveToggle);

    expect(reReserveSpy).toHaveBeenCalledWith(robot.id);
    const [, , update] = updateSpy.mock.calls[updateSpy.mock.calls.length - 1];
    const newLayers = (update as Partial<Robot>).audioAttributes!.layers!;
    expect(newLayers[1].active).toBe(false);
    expect(newLayers[1].type).toBe('square'); // config preserved, not cleared/reset
    expect(newLayers[1].gain).toBe(0.8);

    // Still rendered with its existing values after the (mocked, non-reactive) click
    expect(within(layerSection(container, 'layer1')).getByRole('radio', { name: 'BINARY', checked: true })).toBeTruthy();
  });

  it('each LFO-flagged param wires to robot.lfoSettings[\'layerN.field\'] and connects on activation', () => {
    const robot = makeRobot({
      lfoSettings: {
        'layer0.gain': { shape: 'sine', rate: 1, depth: 10, active: false },
      } as unknown as Robot['lfoSettings'],
    });
    useLocaleStore.getState().addRobot(localeId, robot);
    const { container } = render(<SignatureArrayDrawer robot={robot} />);

    const gainLfoToggle = within(layerSection(container, 'layer0')).getAllByRole('switch', { name: /active/i })[0];
    fireEvent.click(gainLfoToggle);

    expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('layer0.gain', robot.id);
    expect(lfoEngine.start).toHaveBeenCalledWith('layer0.gain', robot.id);
  });
});
