import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';

import { SignatureArrayDrawer, type SignatureArrayValue } from './SignatureArrayDrawer';
import type { OscillatorLayer } from '@/types/layeredAudio';
import type { Robot } from '@/types/Robot';

function makeLayers(): OscillatorLayer[] {
  return [
    { type: 'sine', gain: 1, detune: 0, phase: 0, active: true },
    { type: 'square', gain: 0.8, detune: 5, phase: 10, pulseWidth: 0.4, active: true },
    { type: 'triangle', gain: 0.6, detune: -5, phase: 20, active: false },
  ];
}

function makeValue(overrides: Partial<SignatureArrayValue> = {}): SignatureArrayValue {
  return { layers: makeLayers(), ...overrides };
}

function layerSection(container: HTMLElement, key: 'layer0' | 'layer1' | 'layer2') {
  const el = container.querySelector(`[data-layer-key="${key}"]`);
  if (!el) throw new Error(`no section for ${key}`);
  return el as HTMLElement;
}

const noop = { onContinuousChange: () => {}, onStructuralChange: () => {}, onLfoChange: () => {} };

describe('SignatureArrayDrawer', () => {
  it('renders exactly 3 layer sections, in Baseline/Coaxial/Harmonic order', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
    const sections = container.querySelectorAll('[data-layer-key]');
    expect(sections).toHaveLength(3);
    expect(Array.from(sections).map((s) => s.getAttribute('data-layer-key'))).toEqual(['layer0', 'layer1', 'layer2']);
  });

  it('Baseline has no Active toggle; Coaxial and Harmonic each do', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);

    expect(within(layerSection(container, 'layer0')).queryByRole('switch', { name: 'Baseline Active' })).toBeNull();
    expect(within(layerSection(container, 'layer1')).getByRole('switch', { name: 'Coaxial Active' })).toBeTruthy();
    expect(within(layerSection(container, 'layer2')).getByRole('switch', { name: 'Harmonic Active' })).toBeTruthy();
  });

  it('each layer\'s Type radio has exactly the 5 waveform options, no Noise', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);

    (['layer0', 'layer1', 'layer2'] as const).forEach((key) => {
      const typeGroup = layerSection(container, key).querySelector<HTMLElement>('.sc-radio-button')!;
      const options = within(typeGroup).getAllByRole('radio').map((r) => r.getAttribute('aria-label'));
      expect(options.sort()).toEqual(['BINARY', 'BURST', 'GRADIENT', 'KINETIC', 'SWEEP'].sort());
    });
  });

  it('shows Interval only for Burst(pulse) layers', () => {
    const layers = makeLayers();
    layers[1] = { ...layers[1], type: 'pulse' };
    const { container } = render(<SignatureArrayDrawer value={makeValue({ layers })} {...noop} />);

    expect(within(layerSection(container, 'layer0')).queryByText(/Interval/i)).toBeNull();
    expect(within(layerSection(container, 'layer1')).getByText(/Interval/i)).toBeTruthy();
  });

  it('hides Interval for Binary(square) layers', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />); // layer1 is 'square'

    expect(within(layerSection(container, 'layer1')).queryByText(/Interval/i)).toBeNull();
  });

  it('a Type change calls onStructuralChange, not onContinuousChange', () => {
    const onStructuralChange = vi.fn();
    const onContinuousChange = vi.fn();
    const { container } = render(
      <SignatureArrayDrawer value={makeValue()} onContinuousChange={onContinuousChange} onStructuralChange={onStructuralChange} onLfoChange={() => {}} />
    );

    fireEvent.click(within(layerSection(container, 'layer0')).getByRole('radio', { name: 'GRADIENT' }));

    expect(onStructuralChange).toHaveBeenCalled();
    expect(onContinuousChange).not.toHaveBeenCalled();
    const newLayers = onStructuralChange.mock.calls[0][0] as OscillatorLayer[];
    expect(newLayers[0].type).toBe('triangle'); // 'GRADIENT' label -> 'triangle' value, per robotOptionsConfig.ts
  });

  it('a Gain change calls onContinuousChange, not onStructuralChange', () => {
    const onStructuralChange = vi.fn();
    const onContinuousChange = vi.fn();
    const { container } = render(
      <SignatureArrayDrawer value={makeValue()} onContinuousChange={onContinuousChange} onStructuralChange={onStructuralChange} onLfoChange={() => {}} />
    );

    fireEvent.keyDown(within(layerSection(container, 'layer0')).getByRole('slider', { name: /gain/i }), { key: 'ArrowRight' });

    expect(onContinuousChange).toHaveBeenCalled();
    expect(onStructuralChange).not.toHaveBeenCalled();
  });

  it('toggling Coaxial\'s Active off calls onStructuralChange, keeping its Type/Gain values, not cleared', () => {
    const onStructuralChange = vi.fn();
    const { container } = render(
      <SignatureArrayDrawer value={makeValue()} onContinuousChange={() => {}} onStructuralChange={onStructuralChange} onLfoChange={() => {}} />
    );

    fireEvent.click(within(layerSection(container, 'layer1')).getByRole('switch', { name: 'Coaxial Active' }));

    expect(onStructuralChange).toHaveBeenCalled();
    const newLayers = onStructuralChange.mock.calls[0][0] as OscillatorLayer[];
    expect(newLayers[1].active).toBe(false);
    expect(newLayers[1].type).toBe('square'); // config preserved, not cleared/reset
    expect(newLayers[1].gain).toBe(0.8);
  });

  it('each LFO-flagged param wires onLfoChange with the right target', () => {
    const onLfoChange = vi.fn();
    const value = makeValue({
      lfoSettings: { 'layer0.gain': { shape: 'sine', rate: 1, depth: 10, active: false } } as unknown as Robot['lfoSettings'],
    });
    const { container } = render(
      <SignatureArrayDrawer value={value} onContinuousChange={() => {}} onStructuralChange={() => {}} onLfoChange={onLfoChange} />
    );

    const gainLfoToggle = within(layerSection(container, 'layer0')).getAllByRole('switch', { name: /active/i })[0];
    fireEvent.click(gainLfoToggle);

    expect(onLfoChange).toHaveBeenCalledWith('layer0.gain', { shape: 'sine', rate: 1, depth: 10, active: true });
  });

  it('disables every internal control when disabled is true', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} disabled />);

    const baseline = layerSection(container, 'layer0');
    expect(within(baseline).getByRole('radio', { name: 'GRADIENT' }).getAttribute('data-disabled')).toBe('');
    expect(within(baseline).getByRole('slider', { name: /gain/i }).getAttribute('data-disabled')).toBe('');
    expect((within(layerSection(container, 'layer1')).getByRole('switch', { name: 'Coaxial Active' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
