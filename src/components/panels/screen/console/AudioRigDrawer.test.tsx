import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Real lfoEngine would construct a real Tone.LFO on first setter call
// (getOrCreateLfo -> new Tone.LFO(...)), which throws without a real
// AudioContext — the same class of bug fixed in Tasks 8/9. Mocked here so
// setGlobalLfo's own Zustand-state-update logic still runs for real, but its
// calls into lfoEngine land on mocks instead.
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

  describe('nested LFO accordions (Task 11)', () => {
    it('renders exactly 7 nested LFO accordions — one per GlobalLfoTargetId', () => {
      render(<AudioRigDrawer />);
      expect(screen.getAllByText('Modulation')).toHaveLength(7);
    });

    it('renders no LFO accordion for the 12 non-flagged params (e.g. compressor.threshold)', () => {
      render(<AudioRigDrawer />);
      // Threshold's own row shouldn't contain a nested "Modulation" trigger —
      // scope by walking up from the Threshold slider to its param row.
      const thresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[0];
      const paramRow = thresholdSlider.closest('.audio-rig-drawer__param-row');
      expect(paramRow?.textContent).not.toContain('Modulation');
    });

    it('renders no LFO accordion for Limiter\'s threshold either — Limiter never gets one', () => {
      render(<AudioRigDrawer />);
      const limiterThresholdSlider = screen.getAllByRole('slider', { name: 'Threshold' })[1];
      const paramRow = limiterThresholdSlider.closest('.audio-rig-drawer__param-row');
      expect(paramRow?.textContent).not.toContain('Modulation');
    });

    it('renders no LFO accordion for Delay\'s Time either — LFO removed from delay.delayTime', () => {
      render(<AudioRigDrawer />);
      const delayTimeSlider = screen.getByRole('slider', { name: 'Time' });
      const paramRow = delayTimeSlider.closest('.audio-rig-drawer__param-row');
      expect(paramRow?.textContent).not.toContain('Modulation');
    });

    it('binds the first LFO accordion (eq3.low) to its own globalLfo entry, not DEFAULT_LFO_SETTINGS', () => {
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

    it('changing the active toggle on an LFO accordion calls setGlobalLfo with the updated value', () => {
      render(<AudioRigDrawer />);
      const activeToggle = screen.getAllByRole('switch', { name: 'Active' })[0]; // eq3.low, per AUDIO_RIG_CONFIG's row order
      expect(useAudioStore.getState().globalLfo['eq3.low'].active).toBe(false);

      fireEvent.click(activeToggle);

      expect(useAudioStore.getState().globalLfo['eq3.low'].active).toBe(true);
    });

    it('the nested LFO control stays interactive even when its parent effect is bypassed off', () => {
      // eq3 defaults enabled: false (DEFAULT_GLOBAL_AUDIO_SETTINGS) — its own
      // params are disabled, but the nested Lfo control must not be.
      render(<AudioRigDrawer />);
      const activeToggle = screen.getAllByRole('switch', { name: 'Active' })[0]; // eq3.low
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

    it("the LFO accordion's status light reflects that target's Active toggle", () => {
      useAudioStore.setState((s) => ({
        globalLfo: { ...s.globalLfo, 'eq3.low': { shape: 'square', rate: 5, depth: 60, active: true } },
      }));
      render(<AudioRigDrawer />);
      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0]; // eq3.low
      const light = rateSlider.closest('.sc-accordion')?.querySelector('.sc-accordion__light');
      expect(light?.getAttribute('data-content-active')).toBe('true');
    });

    it('loads the nested LFO accordion already open when that target is seeded active', () => {
      useAudioStore.setState((s) => ({
        globalLfo: { ...s.globalLfo, 'eq3.low': { shape: 'square', rate: 5, depth: 60, active: true } },
      }));
      render(<AudioRigDrawer />);

      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0]; // eq3.low
      const trigger = rateSlider.closest('.sc-accordion')?.querySelector('.sc-accordion__trigger');
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    it('leaves the nested LFO accordion closed by default when that target is not active', () => {
      render(<AudioRigDrawer />); // resetAudioStore seeds every target active: false
      const rateSlider = screen.getAllByRole('slider', { name: 'Rate' })[0];
      const trigger = rateSlider.closest('.sc-accordion')?.querySelector('.sc-accordion__trigger');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });

    it('does not auto-open the parent effect accordion just because a nested LFO inside it is active', () => {
      useAudioStore.setState((s) => ({
        globalLfo: { ...s.globalLfo, 'eq3.low': { shape: 'square', rate: 5, depth: 60, active: true } },
      }));
      render(<AudioRigDrawer />);
      const eqTrigger = screen.getByRole('button', { name: /3-Band EQ/i });
      expect(eqTrigger.getAttribute('aria-expanded')).toBe('false');
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

  describe('Drift accordions (Task 9 — one per DriftGroupId)', () => {
    it('renders 4 Drift accordions, one per group, each with its own Rate Drift and Depth Drift sliders', () => {
      render(<AudioRigDrawer />);
      expect(screen.getByText('EQ Drift')).toBeTruthy();
      expect(screen.getByText('Low-Pass Drift')).toBeTruthy();
      expect(screen.getByText('High-Pass Drift')).toBeTruthy();
      expect(screen.getByText('Robot Drift')).toBeTruthy();
      expect(screen.getAllByRole('slider', { name: 'Rate Drift' })).toHaveLength(4);
      expect(screen.getAllByRole('slider', { name: 'Depth Drift' })).toHaveLength(4);
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
});
