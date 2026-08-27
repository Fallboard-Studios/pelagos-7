import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AudioSettingSection } from './AudioSettingSection';
import type { LfoValue } from '@/types/controls';
import type { Robot } from '@/types/Robot';

const DEFAULT_VOLUME_LFO: LfoValue = { shape: 'sine', rate: 1, depth: 20, active: false };

function makeValue(overrides: Partial<{ audioMode: NonNullable<Robot['audioMode']>; masterVolume: number; volumeLfo: LfoValue }> = {}) {
  return {
    audioMode: 'none' as NonNullable<Robot['audioMode']>,
    masterVolume: 0.42,
    volumeLfo: DEFAULT_VOLUME_LFO,
    ...overrides,
  };
}

describe('AudioSettingSection', () => {
  it('Audio Setting radio includes all 4 options and calls onAudioModeChange with the selected value', () => {
    const onAudioModeChange = vi.fn();
    render(
      <AudioSettingSection
        value={makeValue()}
        onAudioModeChange={onAudioModeChange}
        onVolumeChange={() => {}}
        onVolumeLfoChange={() => {}}
      />
    );

    ['Off', 'Mute', 'Solo', 'Highlight'].forEach((label) => {
      expect(screen.getByRole('radio', { name: label })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Solo' }));
    expect(onAudioModeChange).toHaveBeenCalledWith('solo');
  });

  it('Volume slider displays 0-100% of the 0..1 masterVolume value', () => {
    render(
      <AudioSettingSection
        value={makeValue({ masterVolume: 0.42 })}
        onAudioModeChange={() => {}}
        onVolumeChange={() => {}}
        onVolumeLfoChange={() => {}}
      />
    );

    const slider = screen.getByRole('slider', { name: /volume/i });
    expect(slider.getAttribute('aria-valuenow')).toBe('42');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
  });

  it('a Volume edit calls onVolumeChange with the new percent (0-100), not the 0..1 fraction', () => {
    const onVolumeChange = vi.fn();
    render(
      <AudioSettingSection
        value={makeValue({ masterVolume: 0.42 })}
        onAudioModeChange={() => {}}
        onVolumeChange={onVolumeChange}
        onVolumeLfoChange={() => {}}
      />
    );

    fireEvent.keyDown(screen.getByRole('slider', { name: /volume/i }), { key: 'ArrowRight' });

    expect(onVolumeChange).toHaveBeenCalledWith(43); // one 1% step up from 42%
  });

  it("Volume's Lfo accordion reflects volumeLfo and calls onVolumeLfoChange on activation", () => {
    const onVolumeLfoChange = vi.fn();
    render(
      <AudioSettingSection
        value={makeValue({ volumeLfo: { shape: 'sine', rate: 1, depth: 20, active: false } })}
        onAudioModeChange={() => {}}
        onVolumeChange={() => {}}
        onVolumeLfoChange={onVolumeLfoChange}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: /active/i }));

    expect(onVolumeLfoChange).toHaveBeenCalledWith({ shape: 'sine', rate: 1, depth: 20, active: true });
  });

  it('is not disabled by default', () => {
    render(
      <AudioSettingSection
        value={makeValue()}
        onAudioModeChange={() => {}}
        onVolumeChange={() => {}}
        onVolumeLfoChange={() => {}}
      />
    );
    expect(screen.getByRole('radio', { name: 'Solo' }).getAttribute('data-disabled')).toBeNull();
  });

  it('disables Audio Setting, Volume, and the Volume LFO accordion\'s controls when disabled is true', () => {
    render(
      <AudioSettingSection
        value={makeValue()}
        onAudioModeChange={() => {}}
        onVolumeChange={() => {}}
        onVolumeLfoChange={() => {}}
        disabled
      />
    );
    expect(screen.getByRole('radio', { name: 'Solo' }).getAttribute('data-disabled')).toBe('');
    expect(screen.getByRole('slider', { name: /volume/i }).getAttribute('data-disabled')).toBe('');
  });

  it('does not call onAudioModeChange or onVolumeChange when disabled', () => {
    const onAudioModeChange = vi.fn();
    const onVolumeChange = vi.fn();
    render(
      <AudioSettingSection
        value={makeValue()}
        onAudioModeChange={onAudioModeChange}
        onVolumeChange={onVolumeChange}
        onVolumeLfoChange={() => {}}
        disabled
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Solo' }));
    fireEvent.keyDown(screen.getByRole('slider', { name: /volume/i }), { key: 'ArrowRight' });

    expect(onAudioModeChange).not.toHaveBeenCalled();
    expect(onVolumeChange).not.toHaveBeenCalled();
  });
});
