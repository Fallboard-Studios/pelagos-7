import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within, waitFor, act } from '@testing-library/react';

// Same reasoning as AudioRigDrawer.test.tsx: the shared vitest.setup.ts GSAP mock's timeline
// object has no kill() method, and useLfoTargetGroup's unmount/reselect cleanup calls
// killTimeline on an already-registered entry — mock timelineMap directly, matching
// AccordionContainer.test.tsx's own established convention.
vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

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

  it('defaults each layer\'s shared LFO display to its first field (Gain) and wires onLfoChange to it', () => {
    const onLfoChange = vi.fn();
    const value = makeValue({
      lfoSettings: { 'layer0.gain': { shape: 'sine', rate: 1, depth: 10, active: false } } as unknown as Robot['lfoSettings'],
    });
    const { container } = render(
      <SignatureArrayDrawer value={value} onContinuousChange={() => {}} onStructuralChange={() => {}} onLfoChange={onLfoChange} />
    );

    const gainLfoToggle = within(layerSection(container, 'layer0')).getByRole('switch', { name: 'Active' });
    fireEvent.click(gainLfoToggle);

    expect(onLfoChange).toHaveBeenCalledWith('layer0.gain', { shape: 'sine', rate: 1, depth: 10, active: true });
  });

  describe('shared LFO display (LFO_CONSOLIDATED_DISPLAY — replaces the old per-param nested accordion)', () => {
    it('renders exactly one shared LFO display per layer — 3 total, never one per param', () => {
      const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
      // 'Active' (exact) is the shared display's own toggle; layer-level toggles are named
      // 'Coaxial Active'/'Harmonic Active', so this can't double-count them.
      expect(within(container).getAllByRole('switch', { name: 'Active' })).toHaveLength(3);
    });

    it('renders no accordion anywhere except the drawer\'s own single Signature Array wrapper — no nested "Modulation" accordion per param', () => {
      const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
      expect(container.querySelectorAll('.sc-accordion')).toHaveLength(1);
    });

    it('the Type radio renders inline among the layer\'s other controls, not inside the shared LFO group\'s row targeting', () => {
      const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
      const typeRadio = within(layerSection(container, 'layer0')).getByRole('radio', { name: 'GRADIENT' });
      expect(typeRadio.closest('.sc-lfo-target-group__row')).toBeNull();
    });

    it('clicking a different param\'s row switches which target the shared display edits, once the transition completes', async () => {
      const onLfoChange = vi.fn();
      const { container } = render(
        <SignatureArrayDrawer value={makeValue()} onContinuousChange={() => {}} onStructuralChange={() => {}} onLfoChange={onLfoChange} />
      );
      const detuneSlider = within(layerSection(container, 'layer0')).getByRole('slider', { name: /detune/i });
      const detuneRow = detuneSlider.closest('.sc-lfo-target-group__row')!;

      await act(async () => {
        fireEvent.click(detuneRow);
      });
      await waitFor(() => {
        expect(detuneRow.classList.contains('isActive')).toBe(true);
      });

      const activeToggle = within(layerSection(container, 'layer0')).getByRole('switch', { name: 'Active' });
      fireEvent.click(activeToggle);
      expect(onLfoChange.mock.calls[0][0]).toBe('layer0.detune');
    });

    it('toggling a layer\'s type to pulse shows the Interval row in that layer\'s shared group', () => {
      const layers = makeLayers();
      layers[1] = { ...layers[1], type: 'pulse' };
      const { container } = render(<SignatureArrayDrawer value={makeValue({ layers })} {...noop} />);
      const intervalSlider = within(layerSection(container, 'layer1')).getByRole('slider', { name: /interval/i });
      expect(intervalSlider.closest('.sc-lfo-target-group__row')).not.toBeNull();
    });

    it('falls back to the first remaining field without erroring when the targeted Interval row disappears (type leaves pulse)', async () => {
      const layers = makeLayers();
      layers[1] = { ...layers[1], type: 'pulse' };
      const value = makeValue({ layers });
      const onLfoChange = vi.fn();
      const { container, rerender } = render(
        <SignatureArrayDrawer value={value} onContinuousChange={() => {}} onStructuralChange={() => {}} onLfoChange={onLfoChange} />
      );

      // Target Interval (the last field) before it disappears.
      const intervalRow = within(layerSection(container, 'layer1')).getByRole('slider', { name: /interval/i }).closest('.sc-lfo-target-group__row')!;
      await act(async () => {
        fireEvent.click(intervalRow);
      });
      await waitFor(() => expect(intervalRow.classList.contains('isActive')).toBe(true));

      // Type leaves 'pulse' — Interval's row disappears from the DOM entirely.
      const layersWithoutPulse = layers.map((l, i) => (i === 1 ? { ...l, type: 'square' as const } : l));
      rerender(
        <SignatureArrayDrawer
          value={makeValue({ layers: layersWithoutPulse })}
          onContinuousChange={() => {}}
          onStructuralChange={() => {}}
          onLfoChange={onLfoChange}
        />
      );

      expect(within(layerSection(container, 'layer1')).queryByText(/Interval/i)).toBeNull();
      // Falls back to Gain (layer1's first field) — no crash, and the shared display still works.
      const activeToggle = within(layerSection(container, 'layer1')).getByRole('switch', { name: 'Active' });
      fireEvent.click(activeToggle);
      expect(onLfoChange.mock.calls.at(-1)?.[0]).toBe('layer1.gain');
    });

    it('resolves a company-mode-shaped (partial) lfoSettings value the same way for every layer, unchanged from before consolidation', () => {
      const onLfoChange = vi.fn();
      const value = makeValue({
        // Only layer2's phase has been broadcast-edited — every other target falls back to
        // DEFAULT_LFO_SETTINGS, exactly as CompanyOptionsSection's own resolved snapshot does.
        lfoSettings: { 'layer2.phase': { shape: 'square', rate: 3, depth: 25, active: true } } as unknown as Robot['lfoSettings'],
      });
      const { container } = render(
        <SignatureArrayDrawer value={value} onContinuousChange={() => {}} onStructuralChange={() => {}} onLfoChange={onLfoChange} />
      );

      // layer2's shared display defaults to Gain (unaffected by the partial lfoSettings), so
      // this just proves no crash and normal default-fallback resolution across every layer.
      const activeToggle = within(layerSection(container, 'layer2')).getByRole('switch', { name: 'Active' });
      fireEvent.click(activeToggle);
      expect(onLfoChange).toHaveBeenCalledWith('layer2.gain', expect.objectContaining({ active: true }));
    });
  });

  it('disables every internal control when disabled is true', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} disabled />);

    const baseline = layerSection(container, 'layer0');
    expect(within(baseline).getByRole('radio', { name: 'GRADIENT' }).getAttribute('data-disabled')).toBe('');
    expect(within(baseline).getByRole('slider', { name: /gain/i }).getAttribute('data-disabled')).toBe('');
    expect((within(layerSection(container, 'layer1')).getByRole('switch', { name: 'Coaxial Active' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
