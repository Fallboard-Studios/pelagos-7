import type { CSSProperties } from 'react';
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

/** Stubs window.matchMedia so the mobile/tablet viewport tiers can be controlled — same shape
 *  as AudioRigDrawer.test.tsx's own stubMatchMedia, since the Volume row's 'responsive'
 *  orientation resolves through the same useResponsivePanelOrientation/useCabinetTier tiers. */
function stubMatchMedia(state: { mobile: boolean; tablet: boolean }) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('640px') ? state.mobile : state.tablet,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  });
}

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

    ['Auto', 'Mute', 'Solo', 'Highlight'].forEach((label) => {
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
    it('renders Volume as a bare slider followed by its shared LFO display, inside exactly one Volume accordion (docs/specs/ROBOT_OPTIONS_RESPONSIVE_LAYOUT.md §1.2)', () => {
      const { container } = render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const accordions = container.querySelectorAll('.sc-accordion');
      expect(accordions).toHaveLength(1);
      expect(accordions[0].querySelector('.sc-dual-label__human')?.textContent).toBe('Volume');
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

  describe('Volume accordion + 2-column desktop split (docs/specs/ROBOT_OPTIONS_RESPONSIVE_LAYOUT.md §1.2)', () => {
    it('the Audio Setting radio and Volume slider both render inside the settings-column panel, and the Lfo display is a sibling of that panel', () => {
      render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      // The settings-column panel (Audio Setting + Volume) is the innermost .sc-directional-panel
      // containing the radio.
      const settingsColumn = screen.getByRole('radio', { name: 'Solo' }).closest('.sc-directional-panel')!;
      expect(settingsColumn.contains(screen.getByRole('slider', { name: /volume/i }))).toBe(true);
      // The Lfo display (Rate/Depth) is NOT inside that same settings-column panel — it's a
      // sibling in the outer VOLUME_ROW_PANEL_SCHEMA row, not nested under the radio/slider pair.
      expect(settingsColumn.contains(screen.getByRole('slider', { name: 'Rate' }))).toBe(false);
    });

    it("the Volume row is not a flex container — 'audio-setting-section__row' adds display:flex, which shrinks a lone flex item (the slider) to its own content width instead of the row's full width, breaking useVoxelTrackBoxCount's self-observation (same pattern audio-rig-drawer__param-row / sc-lfo-target-group__row already avoid elsewhere by carrying no display rule at all)", () => {
      render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const volumeRow = screen.getByRole('slider', { name: /volume/i }).closest('.sc-lfo-target-group__row')!;
      expect(volumeRow.classList.contains('audio-setting-section__row')).toBe(false);
    });

    it('renders data-orientation="column" on the outer row panel when the mobile tier matches — everything stacks in one column', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const outerRowContent = screen.getByRole('radio', { name: 'Solo' })
        .closest('.sc-directional-panel')! // settings-column panel
        .parentElement!; // VOLUME_ROW_PANEL_SCHEMA's own .sc-directional-panel__content
      expect(outerRowContent.getAttribute('data-orientation')).toBe('column');
    });

    it('renders data-orientation="row" on the outer row panel when neither tier matches (desktop) — settings column beside the Lfo display', () => {
      stubMatchMedia({ mobile: false, tablet: false });
      render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const settingsColumn = screen.getByRole('radio', { name: 'Solo' }).closest('.sc-directional-panel')!;
      const outerRowContent = settingsColumn.parentElement!;
      expect(outerRowContent.getAttribute('data-orientation')).toBe('row');
      // The Lfo display sits beside the settings column as a direct sibling of that same content div.
      const lfoDisplay = screen.getByRole('slider', { name: 'Rate' }).closest('.sc-lfo-target-group__display')!;
      expect(lfoDisplay.parentElement).toBe(outerRowContent);
    });

    it('the settings-column panel is always column-oriented, regardless of tier', () => {
      stubMatchMedia({ mobile: false, tablet: false });
      render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const settingsColumn = screen.getByRole('radio', { name: 'Solo' }).closest('.sc-directional-panel')!;
      expect(settingsColumn.querySelector(':scope > .sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('column');
    });

    it('the Volume row carries the shared sc-lfo-target-group__row class and is targeted by default — the same targeting wiring AudioRigLfoGroup uses, even with only one field to target', () => {
      render(
        <AudioSettingSection value={makeValue()} onAudioModeChange={() => {}} onVolumeChange={() => {}} onVolumeLfoChange={() => {}} />
      );
      const volumeRow = screen.getByRole('slider', { name: /volume/i }).closest('.sc-lfo-target-group__row')!;
      expect(volumeRow).not.toBeNull();
      expect(volumeRow.classList.contains('isActive')).toBe(true);
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

  // Roadmap Phase 14 (docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.5, Task 11) — an optional
  // `style` prop forwarded to this section's own AccordionContainer, for trait-color scoping
  // (getTraitColorStyle('output'), applied at the RobotOptionsTab call site in Task 12).
  describe('style prop', () => {
    it('forwards a caller-supplied style to the section\'s own AccordionContainer root', () => {
      const { container } = render(
        <AudioSettingSection
          value={makeValue()}
          onAudioModeChange={() => {}}
          onVolumeChange={() => {}}
          onVolumeLfoChange={() => {}}
          style={{ '--color-accent-a': '#cd5e57', '--color-accent-b': '#da7e1b' } as CSSProperties}
        />,
      );
      const root = container.querySelector('.sc-accordion') as HTMLElement;
      expect(root.style.getPropertyValue('--color-accent-a')).toBe('#cd5e57');
      expect(root.style.getPropertyValue('--color-accent-b')).toBe('#da7e1b');
    });

    it('renders with no inline style when the prop is omitted — existing consumers unaffected', () => {
      const { container } = render(
        <AudioSettingSection
          value={makeValue()}
          onAudioModeChange={() => {}}
          onVolumeChange={() => {}}
          onVolumeLfoChange={() => {}}
        />,
      );
      const root = container.querySelector('.sc-accordion') as HTMLElement;
      expect(root.getAttribute('style')).toBeNull();
    });
  });
});
