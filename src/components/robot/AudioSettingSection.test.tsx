import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Same reasoning as AudioRigDrawer/SignatureArrayDrawer's own test files: the shared
// vitest.setup.ts GSAP mock's timeline object has no kill() method, and useLfoTargetGroup's
// unmount cleanup calls killTimeline on an already-registered entry.
vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

import { AudioSettingSection } from './AudioSettingSection';
import type { LfoValue } from '@/types/controls';
import type { Robot } from '@/types/Robot';

const DEFAULT_VOLUME_LFO: LfoValue = { shape: 'sine', rate: 0, depth: 20 };

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

  describe('shared LFO display (LFO_CONSOLIDATED_DISPLAY — replaces the old nested "Modulation" accordion)', () => {
    it('renders Volume as a bare slider followed by its shared LFO display, no AccordionContainer wrapping it', () => {
      const { container } = render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      expect(container.querySelectorAll('.sc-accordion')).toHaveLength(0);
      // Rate + Depth from the shared Lfo display — no separate active toggle rendered.
      expect(screen.getAllByRole('slider', { name: 'Rate' })).toHaveLength(1);
      expect(screen.getAllByRole('slider', { name: 'Depth' })).toHaveLength(1);
    });

    it("the shared display's own label reads 'Volume' — from VOLUME_SCHEMA.humanLabel, no new copy", () => {
      const { container } = render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const display = container.querySelector('.sc-lfo-target-group__display')!;
      expect(display.textContent).toContain('Volume');
    });

    it('reflects volumeLfo and calls onVolumeLfoChange when the rate slider moves off 0', () => {
      const onVolumeLfoChange = vi.fn();
      render(
        <AudioSettingSection
          value={makeValue({ volumeLfo: { shape: 'sine', rate: 0, depth: 20 } })}
          onAudioModeChange={() => {}}
          onVolumeChange={() => {}}
          onVolumeLfoChange={onVolumeLfoChange}
        />
      );

      const rateSlider = screen.getByRole('slider', { name: 'Rate' });
      rateSlider.focus();
      fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });

      expect(onVolumeLfoChange).toHaveBeenCalledWith({ shape: 'sine', rate: 0.25, depth: 20 });
    });
  });

  describe('DirectionalPanel wrapper (docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 4)', () => {
    it('renders its own DirectionalPanel wrapper around the existing content, column orientation', () => {
      const { container } = render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const panel = container.querySelector('.sc-directional-panel');
      expect(panel).not.toBeNull();
      expect(panel!.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('column');
    });

    it('the panel carries the Output label (ROBOT_OUTPUT_PANEL_SCHEMA.humanLabel)', () => {
      render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      expect(screen.getByText('Output')).toBeTruthy();
    });

    it('the Audio Setting radio and Volume slider both render inside the panel', () => {
      const { container } = render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const panel = container.querySelector('.sc-directional-panel')!;
      expect(panel.contains(screen.getByRole('radio', { name: 'Solo' }))).toBe(true);
      expect(panel.contains(screen.getByRole('slider', { name: /volume/i }))).toBe(true);
    });
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

  it('disables Audio Setting, Volume, and the shared Volume LFO display\'s controls when disabled is true', () => {
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
    expect(screen.getByRole('slider', { name: 'Rate' }).getAttribute('data-disabled')).toBe('');
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
