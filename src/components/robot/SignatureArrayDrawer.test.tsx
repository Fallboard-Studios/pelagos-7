import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';

// Same reasoning as AudioRigDrawer.test.tsx: the shared vitest.setup.ts GSAP mock's timeline
// object has no kill() method, and useLfoTargetGroup's unmount/reselect cleanup calls
// killTimeline on an already-registered entry — mock timelineMap directly, matching
// AccordionContainer.test.tsx's own established convention.
vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

// The Robot Drift panel (docs/tasks/DIRECTIONAL_PANEL_WIRING.md "some fixes" follow-up) reads/
// writes the global lfoDrift.robots slice directly via useAudioStore, whose setGlobalLfoDrift
// calls into lfoEngine — same real-AudioContext-throws-in-jsdom concern AudioRigDrawer.test.tsx
// already works around by mocking this module.
vi.mock('@/engine/lfoEngine', () => ({
  lfoEngine: {
    setGlobalRateDrift: vi.fn(),
    setGlobalDepthDrift: vi.fn(),
  },
}));

import { SignatureArrayDrawer, type SignatureArrayValue } from './SignatureArrayDrawer';
import { useAudioStore } from '@/stores/audioStore';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';
import type { OscillatorLayer } from '@/types/layeredAudio';
import type { Robot } from '@/types/Robot';

function makeLayers(): OscillatorLayer[] {
  return [
    { type: 'sine', gain: 1, detune: 0, phase: 0 },
    { type: 'square', gain: 0.8, detune: 5, phase: 10, pulseWidth: 0.4 },
    { type: 'triangle', gain: 0.6, detune: -5, phase: 20 },
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
  beforeEach(() => {
    // Robot Drift reads/writes the real global store directly (it's not part of this
    // component's own `value` prop) — reset it so one test's edit can't leak into the next.
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, lfoDrift: { ...DEFAULT_GLOBAL_AUDIO_SETTINGS.lfoDrift } },
    }));
  });

  it('renders exactly 3 layer sections, in Baseline/Coaxial/Harmonic order', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
    const sections = container.querySelectorAll('[data-layer-key]');
    expect(sections).toHaveLength(3);
    expect(Array.from(sections).map((s) => s.getAttribute('data-layer-key'))).toEqual(['layer0', 'layer1', 'layer2']);
  });

  it('wraps its content in one Source accordion containing 4 panels — Robot Drift, then Baseline/Coaxial/Harmonic, in order (DIRECTIONAL_PANEL_WIRING Task 8 + Robot Drift follow-up)', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
    expect(container.querySelectorAll('.sc-accordion')).toHaveLength(1);
    expect(container.querySelector('.sc-accordion')?.textContent).toContain('Source');
    const panels = Array.from(container.querySelectorAll('.sc-accordion .sc-directional-panel'));
    expect(panels).toHaveLength(4);
    // Each panel's own label is its direct-child DualLabel — not the many nested DualLabels
    // every RadioButton/slider/LFO field inside it also renders for its own humanLabel.
    const panelLabels = panels.map((p) => p.querySelector(':scope > .sc-dual-label > .sc-dual-label__human')?.textContent);
    expect(panelLabels).toEqual(['Robot Drift', 'Baseline', 'Coaxial', 'Harmonic']);
  });

  describe('Robot Drift panel (moved from AudioRigDrawer\'s Transport & Composition — global lfoDrift.robots, read/written directly via useAudioStore)', () => {
    it('renders as the first panel in the Source accordion, before Baseline', () => {
      const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
      const driftPanel = screen.getByText('Robot Drift').closest('.sc-directional-panel');
      const baselinePanel = screen.getByText('Baseline').closest('.sc-directional-panel');
      expect(driftPanel).not.toBeNull();
      expect(driftPanel!.compareDocumentPosition(baselinePanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // Not nested inside — or replacing — any of the 3 layer sections.
      expect(container.querySelector('[data-layer-key]')?.contains(driftPanel)).toBe(false);
    });

    it('shows the store\'s current lfoDrift.robots values as a -100..100 percent, not the internal -1..1 fraction', () => {
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, lfoDrift: { ...s.globalAudio.lfoDrift, robots: { rateDrift: -0.2, depthDrift: 0.9 } } },
      }));
      render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
      const driftPanel = screen.getByText('Robot Drift').closest('.sc-directional-panel') as HTMLElement;
      expect(within(driftPanel).getByRole('slider', { name: 'Rate Drift' }).getAttribute('aria-valuenow')).toBe('-20');
      expect(within(driftPanel).getByRole('slider', { name: 'Depth Drift' }).getAttribute('aria-valuenow')).toBe('90');
    });

    it('dragging Rate Drift calls the store\'s setGlobalLfoDrift with \'robots\' and the dragged percent divided by 100', () => {
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, lfoDrift: { ...s.globalAudio.lfoDrift, robots: { rateDrift: 0, depthDrift: 0.5 } } },
      }));
      render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
      const driftPanel = screen.getByText('Robot Drift').closest('.sc-directional-panel') as HTMLElement;
      const rateSlider = within(driftPanel).getByRole('slider', { name: 'Rate Drift' });
      rateSlider.focus();
      fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });

      const newPercent = Number(rateSlider.getAttribute('aria-valuenow'));
      expect(newPercent).not.toBe(0);
      expect(useAudioStore.getState().globalAudio.lfoDrift.robots.rateDrift).toBeCloseTo(newPercent / 100);
      expect(useAudioStore.getState().globalAudio.lfoDrift.robots.depthDrift).toBe(0.5); // untouched
    });

    it('renders identically regardless of the drawer\'s own `disabled` prop — a global control, not scoped to the selected robot/company', () => {
      render(<SignatureArrayDrawer value={makeValue()} {...noop} disabled />);
      const driftPanel = screen.getByText('Robot Drift').closest('.sc-directional-panel') as HTMLElement;
      expect(within(driftPanel).getByRole('slider', { name: 'Rate Drift' }).getAttribute('data-disabled')).toBeNull();
      expect(within(driftPanel).getByRole('slider', { name: 'Depth Drift' }).getAttribute('data-disabled')).toBeNull();
    });
  });

  it("each layer's data-layer-key div is nested inside its own DirectionalPanel — wrapped around, not replaced", () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
    (['layer0', 'layer1', 'layer2'] as const).forEach((key) => {
      const layerDiv = layerSection(container, key);
      expect(layerDiv.closest('.sc-directional-panel')).not.toBeNull();
    });
  });

  it('renders no Active toggle anywhere — muting is expressed via each layer\'s own Gain slider instead', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);

    expect(within(container).queryAllByRole('switch')).toHaveLength(0);
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

  it('dragging Coaxial\'s Gain to 0 calls onContinuousChange (not onStructuralChange), keeping its Type/Detune/Phase values, not cleared', () => {
    const onContinuousChange = vi.fn();
    const onStructuralChange = vi.fn();
    const { container } = render(
      <SignatureArrayDrawer value={makeValue()} onContinuousChange={onContinuousChange} onStructuralChange={onStructuralChange} onLfoChange={() => {}} />
    );

    const coaxialGain = within(layerSection(container, 'layer1')).getByRole('slider', { name: 'Coaxial Gain' });
    coaxialGain.focus();
    fireEvent.keyDown(coaxialGain, { key: 'Home' }); // Radix's own jump-to-min key — lands exactly on 0

    expect(onStructuralChange).not.toHaveBeenCalled();
    expect(onContinuousChange).toHaveBeenCalled();
    const newLayers = onContinuousChange.mock.calls.at(-1)![0] as OscillatorLayer[];
    expect(newLayers[1].gain).toBe(0);
    expect(newLayers[1].type).toBe('square'); // config preserved, not cleared/reset
    expect(newLayers[1].detune).toBe(5);
    expect(newLayers[1].phase).toBe(10);
  });

  it('defaults each layer\'s shared LFO display to its first field (Gain) and wires onLfoChange to it', () => {
    const onLfoChange = vi.fn();
    const value = makeValue({
      lfoSettings: { 'layer0.gain': { shape: 'sine', rate: 1, depth: 10 } } as unknown as Robot['lfoSettings'],
    });
    const { container } = render(
      <SignatureArrayDrawer value={value} onContinuousChange={() => {}} onStructuralChange={() => {}} onLfoChange={onLfoChange} />
    );

    const gainLfoRate = within(layerSection(container, 'layer0')).getByRole('slider', { name: 'Rate' });
    gainLfoRate.focus();
    fireEvent.keyDown(gainLfoRate, { key: 'ArrowRight' });

    expect(onLfoChange).toHaveBeenCalledWith('layer0.gain', { shape: 'sine', rate: 1.25, depth: 10 });
  });

  describe('shared LFO display (LFO_CONSOLIDATED_DISPLAY — replaces the old per-param nested accordion)', () => {
    it('renders exactly one shared LFO display per layer — 3 total, never one per param', () => {
      const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} />);
      expect(container.querySelectorAll('.sc-lfo')).toHaveLength(3);
    });

    it('renders no accordion anywhere except the drawer\'s own single Source wrapper — no nested "Modulation" accordion per param', () => {
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

      const rateSlider = within(layerSection(container, 'layer0')).getByRole('slider', { name: 'Rate' });
      rateSlider.focus();
      fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });
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
      const rateSlider = within(layerSection(container, 'layer1')).getByRole('slider', { name: 'Rate' });
      rateSlider.focus();
      fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });
      expect(onLfoChange.mock.calls.at(-1)?.[0]).toBe('layer1.gain');
    });

    it('resolves a company-mode-shaped (partial) lfoSettings value the same way for every layer, unchanged from before consolidation', () => {
      const onLfoChange = vi.fn();
      const value = makeValue({
        // Only layer2's phase has been broadcast-edited — every other target falls back to
        // DEFAULT_LFO_SETTINGS, exactly as CompanyOptionsSection's own resolved snapshot does.
        lfoSettings: { 'layer2.phase': { shape: 'square', rate: 3, depth: 25 } } as unknown as Robot['lfoSettings'],
      });
      const { container } = render(
        <SignatureArrayDrawer value={value} onContinuousChange={() => {}} onStructuralChange={() => {}} onLfoChange={onLfoChange} />
      );

      // layer2's shared display defaults to Gain (unaffected by the partial lfoSettings), so
      // this just proves no crash and normal default-fallback resolution across every layer.
      const rateSlider = within(layerSection(container, 'layer2')).getByRole('slider', { name: 'Rate' });
      rateSlider.focus();
      fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });
      expect(onLfoChange).toHaveBeenCalledWith('layer2.gain', expect.objectContaining({ rate: expect.any(Number) }));
    });
  });

  it('disables every internal control when disabled is true', () => {
    const { container } = render(<SignatureArrayDrawer value={makeValue()} {...noop} disabled />);

    const baseline = layerSection(container, 'layer0');
    expect(within(baseline).getByRole('radio', { name: 'GRADIENT' }).getAttribute('data-disabled')).toBe('');
    expect(within(baseline).getByRole('slider', { name: /gain/i }).getAttribute('data-disabled')).toBe('');
    expect(within(layerSection(container, 'layer1')).getByRole('slider', { name: 'Coaxial Gain' }).getAttribute('data-disabled')).toBe('');
  });
});
