import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

let lastOnComplete: (() => void) | undefined;

vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn((config?: { onComplete?: () => void }) => {
      lastOnComplete = config?.onComplete;
      return { to: vi.fn(), kill: vi.fn() };
    }),
  },
}));

vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

import { LfoTargetGroup } from './LfoTargetGroup';
import { useLfoTargetGroup, type LfoTargetGroupField } from './useLfoTargetGroup';
import type { LfoValue } from '@/types/controls';

function lfo(rate: number): LfoValue {
  return { shape: 'sine', rate, depth: 50 };
}

const FIELDS: LfoTargetGroupField[] = [
  { field: 'low', label: 'Low', lfoValue: lfo(1) },
  { field: 'mid', label: 'Mid', lfoValue: lfo(2) },
  { field: 'high', label: 'High', lfoValue: lfo(3) },
];

// renderField deliberately wires no click/focus handling of its own — the row wrapper
// LfoTargetGroup renders around it is what must supply the "click/click-around" targeting.
function renderField(field: string, targeted: boolean) {
  return <span data-testid={`field-${field}`}>{targeted ? `${field}:targeted` : field}</span>;
}

function flushTransition() {
  act(() => {
    lastOnComplete?.();
  });
}

describe('LfoTargetGroup', () => {
  beforeEach(() => {
    lastOnComplete = undefined;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('is a thin wrapper around the useLfoTargetGroup hook, both importable independently', () => {
    // Task 3 (AudioRigDrawer) calls useLfoTargetGroup directly, from its own module, against
    // its own pre-rendered rows — one source of truth for the state machine, two consumers.
    expect(typeof LfoTargetGroup).toBe('function');
    expect(typeof useLfoTargetGroup).toBe('function');
  });

  it('renders exactly one row per fields entry, defaulting the first to targeted', () => {
    const { container } = render(
      <LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} />,
    );
    const rows = container.querySelectorAll('.sc-lfo-target-group__row');
    expect(rows).toHaveLength(3);
    expect(rows[0].classList.contains('isActive')).toBe(true);
    expect(rows[1].classList.contains('isActive')).toBe(false);
    expect(rows[2].classList.contains('isActive')).toBe(false);
    expect(screen.getByTestId('field-low').textContent).toBe('low:targeted');
  });

  it('renders exactly one shared Lfo display regardless of field count, showing the targeted field', () => {
    render(<LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} />);
    // renderField's own stub renders no sliders of its own — these 2 (Rate, Depth) can only
    // come from the one shared Lfo display.
    expect(screen.getAllByRole('slider')).toHaveLength(2);
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('renders no AccordionContainer anywhere inside itself', () => {
    const { container } = render(
      <LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} />,
    );
    expect(container.querySelectorAll('.sc-accordion')).toHaveLength(0);
  });

  it('renders driftContent inside the same wrapper, below the shared Lfo display, only when passed', () => {
    const { container, rerender } = render(
      <LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} />,
    );
    expect(container.querySelector('[data-testid="drift"]')).toBeNull();

    rerender(
      <LfoTargetGroup
        groupId="audioRig.eq3"
        fields={FIELDS}
        onLfoChange={() => {}}
        renderField={renderField}
        driftContent={<div data-testid="drift">Drift</div>}
      />,
    );
    const root = container.querySelector('.sc-lfo-target-group')!;
    const display = container.querySelector('.sc-lfo-target-group__display')!;
    const drift = screen.getByTestId('drift');
    expect(root.contains(drift)).toBe(true);
    // Comes after the display in document order — "directly beneath" per spec §1.2.
    expect(display.compareDocumentPosition(drift) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("calls onLfoChange with the currently-selected field when the shared Lfo control's value changes", () => {
    const onLfoChange = vi.fn();
    render(<LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={onLfoChange} renderField={renderField} />);
    fireEvent.click(screen.getByRole('radio', { name: 'SQUARE' }));
    expect(onLfoChange).toHaveBeenCalledWith('low', { ...lfo(1), shape: 'square' });
  });

  it('clicking anywhere in a row (click-around, not just the rendered control) selects that row after the transition completes', () => {
    const { container } = render(
      <LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} />,
    );
    const rows = container.querySelectorAll('.sc-lfo-target-group__row');
    fireEvent.click(rows[1]);
    flushTransition();

    expect(rows[1].classList.contains('isActive')).toBe(true);
    expect(rows[0].classList.contains('isActive')).toBe(false);
    expect(screen.getByText('Mid')).toBeTruthy();
  });

  it('keyboard-focusing a row selects it, same as clicking', () => {
    const { container } = render(
      <LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} />,
    );
    const rows = container.querySelectorAll('.sc-lfo-target-group__row');
    fireEvent.focus(rows[2]);
    flushTransition();

    expect(rows[2].classList.contains('isActive')).toBe(true);
    expect(screen.getByText('High')).toBeTruthy();
  });

  it("passes renderField the row's own select callback as its third argument", () => {
    const received: Array<() => void> = [];
    const { container } = render(
      <LfoTargetGroup
        groupId="audioRig.eq3"
        fields={FIELDS}
        onLfoChange={() => {}}
        renderField={(field, _targeted, select) => {
          received.push(select);
          return <span data-testid={`field-${field}`}>{field}</span>;
        }}
      />,
    );
    expect(received).toHaveLength(3);
    act(() => received[1]());
    flushTransition();
    const rows = container.querySelectorAll('.sc-lfo-target-group__row');
    expect(rows[1].classList.contains('isActive')).toBe(true);
  });

  it('shows the neutral placeholder display (disabled) while a target-swap transition is in flight', () => {
    const { container } = render(
      <LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} />,
    );
    const rows = container.querySelectorAll('.sc-lfo-target-group__row');
    fireEvent.click(rows[1]);
    // Before flushTransition() — the display is mid-transition.
    expect(container.querySelector('.sc-lfo-target-group__display')?.classList.contains('isActive')).toBe(true);
    expect(screen.getAllByRole('slider')[0].getAttribute('data-disabled')).toBe('');
  });

  it('disables the shared Lfo display when the disabled prop is true', () => {
    render(
      <LfoTargetGroup groupId="audioRig.eq3" fields={FIELDS} onLfoChange={() => {}} renderField={renderField} disabled />,
    );
    expect(screen.getAllByRole('slider')[0].getAttribute('data-disabled')).toBe('');
  });
});
