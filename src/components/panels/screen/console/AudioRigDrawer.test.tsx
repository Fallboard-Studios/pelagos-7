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
    const rigBypass = screen.getByRole('switch', { name: 'Bypass' });
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
  });

  describe('Reverb (Task 11)', () => {
    it('renders no dampening slider — dead, removed', () => {
      render(<AudioRigDrawer />);
      expect(screen.queryByRole('slider', { name: 'Dampening' })).toBeNull();
    });
  });

  describe('Decay toggle (Task 11)', () => {
    it('renders, defaulting to "Natural Decay" (compressorBeforeDelay: false)', () => {
      render(<AudioRigDrawer />);
      expect(screen.getByRole('switch', { name: 'Natural Decay' })).toBeTruthy();
    });

    it('clicking it calls setCompressorBeforeDelay(true)', () => {
      render(<AudioRigDrawer />);
      const decayToggle = screen.getByRole('switch', { name: 'Natural Decay' });
      expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(false);

      fireEvent.click(decayToggle);

      expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(true);
    });

    it('once compressorBeforeDelay is true, the same toggle\'s visible label reads "Controlled Decay"', () => {
      useAudioStore.setState((s) => ({ globalAudio: { ...s.globalAudio, compressorBeforeDelay: true } }));
      render(<AudioRigDrawer />);

      expect(screen.getByRole('switch', { name: 'Controlled Decay' })).toBeTruthy();
      expect(screen.queryByRole('switch', { name: 'Natural Decay' })).toBeNull();
    });
  });
});
