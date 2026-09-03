import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

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
  return { ...DEFAULT_LFO_SETTINGS[target], active: false };
}

describe('AudioRigDrawer', () => {
  beforeEach(() => {
    resetAudioStore();
  });

  it('renders all 7 effect accordions with their config human labels', () => {
    render(<AudioRigDrawer />);
    expect(screen.getByText('Compressor')).toBeTruthy();
    expect(screen.getByText('3-Band EQ')).toBeTruthy();
    expect(screen.getByText('Low-Pass Filter')).toBeTruthy();
    expect(screen.getByText('High-Pass Filter')).toBeTruthy();
    expect(screen.getByText('Delay')).toBeTruthy();
    expect(screen.getByText('Reverb')).toBeTruthy();
    expect(screen.getByText('Limiter')).toBeTruthy();
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
    // compressor.enabled defaults to false (only reverb defaults true) — enable
    // it first so its param controls aren't disabled for this interaction test.
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: true } },
    }));
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
    thresholdSlider.focus();
    fireEvent.keyDown(thresholdSlider, { key: 'ArrowRight' }); // default step 1, from default -24
    expect(useAudioStore.getState().globalAudio.compressor.threshold).toBe(-23);
  });

  it('a single arrow-key press on a Delay slider moves by a small increment, not straight to max — regression: sliderLinear schemas with a full range <= 1 and no explicit step used to act like toggles', () => {
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, delay: { ...s.globalAudio.delay, enabled: true, delayTime: 0.5 } },
    }));
    render(<AudioRigDrawer />);
    const delayTimeSlider = screen.getByRole('slider', { name: 'Time' });
    delayTimeSlider.focus();
    fireEvent.keyDown(delayTimeSlider, { key: 'ArrowRight' });

    const newValue = useAudioStore.getState().globalAudio.delay.delayTime;
    expect(newValue).toBeGreaterThan(0.5);
    expect(newValue).toBeLessThan(1); // must not jump straight to max in one press
  });

  it('toggling an effect\'s own bypass calls setEffectEnabled and updates state', () => {
    render(<AudioRigDrawer />);
    const compressorToggle = screen.getByRole('switch', { name: 'Compressor Enabled' });
    expect(useAudioStore.getState().globalAudio.compressor.enabled).toBe(false); // DEFAULT_GLOBAL_AUDIO_SETTINGS
    fireEvent.click(compressorToggle);
    expect(useAudioStore.getState().globalAudio.compressor.enabled).toBe(true);
  });

  it('an effect\'s bypass off disables that effect\'s other param controls', () => {
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: false } },
    }));
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
    expect(thresholdSlider.getAttribute('data-disabled')).toBe('');
  });

  it('an effect\'s bypass on leaves that effect\'s other param controls enabled', () => {
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: true } },
    }));
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
    expect(thresholdSlider.getAttribute('data-disabled')).toBeNull();
  });

  it('toggling the rig-wide bypass calls setGlobalBypassEnabled and updates state', () => {
    render(<AudioRigDrawer />);
    const rigBypass = screen.getByRole('switch', { name: 'Bypass (this may be loud or distorted)' });
    expect(useAudioStore.getState().globalAudio.globalBypass).toBe(false);
    fireEvent.click(rigBypass);
    expect(useAudioStore.getState().globalAudio.globalBypass).toBe(true);
  });

  it('the rig-wide bypass on disables every effect\'s own bypass toggle', () => {
    useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, globalBypass: true } }));
    render(<AudioRigDrawer />);
    expect((screen.getByRole('switch', { name: 'Compressor Enabled' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('switch', { name: 'Reverb Enabled' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('the rig-wide bypass on also disables every effect\'s param controls, even ones individually enabled', () => {
    useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, globalBypass: true } }));
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
    expect(thresholdSlider.getAttribute('data-disabled')).toBe('');
  });

  it('the rig-wide bypass off leaves every effect\'s own bypass toggle enabled', () => {
    render(<AudioRigDrawer />);
    expect((screen.getByRole('switch', { name: 'Compressor Enabled' }) as HTMLButtonElement).disabled).toBe(false);
  });

  describe('shared LFO display (LFO_CONSOLIDATED_DISPLAY — replaces the old nested per-slider accordion)', () => {
    it('renders exactly one shared LFO display per LFO-bearing block — 3 total (eq3, filterLPF, filterHPF), never one per param', () => {
      render(<AudioRigDrawer />);
      // Each shared display renders exactly one Active toggle, so a plain count also proves
      // "not one per param" — 7 GlobalLfoTargetId params would otherwise render 7.
      expect(screen.getAllByRole('switch', { name: 'Active' })).toHaveLength(3);
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
        globalLfo: { ...s.globalLfo, 'eq3.low': { shape: 'square', rate: 5, depth: 60, active: true } },
      }));
      render(<AudioRigDrawer />);

      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0];
      const depthSlider = screen.getAllByRole('slider', { name: 'Depth' })[0];
      const activeToggle = screen.getAllByRole('switch', { name: 'Active' })[0];

      expect(rateSlider.getAttribute('aria-valuenow')).toBe('5');
      expect(depthSlider.getAttribute('aria-valuenow')).toBe('60');
      expect(activeToggle.getAttribute('aria-checked')).toBe('true');
    });

    it('changing the shared display\'s active toggle calls setGlobalLfo for the currently-targeted field (eq3.low by default)', () => {
      // The toggle is only interactive while its block is enabled — eq3 defaults disabled.
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, eq3: { ...s.globalAudio.eq3, enabled: true } },
      }));
      render(<AudioRigDrawer />);
      const activeToggle = screen.getAllByRole('switch', { name: 'Active' })[0]; // eq3's shared display, defaulting to eq3.low
      expect(useAudioStore.getState().globalLfo['eq3.low'].active).toBe(false);

      fireEvent.click(activeToggle);

      expect(useAudioStore.getState().globalLfo['eq3.low'].active).toBe(true);
    });

    it('the shared LFO display is disabled when its parent effect is bypassed off, like every other param in that block', () => {
      // eq3 defaults enabled: false (DEFAULT_GLOBAL_AUDIO_SETTINGS) — unlike the old nested
      // accordion (which ignored the parent's own disabled state), the shared display now
      // respects it, matching SignatureArrayDrawer/AudioSettingSection's existing Lfo wiring.
      render(<AudioRigDrawer />);
      const activeToggle = screen.getAllByRole('switch', { name: 'Active' })[0]; // eq3.low
      expect((activeToggle as HTMLButtonElement).disabled).toBe(true);
    });

    it('the shared LFO display is enabled once its parent effect is enabled', () => {
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, eq3: { ...s.globalAudio.eq3, enabled: true } },
      }));
      render(<AudioRigDrawer />);
      const activeToggle = screen.getAllByRole('switch', { name: 'Active' })[0];
      expect((activeToggle as HTMLButtonElement).disabled).toBe(false);
    });

    it("the effect accordion's status light reflects its own Enabled toggle, not open/closed", () => {
      render(<AudioRigDrawer />);
      // eq3 defaults enabled: false (DEFAULT_GLOBAL_AUDIO_SETTINGS)
      const eqTrigger = screen.getByRole('button', { name: /3-Band EQ/i });
      const light = eqTrigger.querySelector('.sc-accordion__light');
      expect(light?.getAttribute('data-content-active')).toBe('false');

      fireEvent.click(screen.getByRole('switch', { name: '3-Band EQ Enabled' }));
      expect(light?.getAttribute('data-content-active')).toBe('true');
    });

    it('does not auto-open the parent effect accordion just because its LFO-tied target is active', () => {
      useAudioStore.setState((s) => ({
        globalLfo: { ...s.globalLfo, 'eq3.low': { shape: 'square', rate: 5, depth: 60, active: true } },
      }));
      render(<AudioRigDrawer />);
      const eqTrigger = screen.getByRole('button', { name: /3-Band EQ/i });
      expect(eqTrigger.getAttribute('aria-expanded')).toBe('false');
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
      // Sliders are only focusable while their block is enabled — eq3 defaults disabled.
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, eq3: { ...s.globalAudio.eq3, enabled: true } },
      }));
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

      const activeToggle = screen.getAllByRole('switch', { name: 'Active' })[0];
      fireEvent.click(activeToggle);

      expect(useAudioStore.getState().globalLfo['eq3.high'].active).toBe(true);
      expect(useAudioStore.getState().globalLfo['eq3.low'].active).toBe(false);
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
      // compressor.enabled defaults to false (only reverb defaults true) — the
      // Decay radio now lives inside Compressor's own accordion and shares its
      // disabled state, so enable it first for this interaction test.
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: true } },
      }));
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
        globalAudio: {
          ...s.globalAudio,
          compressorBeforeDelay: true,
          compressor: { ...s.globalAudio.compressor, enabled: true },
        },
      }));
      render(<AudioRigDrawer />);

      fireEvent.click(screen.getByRole('radio', { name: 'Natural Decay' }));

      expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(false);
    });

    it('lives inside the Compressor accordion, under its other params — not the master row', () => {
      render(<AudioRigDrawer />);
      const decayRadio = screen.getByRole('radio', { name: 'Natural Decay' });
      const accordionContent = decayRadio.closest('.sc-accordion__content-inner');
      expect(accordionContent?.textContent).toContain('Threshold');
    });

    it('is disabled when Compressor itself is bypassed off, matching its other param controls', () => {
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: false } },
      }));
      render(<AudioRigDrawer />);
      expect(screen.getByRole('radio', { name: 'Natural Decay' }).getAttribute('data-disabled')).toBe('');
    });

    it('is enabled when Compressor is enabled and the rig-wide bypass is off', () => {
      useAudioStore.setState((s) => ({
        globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: true } },
      }));
      render(<AudioRigDrawer />);
      expect(screen.getByRole('radio', { name: 'Natural Decay' }).getAttribute('data-disabled')).toBeNull();
    });
  });

  describe('Drift (LFO_CONSOLIDATED_DISPLAY — eq3/filterLPF/filterHPF\'s own drift moved inside their own accordion)', () => {
    it('renders exactly one standalone Drift accordion — Robot Drift — the only group not scoped to one effect block', () => {
      render(<AudioRigDrawer />);
      expect(screen.getByText('Robot Drift')).toBeTruthy();
      expect(screen.queryByText('EQ Drift')).toBeNull();
      expect(screen.queryByText('Low-Pass Drift')).toBeNull();
      expect(screen.queryByText('High-Pass Drift')).toBeNull();
    });

    it('still renders all 4 Rate Drift / Depth Drift slider pairs — eq3/filterLPF/filterHPF\'s own plus robots\'', () => {
      render(<AudioRigDrawer />);
      expect(screen.getAllByRole('slider', { name: 'Rate Drift' })).toHaveLength(4);
      expect(screen.getAllByRole('slider', { name: 'Depth Drift' })).toHaveLength(4);
    });

    it("eq3's own Rate/Depth Drift sliders render inside eq3's own accordion, directly beneath its shared LFO display — not a separate titled block", () => {
      render(<AudioRigDrawer />);
      const eqAccordionContent = screen.getByRole('slider', { name: 'Low' }).closest('.sc-accordion__content-inner')!;
      expect(eqAccordionContent.textContent).toContain('Rate Drift');
      expect(eqAccordionContent.textContent).toContain('Depth Drift');
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
      // Order matches LFO_DRIFT_GROUPS: [eq3, filterLPF, filterHPF, robots].
      const rateSliders = screen.getAllByRole('slider', { name: 'Rate Drift' });
      const depthSliders = screen.getAllByRole('slider', { name: 'Depth Drift' });
      expect(rateSliders[0].getAttribute('aria-valuenow')).toBe('30');
      expect(depthSliders[0].getAttribute('aria-valuenow')).toBe('-60');
      expect(rateSliders[3].getAttribute('aria-valuenow')).toBe('-20');
      expect(depthSliders[3].getAttribute('aria-valuenow')).toBe('90');
    });

    it('dragging one group\'s Rate Drift slider calls setGlobalLfoDrift with that group and the dragged percent divided by 100, leaving other groups untouched', () => {
      useAudioStore.setState((s) => ({
        globalAudio: {
          ...s.globalAudio,
          lfoDrift: { ...s.globalAudio.lfoDrift, eq3: { rateDrift: 0, depthDrift: 0 }, robots: { rateDrift: 0.5, depthDrift: 0.5 } },
        },
      }));
      render(<AudioRigDrawer />);
      const eq3RateSlider = screen.getAllByRole('slider', { name: 'Rate Drift' })[0];
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
      const robotsDepthSlider = screen.getAllByRole('slider', { name: 'Depth Drift' })[3];
      robotsDepthSlider.focus();
      fireEvent.keyDown(robotsDepthSlider, { key: 'ArrowRight' });

      const newPercent = Number(robotsDepthSlider.getAttribute('aria-valuenow'));
      expect(newPercent).not.toBe(0);
      expect(useAudioStore.getState().globalAudio.lfoDrift.robots.depthDrift).toBeCloseTo(newPercent / 100);
      expect(useAudioStore.getState().globalAudio.lfoDrift.robots.rateDrift).toBe(0.5);
      expect(useAudioStore.getState().globalAudio.lfoDrift.eq3).toEqual({ rateDrift: 0.4, depthDrift: 0.4 });
    });

    it('all 8 sliders (4 groups x 2) are disabled when the rig-wide bypass is on, matching every other block\'s rigDisabled wiring', () => {
      useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, globalBypass: true } }));
      render(<AudioRigDrawer />);
      const sliders = [
        ...screen.getAllByRole('slider', { name: 'Rate Drift' }),
        ...screen.getAllByRole('slider', { name: 'Depth Drift' }),
      ];
      expect(sliders).toHaveLength(8);
      for (const slider of sliders) {
        expect(slider.getAttribute('data-disabled')).toBe('');
      }
    });

    it('all 8 sliders are enabled when the rig-wide bypass is off — unlike every effect block, Drift has no enabled toggle of its own to also check', () => {
      render(<AudioRigDrawer />);
      const sliders = [
        ...screen.getAllByRole('slider', { name: 'Rate Drift' }),
        ...screen.getAllByRole('slider', { name: 'Depth Drift' }),
      ];
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

    it('is disabled when the rig-wide bypass is on, matching every other Rig-wide control', () => {
      useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, globalBypass: true } }));
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Automatic Effects' });
      expect(slider.getAttribute('data-disabled')).toBe('');
    });

    it('is enabled when the rig-wide bypass is off', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Automatic Effects' });
      expect(slider.getAttribute('data-disabled')).toBeNull();
    });

    it('renders as a bare control, outside any accordion — not nested inside an effect block or Drift group', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Automatic Effects' });
      expect(slider.closest('.sc-accordion')).toBeNull();
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

    it('is disabled when the rig-wide bypass is on, matching every other Rig-wide control', () => {
      useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, globalBypass: true } }));
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Tempo' });
      expect(slider.getAttribute('data-disabled')).toBe('');
    });

    it('is enabled when the rig-wide bypass is off', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Tempo' });
      expect(slider.getAttribute('data-disabled')).toBeNull();
    });

    it('renders as a bare control, outside any accordion — not nested inside an effect block or Drift group', () => {
      render(<AudioRigDrawer />);
      const slider = screen.getByRole('slider', { name: 'Tempo' });
      expect(slider.closest('.sc-accordion')).toBeNull();
    });

    it('renders after the Ping Variance Automation row, in its own master-row', () => {
      render(<AudioRigDrawer />);
      const pingRow = screen.getByRole('slider', { name: 'Automatic Effects' }).closest('.audio-rig-drawer__master-row');
      const tempoRow = screen.getByRole('slider', { name: 'Tempo' }).closest('.audio-rig-drawer__master-row');
      expect(tempoRow).not.toBeNull();
      expect(tempoRow).not.toBe(pingRow);
      // DOM order: Tempo's master-row comes after Ping Variance Automation's.
      expect(pingRow!.compareDocumentPosition(tempoRow!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
