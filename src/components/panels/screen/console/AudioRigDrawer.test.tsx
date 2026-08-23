import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AudioRigDrawer } from './AudioRigDrawer';
import { useAudioStore } from '@/stores/audioStore';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '@/types/globalAudio';

function resetAudioStore() {
  useAudioStore.setState({ globalAudio: { ...DEFAULT_GLOBAL_AUDIO_SETTINGS } });
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
    expect(screen.getByText('Chorus')).toBeTruthy();
    expect(screen.getByText('Delay')).toBeTruthy();
    expect(screen.getByText('Reverb')).toBeTruthy();
  });

  it('renders a param control bound to its live store value', () => {
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, threshold: -12 } },
    }));
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getByRole('slider', { name: 'Threshold' });
    expect(thresholdSlider.getAttribute('aria-valuenow')).toBe('-12');
  });

  it('dragging a param control calls setGlobalAudio with the right effect/field/value', () => {
    // compressor.enabled defaults to false (only reverb defaults true) — enable
    // it first so its param controls aren't disabled for this interaction test.
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: true } },
    }));
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getByRole('slider', { name: 'Threshold' });
    thresholdSlider.focus();
    fireEvent.keyDown(thresholdSlider, { key: 'ArrowRight' }); // default step 1, from default -24
    expect(useAudioStore.getState().globalAudio.compressor.threshold).toBe(-23);
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
    const thresholdSlider = screen.getByRole('slider', { name: 'Threshold' });
    expect(thresholdSlider.getAttribute('data-disabled')).toBe('');
  });

  it('an effect\'s bypass on leaves that effect\'s other param controls enabled', () => {
    useAudioStore.setState((s) => ({
      globalAudio: { ...s.globalAudio, compressor: { ...s.globalAudio.compressor, enabled: true } },
    }));
    render(<AudioRigDrawer />);
    const thresholdSlider = screen.getByRole('slider', { name: 'Threshold' });
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
    const thresholdSlider = screen.getByRole('slider', { name: 'Threshold' });
    expect(thresholdSlider.getAttribute('data-disabled')).toBe('');
  });

  it('the rig-wide bypass off leaves every effect\'s own bypass toggle enabled', () => {
    render(<AudioRigDrawer />);
    expect((screen.getByRole('switch', { name: 'Compressor Enabled' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
