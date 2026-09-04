import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, fireEvent, waitFor, act } from '@testing-library/react';

// Real lfoEngine would construct a real Tone.LFO on first setter call
// (getOrCreateLfo -> new Tone.LFO(...)), which throws without a real
// AudioContext — the same class of bug fixed in Tasks 8/9. Mocked here so
// setGlobalLfo's own Zustand-state-update logic still runs for real, but its
// calls into lfoEngine land on mocks instead.
// The shared GSAP mock in vitest.setup.ts returns a timeline object with no kill() method —
// fine for AccordionContainer's own tests (which mock timelineMap directly, same as here) but
// this file never used to exercise a same-key double-kill until useLfoTargetGroup's own
// unmount/reselect cleanup started calling killTimeline on an already-registered entry.
// Matches AccordionContainer.test.tsx's own convention for exactly this reason.
vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

vi.mock('../../../../engine/lfoEngine', () => ({
  lfoEngine: {
    getLfoSettings: vi.fn(),
    setLfoRate: vi.fn(),
    setLfoDepth: vi.fn(),
    setLfoShape: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    connectLfoTarget: vi.fn(() => true),
    disconnectLfoTarget: vi.fn(),
    setGlobalRateDrift: vi.fn(),
    setGlobalDepthDrift: vi.fn(),
  },
}));

import { AudioRigDrawer } from './AudioRigDrawer';
import { useAudioStore } from '@/stores/audioStore';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import { GLOBAL_LFO_TARGET_IDS, type GlobalLfoTargetId } from '@/types/lfo';

function resetAudioStore() {
  const globalLfo = {} as Record<GlobalLfoTargetId, ReturnType<typeof buildLfoValue>>;
  for (const target of GLOBAL_LFO_TARGET_IDS) globalLfo[target] = buildLfoValue(target);
  useAudioStore.setState({ globalAudio: { ...DEFAULT_GLOBAL_AUDIO_SETTINGS }, globalLfo });
}

function buildLfoValue(target: GlobalLfoTargetId) {
  return { ...DEFAULT_LFO_SETTINGS[target] };
}

describe('AudioRigDrawer', () => {
  beforeEach(() => {
    resetAudioStore();
  });

  it('renders exactly 4 top-level accordions, in Transport & Composition / EQ & Filters / Time & Space / Output order (DirectionalPanel wiring)', () => {
    const { container } = render(<AudioRigDrawer />);
    const topLevelAccordions = [...container.querySelector('.audio-rig-drawer')!.children]
      .filter((el) => el.classList.contains('sc-accordion'));
    expect(topLevelAccordions.map((el) => el.querySelector('.sc-dual-label__human')?.textContent)).toEqual([
      'Transport & Composition', 'EQ & Filters', 'Time & Space', 'Output',
    ]);
  });

  it('renders each old effect block\'s label as a DirectionalPanel nested inside its new top-level accordion — no longer its own accordion', () => {
    render(<AudioRigDrawer />);
    for (const label of ['3-Band EQ', 'Low-Pass Filter', 'High-Pass Filter', 'Delay', 'Reverb', 'Compressor', 'Limiter']) {
      const labelEl = screen.getByText(label);
      expect(labelEl.closest('button'), label).toBeNull(); // not an accordion trigger anymore
      const panel = labelEl.closest('.sc-directional-panel');
      expect(panel, label).not.toBeNull();
      expect(panel!.closest('.sc-accordion'), label).not.toBeNull();
    }
  });

  it('keeps the existing bordered effect-block wrapper around each block\'s panel, now one level deeper than before', () => {
    render(<AudioRigDrawer />);
    for (const label of ['3-Band EQ', 'Low-Pass Filter', 'High-Pass Filter', 'Delay', 'Reverb', 'Compressor', 'Limiter']) {
      const panel = screen.getByText(label).closest('.sc-directional-panel')!;
      expect(panel.closest('.audio-rig-drawer__effect-block'), label).not.toBeNull();
    }
  });

  it('3-Band EQ renders as a row-orientation panel; every other effect block is column', () => {
    render(<AudioRigDrawer />);
    const eqPanel = screen.getByText('3-Band EQ').closest('.sc-directional-panel') as HTMLElement;
    expect(eqPanel.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('row');
    for (const label of ['Low-Pass Filter', 'High-Pass Filter', 'Delay', 'Reverb', 'Compressor', 'Limiter']) {
      const panel = screen.getByText(label).closest('.sc-directional-panel')!;
      expect(panel.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation'), label).toBe('column');
    }
  });

  it('no longer renders a Chorus accordion', () => {
    render(<AudioRigDrawer />);
    expect(screen.queryByText('Chorus')).toBeNull();
  });

  it('renders a param control bound to its live store value', () => {
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, threshold: -12 } },
    }));
    render(<AudioRigDrawer />);
    // Compressor and Limiter both have a "Threshold" param — Compressor's
    // accordion renders first in the new chain order, so index [0] is its own.
    const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
    expect(thresholdSlider.getAttribute('aria-valuenow')).toBe('-12');
  });

  it('shows a visible numeric value for unitless params (Resonance/Q on LPF and HPF) — regression: the value text used to be hidden entirely when schema.unit was absent', () => {
    useAudioStore.setState((s) => ({
      globalAudio: {
        ...s.globalAudio,
        filterLPF: { ...s.globalAudio.filterLPF, Q: 5 },
        filterHPF: { ...s.globalAudio.filterHPF, Q: 8 },
      },
    }));
    render(<AudioRigDrawer />);
    // LPF and HPF both have a "Resonance" param — LPF's accordion renders first.
    const [lpfResonance, hpfResonance] = screen.getAllByRole('slider', { name: 'Resonance' });
    expect(lpfResonance.closest('.sc-slider-log')?.textContent).toContain('5');
    expect(hpfResonance.closest('.sc-slider-log')?.textContent).toContain('8');
  });

  it('dragging a param control calls setGlobalAudio with the right effect/field/value', () => {
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
    thresholdSlider.focus();
    fireEvent.keyDown(thresholdSlider, { key: 'ArrowRight' }); // default step 1, from default -24
    expect(useAudioStore.getState().globalAudio.compressor.threshold).toBe(-23);
  });

  it('a single arrow-key press on a Delay slider moves by a small increment, not straight to max — regression: sliderLinear schemas with a full range <= 1 and no explicit step used to act like toggles', () => {
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, delay: { ...s.globalAudio.delay, delayTime: 0.5 } },
    }));
    render(<AudioRigDrawer />);
    const delayTimeSlider = screen.getByRole('slider', { name: 'Time' });
    delayTimeSlider.focus();
    fireEvent.keyDown(delayTimeSlider, { key: 'ArrowRight' });

    const newValue = useAudioStore.getState().globalAudio.delay.delayTime;
    expect(newValue).toBeGreaterThan(0.5);
    expect(newValue).toBeLessThan(1); // must not jump straight to max in one press
  });

  it('renders no rig-wide bypass switch or per-effect Enabled toggles — removed, off states are expressed via the sliders themselves', () => {
    render(<AudioRigDrawer />);
    expect(screen.queryByRole('switch', { name: 'Bypass (this may be loud or distorted)' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Compressor Enabled' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Reverb Enabled' })).toBeNull();
  });

  it('every param control renders enabled — no drawer-level disabling concept left', () => {
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
    expect(thresholdSlider.getAttribute('data-disabled')).toBeNull();
  });

  describe('shared LFO display (LFO_CONSOLIDATED_DISPLAY — replaces the old nested per-slider accordion)', () => {
    it('renders exactly one shared LFO display per LFO-bearing block — 3 total (eq3, filterLPF, filterHPF), never one per param', () => {
      const { container } = render(<AudioRigDrawer />);
      // A plain count of the shared display's own root class also proves "not one per param" —
      // 7 GlobalLfoTargetId params would otherwise render 7.
      expect(container.querySelectorAll('.sc-lfo')).toHaveLength(3);
    });

    it('renders no shared LFO display for delay, reverb, compressor, or limiter — none of their params carry lfoTarget', () => {
      render(<AudioRigDrawer />);
      const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0]; // Compressor's
      const accordionContent = thresholdSlider.closest('.sc-accordion__content-inner');
      expect(accordionContent?.querySelector('.sc-lfo')).toBeNull();
    });

    it('renders no accordion nested inside eq3/filterLPF/filterHPF\'s own accordion — the shared display is plain content', () => {
      render(<AudioRigDrawer />);
      const eqAccordionContent = screen.getByRole('slider', { name: 'Low' }).closest('.sc-accordion__content-inner')!;
      expect(eqAccordionContent.querySelectorAll('.sc-accordion')).toHaveLength(0);
    });

    it('shows the targeted param\'s own name as the shared display\'s label, defaulting to the group\'s first param', () => {
      render(<AudioRigDrawer />);
      const eqAccordionContent = screen.getByRole('slider', { name: 'Low' }).closest('.sc-accordion__content-inner')!;
      expect(eqAccordionContent.querySelector('.sc-lfo')?.textContent).toContain('Low');
    });

    it('binds the default target (eq3.low) to its own globalLfo entry, not DEFAULT_LFO_SETTINGS', () => {
      useAudioStore.setState((s) => ({
        globalLfo: { ...s.globalLfo, 'eq3.low': { shape: 'square', rate: 5, depth: 60 } },
      }));
      render(<AudioRigDrawer />);

      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0];
      const depthSlider = screen.getAllByRole('slider', { name: 'Depth' })[0];

      expect(rateSlider.getAttribute('aria-valuenow')).toBe('5');
      expect(depthSlider.getAttribute('aria-valuenow')).toBe('60');
    });

    it('dragging the shared display\'s rate slider off 0 calls setGlobalLfo for the currently-targeted field (eq3.low by default)', () => {
      render(<AudioRigDrawer />);
      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0]; // eq3's shared display, defaulting to eq3.low
      expect(useAudioStore.getState().globalLfo['eq3.low'].rate).toBe(0);

      rateSlider.focus();
      fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });

      expect(useAudioStore.getState().globalLfo['eq3.low'].rate).toBeGreaterThan(0);
    });

    it('the shared LFO display is enabled by default — no parent-effect enabled/disabled concept left to gate it', () => {
      render(<AudioRigDrawer />);
      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0];
      expect(rateSlider.getAttribute('data-disabled')).toBeNull();
    });

    it('renders no status light on the parent EQ & Filters accordion — the feature was removed entirely', () => {
      render(<AudioRigDrawer />);
      const eqFiltersTrigger = screen.getByRole('button', { name: /EQ & Filters/i });
      expect(eqFiltersTrigger.querySelector('.sc-accordion__light')).toBeNull();
    });

    it('does not auto-open the parent EQ & Filters accordion just because eq3\'s LFO-tied target is active', () => {
      useAudioStore.setState((s) => ({
        globalLfo: { ...s.globalLfo, 'eq3.low': { shape: 'square', rate: 5, depth: 60 } },
      }));
      render(<AudioRigDrawer />);
      const eqFiltersTrigger = screen.getByRole('button', { name: /EQ & Filters/i });
      expect(eqFiltersTrigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('clicking a different band\'s row (click-around, not just the slider) marks that row targeted, once the transition completes', async () => {
      render(<AudioRigDrawer />);
      const midSlider = screen.getByRole('slider', { name: 'Mid' });
      const midRow = midSlider.closest('.sc-lfo-target-group__row')!;
      const lowRow = screen.getByRole('slider', { name: 'Low' }).closest('.sc-lfo-target-group__row')!;
      expect(lowRow.classList.contains('isActive')).toBe(true);

      fireEvent.click(midRow);

      await waitFor(() => {
        expect(midRow.classList.contains('isActive')).toBe(true);
      });
      expect(lowRow.classList.contains('isActive')).toBe(false);
    });

    it('keyboard-focusing a different band\'s slider switches which globalLfo entry the shared display edits, once the transition completes', async () => {
      render(<AudioRigDrawer />);
      const highSlider = screen.getByRole('slider', { name: 'High' });
      // Wrapped in an async act() so the transition's microtask-resolved onComplete (see
      // useLfoTargetGroup.ts's select()) is flushed before any assertion runs.
      await act(async () => {
        highSlider.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole('slider', { name: 'High' }).closest('.sc-lfo-target-group__row')?.classList.contains('isActive')).toBe(true);
      });

      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0];
      rateSlider.focus();
      fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });

      expect(useAudioStore.getState().globalLfo['eq3.high'].rate).toBeGreaterThan(0);
      expect(useAudioStore.getState().globalLfo['eq3.low'].rate).toBe(0);
    });
  });

  describe('Reverb (Task 11)', () => {
    it('renders no dampening slider — dead, removed', () => {
      render(<AudioRigDrawer />);
      expect(screen.queryByRole('slider', { name: 'Dampening' })).toBeNull();
    });
  });

  describe('Decay radio button', () => {
    it('renders both options, defaulting to Natural Decay selected (compressorBeforeDelay: false)', () => {
      render(<AudioRigDrawer />);
      expect(screen.getByRole('radio', { name: 'Natural Decay' }).getAttribute('aria-checked')).toBe('true');
      expect(screen.getByRole('radio', { name: 'Controlled Decay' }).getAttribute('aria-checked')).toBe('false');
    });

    it('clicking Controlled Decay calls setCompressorBeforeDelay(true)', () => {
      render(<AudioRigDrawer />);
      expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(false);

      fireEvent.click(screen.getByRole('radio', { name: 'Controlled Decay' }));

      expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(true);
    });

    it('once compressorBeforeDelay is true, Controlled Decay reads as selected and Natural Decay does not', () => {
      useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, compressorBeforeDelay: true } }));
      render(<AudioRigDrawer />);

      expect(screen.getByRole('radio', { name: 'Controlled Decay' }).getAttribute('aria-checked')).toBe('true');
      expect(screen.getByRole('radio', { name: 'Natural Decay' }).getAttribute('aria-checked')).toBe('false');
    });

    it('clicking Natural Decay while Controlled Decay is active calls setCompressorBeforeDelay(false)', () => {
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, compressorBeforeDelay: true },
      }));
      render(<AudioRigDrawer />);

      fireEvent.click(screen.getByRole('radio', { name: 'Natural Decay' }));

      expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(false);
    });

    it('lives inside the Compressor panel, under its other params — not the master row', () => {
      render(<AudioRigDrawer />);
      const decayRadio = screen.getByRole('radio', { name: 'Natural Decay' });
      const compressorPanel = screen.getByText('Compressor').closest('.sc-directional-panel');
      expect(compressorPanel?.contains(decayRadio)).toBe(true);
      expect(compressorPanel?.textContent).toContain('Threshold');
    });

    it('renders enabled — no parent-effect enabled/disabled concept left to gate it', () => {
      render(<AudioRigDrawer />);
      expect(screen.getByRole('radio', { name: 'Natural Decay' }).getAttribute('data-disabled')).toBeNull();
    });
  });

  describe('Drift (LFO_CONSOLIDATED_DISPLAY — eq3/filterLPF/filterHPF\'s own drift moved inside their own accordion)', () => {
    it('renders Robot Drift as a panel nested inside Transport & Composition — no longer its own standalone accordion', () => {
      render(<AudioRigDrawer />);
      const label = screen.getByText('Robot Drift');
      expect(label.closest('button')).toBeNull(); // not an accordion trigger anymore
      const panel = label.closest('.sc-directional-panel');
      expect(panel).not.toBeNull();
      expect(panel!.closest('.sc-accordion')?.textContent).toContain('Transport & Composition');
      expect(screen.queryByText('EQ Drift')).toBeNull();
      expect(screen.queryByText('Low-Pass Drift')).toBeNull();
      expect(screen.queryByText('High-Pass Drift')).toBeNull();
    });

    it('still renders all 4 Rate Drift / Depth Drift slider pairs — eq3/filterLPF/filterHPF\'s own plus robots\'', () => {
      render(<AudioRigDrawer />);
      expect(screen.getAllByRole('slider', { name: 'Rate Drift' })).toHaveLength(4);
      expect(screen.getAllByRole('slider', { name: 'Depth Drift' })).toHaveLength(4);
    });

    it("eq3's own Rate/Depth Drift sliders render inside eq3's own panel, directly beneath its shared LFO display — not a separate titled block", () => {
      render(<AudioRigDrawer />);
      const eqPanel = screen.getByText('3-Band EQ').closest('.sc-directional-panel') as HTMLElement;
      expect(eqPanel.textContent).toContain('Rate Drift');
      expect(eqPanel.textContent).toContain('Depth Drift');
    });

    it('shows each group\'s own current lfoDrift values as a -100..100 percent, not the internal -1..1 fraction', () => {
      useAudioStore.setState((s) => ({
        globalAudio: {
          ...s.globalAudio,
          lfoDrift: {
            ...s.globalAudio.lfoDrift,
            eq3: { rateDrift: 0.3, depthDrift: -0.6 },
            robots: { rateDrift: -0.2, depthDrift: 0.9 },
          },
        },
      }));
      render(<AudioRigDrawer />);
      const eqPanel = screen.getByText('3-Band EQ').closest('.sc-directional-panel') as HTMLElement;
      const robotPanel = screen.getByText('Robot Drift').closest('.sc-directional-panel') as HTMLElement;
      expect(within(eqPanel).getByRole('slider', { name: 'Rate Drift' }).getAttribute('aria-valuenow')).toBe('30');
      expect(within(eqPanel).getByRole('slider', { name: 'Depth Drift' }).getAttribute('aria-valuenow')).toBe('-60');
      expect(within(robotPanel).getByRole('slider', { name: 'Rate Drift' }).getAttribute('aria-valuenow')).toBe('-20');
      expect(within(robotPanel).getByRole('slider', { name: 'Depth Drift' }).getAttribute('aria-valuenow')).toBe('90');
    });

    it('dragging eq3\'s own Rate Drift slider calls setGlobalLfoDrift with \'eq3\' and the dragged percent divided by 100, leaving other groups untouched', () => {
      useAudioStore.setState((s) => ({
        globalAudio: {
          ...s.globalAudio,
          lfoDrift: { ...s.globalAudio.lfoDrift, eq3: { rateDrift: 0, depthDrift: 0 }, robots: { rateDrift: 0.5, depthDrift: 0.5 } },
        },
      }));
      render(<AudioRigDrawer />);
      const eqPanel = screen.getByText('3-Band EQ').closest('.sc-directional-panel') as HTMLElement;
      const eq3RateSlider = within(eqPanel).getByRole('slider', { name: 'Rate Drift' });
      eq3RateSlider.focus();
      fireEvent.keyDown(eq3RateSlider, { key: 'ArrowRight' });

      const newPercent = Number(eq3RateSlider.getAttribute('aria-valuenow'));
      expect(newPercent).not.toBe(0); // the key press actually moved it
      expect(useAudioStore.getState().globalAudio.lfoDrift.eq3.rateDrift).toBeCloseTo(newPercent / 100);
      expect(useAudioStore.getState().globalAudio.lfoDrift.eq3.depthDrift).toBe(0);
      expect(useAudioStore.getState().globalAudio.lfoDrift.robots).toEqual({ rateDrift: 0.5, depthDrift: 0.5 });
    });

    it('dragging the robots group\'s Depth Drift slider calls setGlobalLfoDrift with \'robots\' and the dragged percent divided by 100, leaving rateDrift and other groups untouched', () => {
      useAudioStore.setState((s) => ({
        globalAudio: {
          ...s.globalAudio,
          lfoDrift: { ...s.globalAudio.lfoDrift, eq3: { rateDrift: 0.4, depthDrift: 0.4 }, robots: { rateDrift: 0.5, depthDrift: 0 } },
        },
      }));
      render(<AudioRigDrawer />);
      const robotPanel = screen.getByText('Robot Drift').closest('.sc-directional-panel') as HTMLElement;
      const robotsDepthSlider = within(robotPanel).getByRole('slider', { name: 'Depth Drift' });
      robotsDepthSlider.focus();
      fireEvent.keyDown(robotsDepthSlider, { key: 'ArrowRight' });

      const newPercent = Number(robotsDepthSlider.getAttribute('aria-valuenow'));
      expect(newPercent).not.toBe(0);
      expect(useAudioStore.getState().globalAudio.lfoDrift.robots.depthDrift).toBeCloseTo(newPercent / 100);
      expect(useAudioStore.getState().globalAudio.lfoDrift.robots.rateDrift).toBe(0.5);
      expect(useAudioStore.getState().globalAudio.lfoDrift.eq3).toEqual({ rateDrift: 0.4, depthDrift: 0.4 });
    });

    it('all 8 sliders (4 groups x 2) render enabled — no rig-wide bypass left to disable them', () => {
      render(<AudioRigDrawer />);
      const sliders = [
        ...screen.getAllByRole('slider', { name: 'Rate Drift' }),
        ...screen.getAllByRole('slider', { name: 'Depth Drift' }),
      ];
      expect(sliders).toHaveLength(8);
      for (const slider of sliders) {
        expect(slider.getAttribute('data-disabled')).toBeNull();
      }
    });
  });

  describe('Ping Variance Automation slider (Task 6)', () => {
    it('renders exactly once, showing the store\'s current fraction as a 0-100 percent', () => {
      useAudioStore.setState({ pingVarianceAutomation: 0.42 });
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Automatic Effects' });
      expect(slider.getAttribute('aria-valuenow')).toBe('42');
    });

    it('dragging it calls setPingVarianceAutomation with the dragged percent divided by 100', () => {
      useAudioStore.setState({ pingVarianceAutomation: 0.5 });
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Automatic Effects' });
      slider.focus();
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      const newPercent = Number(slider.getAttribute('aria-valuenow'));
      expect(newPercent).not.toBe(50); // the key press actually moved it
      expect(useAudioStore.getState().pingVarianceAutomation).toBeCloseTo(newPercent / 100);
    });

    it('renders enabled — no rig-wide bypass left to disable it', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Automatic Effects' });
      expect(slider.getAttribute('data-disabled')).toBeNull();
    });

    it('renders inside Transport & Composition\'s Speed & Automation panel — no longer a bare control outside any accordion', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Automatic Effects' });
      const panel = slider.closest('.sc-directional-panel');
      expect(panel!.querySelector('.sc-dual-label__human')?.textContent).toBe('Speed & Automation');
      expect(slider.closest('.sc-accordion')?.textContent).toContain('Transport & Composition');
    });
  });

  describe('Tempo slider (BPM Control Task 5)', () => {
    it('renders exactly once, showing the store\'s current bpm directly — no scaling', () => {
      useAudioStore.setState({ bpm: 72 });
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Tempo' });
      expect(slider.getAttribute('aria-valuenow')).toBe('72');
    });

    it('dragging it calls setBPM directly with the dragged value — no conversion', () => {
      useAudioStore.setState({ bpm: 72 });
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Tempo' });
      slider.focus();
      fireEvent.keyDown(slider, { key: 'ArrowRight' });

      const newValue = Number(slider.getAttribute('aria-valuenow'));
      expect(newValue).not.toBe(72); // the key press actually moved it
      expect(useAudioStore.getState().bpm).toBe(newValue);
    });

    it('renders enabled — no rig-wide bypass left to disable it', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Tempo' });
      expect(slider.getAttribute('data-disabled')).toBeNull();
    });

    it('renders inside Transport & Composition\'s Speed & Automation panel — no longer a bare control outside any accordion', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Tempo' });
      const panel = slider.closest('.sc-directional-panel');
      expect(panel!.querySelector('.sc-dual-label__human')?.textContent).toBe('Speed & Automation');
      expect(slider.closest('.sc-accordion')?.textContent).toContain('Transport & Composition');
    });

    it('renders after Automatic Effects, inside the same Speed & Automation panel', () => {
      render(<AudioRigDrawer />);
      const pingSlider = screen.getByRole('slider', { name: 'Automatic Effects' });
      const tempoSlider = screen.getByRole('slider', { name: 'Tempo' });
      const pingPanel = pingSlider.closest('.sc-directional-panel');
      const tempoPanel = tempoSlider.closest('.sc-directional-panel');
      expect(tempoPanel).toBe(pingPanel);
      // DOM order: Tempo comes after Automatic Effects within the shared panel.
      expect(pingSlider.compareDocumentPosition(tempoSlider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
