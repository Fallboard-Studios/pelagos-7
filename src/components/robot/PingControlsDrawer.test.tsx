import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mutable so the Click Track dev-gating tests can flip DEV_TUNING false without faking
// import.meta.env.DEV directly — same pattern lfoDebug.test.ts already uses for the same flag.
let mockDevTuning = true;
vi.mock('@/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constants')>();
  return { ...actual, get DEV_TUNING() { return mockDevTuning; } };
});

import { PingControlsDrawer, type PingControlsValue } from './PingControlsDrawer';

function makeValue(overrides: Partial<PingControlsValue> = {}): PingControlsValue {
  return {
    rhythmicDensity: 50,
    rhythmicMotifLength: { active: true, value: 8 },
    noteVariance: { active: false, value: 1 },
    pitchRepeat: 0,
    octaveRange: [3, 5],
    clickTrackActive: false,
    ...overrides,
  };
}

describe('PingControlsDrawer', () => {
  beforeEach(() => {
    mockDevTuning = true;
  });

  it('wraps its controls in exactly one AccordionContainer', () => {
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );
    expect(screen.getAllByText('Ping Controls')).toHaveLength(1);
  });

  it('changing Density calls onDensityChange', () => {
    const onDensityChange = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={onDensityChange}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    fireEvent.keyDown(screen.getByRole('slider', { name: /density/i }), { key: 'ArrowRight' });

    expect(onDensityChange).toHaveBeenCalledWith(51);
  });

  it('changing Motif Length\'s active toggle calls onMotifLengthChange', () => {
    const onMotifLengthChange = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue({ rhythmicMotifLength: { active: false, value: 4 } })}
        onDensityChange={() => {}}
        onMotifLengthChange={onMotifLengthChange}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: /Motif Length/i }));

    expect(onMotifLengthChange).toHaveBeenCalledWith({ active: true, value: 4 });
  });

  it('changing Octave Range Min calls onOctaveMinChange', () => {
    const onOctaveMinChange = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue({ octaveRange: [3, 5] })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={onOctaveMinChange}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Increment Octave Range Min/i }));

    expect(onOctaveMinChange).toHaveBeenCalledWith(4);
  });

  it('changing Octave Range Max calls onOctaveMaxChange', () => {
    const onOctaveMaxChange = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue({ octaveRange: [3, 5] })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={onOctaveMaxChange}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Decrement Octave Range Max/i }));

    expect(onOctaveMaxChange).toHaveBeenCalledWith(4);
  });

  it('changing Note Variance\'s active toggle calls onNoteVarianceChange', () => {
    const onNoteVarianceChange = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue({ noteVariance: { active: false, value: 1 } })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={onNoteVarianceChange}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: /Note Variance/i }));

    expect(onNoteVarianceChange).toHaveBeenCalledWith({ active: true, value: 1 });
  });

  it('changing Pitch Repeat calls onPitchRepeatChange', () => {
    const onPitchRepeatChange = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue({ pitchRepeat: 50, rhythmicMotifLength: { active: true, value: 8 } })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={onPitchRepeatChange}
      />
    );

    fireEvent.keyDown(screen.getByRole('slider', { name: /pitch repeat/i }), { key: 'ArrowRight' });

    expect(onPitchRepeatChange).toHaveBeenCalledWith(51);
  });

  it('Pitch Repeat is disabled when rhythmicMotifLength.active is false, even though generationDisabled is otherwise false', () => {
    render(
      <PingControlsDrawer
        value={makeValue({ rhythmicMotifLength: { active: false, value: 8 } })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    // Density is NOT disabled here (motif being off doesn't gate it) — contrast confirms the
    // Pitch Repeat disabled state comes specifically from the motif gate, not generationDisabled.
    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('data-disabled')).toBeNull();
    expect(screen.getByRole('slider', { name: /pitch repeat/i }).getAttribute('data-disabled')).toBe('');
  });

  it('Pitch Repeat is enabled when rhythmicMotifLength.active is true and nothing else disables generation', () => {
    render(
      <PingControlsDrawer
        value={makeValue({ rhythmicMotifLength: { active: true, value: 8 } })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    expect(screen.getByRole('slider', { name: /pitch repeat/i }).getAttribute('data-disabled')).toBeNull();
  });

  it('Reset Melody is a plain one-click Button when onResetMelody is provided - no confirmation dialog', () => {
    const onResetMelody = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
        onResetMelody={onResetMelody}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset Melody' }));

    expect(onResetMelody).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('omits the Reset Melody button entirely when onResetMelody is not provided (company mode)', () => {
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: 'Reset Melody' })).toBeNull();
  });

  it('renders the Click Track toggle regardless of mode — unlike Reset Melody, it has a company-scoped meaning', () => {
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    expect(screen.getByRole('switch', { name: /Click Track/i })).toBeTruthy();
  });

  it('omits the Click Track toggle entirely when DEV_TUNING is false — never reachable in a production build', () => {
    mockDevTuning = false;
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
      />
    );

    expect(screen.queryByRole('switch', { name: /Click Track/i })).toBeNull();
  });

  it('toggling Click Track calls onClickTrackActiveChange', () => {
    const onClickTrackActiveChange = vi.fn();
    render(
      <PingControlsDrawer
        value={makeValue({ clickTrackActive: false })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={onClickTrackActiveChange}
        onPitchRepeatChange={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: /Click Track/i }));

    expect(onClickTrackActiveChange).toHaveBeenCalledWith(true);
  });

  it('disables Density/Motif Length/Octave Range/Note Variance/Reset Melody, but not the Click Track toggle itself, while Click Track is active', () => {
    render(
      <PingControlsDrawer
        value={makeValue({ clickTrackActive: true })}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
        onResetMelody={() => {}}
      />
    );

    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('data-disabled')).toBe('');
    expect((screen.getByRole('switch', { name: /Motif Length/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Increment Octave Range Min/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Reset Melody' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('switch', { name: /Click Track/i }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole('slider', { name: /pitch repeat/i }).getAttribute('data-disabled')).toBe('');
  });

  it('disables every internal control, including Click Track, when disabled is true', () => {
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        onClickTrackActiveChange={() => {}}
        onPitchRepeatChange={() => {}}
        disabled
      />
    );

    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('data-disabled')).toBe('');
    expect((screen.getByRole('switch', { name: /Motif Length/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Increment Octave Range Min/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('switch', { name: /Click Track/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('slider', { name: /pitch repeat/i }).getAttribute('data-disabled')).toBe('');
  });
});
