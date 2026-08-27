import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PingControlsDrawer, type PingControlsValue } from './PingControlsDrawer';

function makeValue(overrides: Partial<PingControlsValue> = {}): PingControlsValue {
  return {
    rhythmicDensity: 50,
    rhythmicMotifLength: { active: true, value: 8 },
    noteVariance: { active: false, value: 1 },
    octaveRange: [3, 5],
    ...overrides,
  };
}

describe('PingControlsDrawer', () => {
  it('wraps its controls in exactly one AccordionContainer', () => {
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
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
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: /Note Variance/i }));

    expect(onNoteVarianceChange).toHaveBeenCalledWith({ active: true, value: 1 });
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
      />
    );

    expect(screen.queryByRole('button', { name: 'Reset Melody' })).toBeNull();
  });

  it('disables every internal control when disabled is true', () => {
    render(
      <PingControlsDrawer
        value={makeValue()}
        onDensityChange={() => {}}
        onMotifLengthChange={() => {}}
        onOctaveMinChange={() => {}}
        onOctaveMaxChange={() => {}}
        onNoteVarianceChange={() => {}}
        disabled
      />
    );

    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('data-disabled')).toBe('');
    expect((screen.getByRole('switch', { name: /Motif Length/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /Increment Octave Range Min/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
