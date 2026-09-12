import type { CSSProperties } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PingContourDrawer } from './PingContourDrawer';
import type { ADSREnvelope } from '@/types/Robot';

const adsr: ADSREnvelope = { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 };

/** Stubs window.matchMedia so the mobile/tablet viewport tiers can be controlled — same shape
 *  as AudioRigDrawer.test.tsx's own stubMatchMedia. */
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

describe('PingContourDrawer', () => {
  it('reads Attack/Decay/Release from the value directly', () => {
    // SliderLog's Radix root operates on the internal t in [0,1] (see sliderLogMath.ts) —
    // aria-valuenow reflects t, not the schema-space value — so this checks the visible
    // formatted-value text instead, which is what actually shows the real domain value.
    const { container } = render(<PingContourDrawer value={adsr} onChange={() => {}} />);

    const values = Array.from(container.querySelectorAll('.sc-slider-log__value')).map((el) => el.textContent);
    expect(values).toEqual(['0.2s', '0.3s', '1.5s']);
  });

  it('Sustain displays as 0-100% of the stored 0..1 value', () => {
    render(<PingContourDrawer value={adsr} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: /sustain/i }).getAttribute('aria-valuenow')).toBe('80');
  });

  it('an Attack edit calls onChange with the full ADSREnvelope, only attack changed', () => {
    const onChange = vi.fn();
    render(<PingContourDrawer value={adsr} onChange={onChange} />);

    const attackSlider = screen.getByRole('slider', { name: /attack/i });
    fireEvent.keyDown(attackSlider, { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalled();
    const newAdsr = onChange.mock.calls[0][0] as ADSREnvelope;
    expect(newAdsr.attack).toBeGreaterThan(0.2);
    expect(newAdsr.decay).toBe(0.3);
    expect(newAdsr.sustain).toBe(0.8);
    expect(newAdsr.release).toBe(1.5);
  });

  it('a Sustain edit converts the displayed percent back to the stored 0..1 value', () => {
    const onChange = vi.fn();
    render(<PingContourDrawer value={adsr} onChange={onChange} />);

    const sustainSlider = screen.getByRole('slider', { name: /sustain/i });
    fireEvent.keyDown(sustainSlider, { key: 'ArrowLeft' });

    const newAdsr = onChange.mock.calls[0][0] as ADSREnvelope;
    expect(newAdsr.sustain).toBeLessThan(0.8);
    expect(newAdsr.sustain).toBeGreaterThanOrEqual(0);
  });

  it('wraps its controls in one Envelope accordion containing one Ping Contour panel (DIRECTIONAL_PANEL_WIRING Task 7) — keeps its old accordion\'s label as the panel\'s', () => {
    const { container } = render(<PingContourDrawer value={adsr} onChange={() => {}} />);
    expect(container.querySelectorAll('.sc-accordion')).toHaveLength(1);
    expect(screen.getAllByText('Envelope')).toHaveLength(1);
    const pingContourPanel = screen.getByText('Ping Contour').closest('.sc-directional-panel');
    expect(pingContourPanel).not.toBeNull();
    expect(pingContourPanel!.closest('.sc-accordion')?.textContent).toContain('Envelope');
    expect(pingContourPanel!.contains(screen.getByRole('slider', { name: /attack/i }))).toBe(true);
  });

  describe('Attack+Decay / Sustain+Release pairing (docs/specs/ROBOT_OPTIONS_RESPONSIVE_LAYOUT.md §1.4 — "two across" on desktop)', () => {
    it('Attack and Decay share a row, and Sustain and Release share a row, on desktop', () => {
      stubMatchMedia({ mobile: false, tablet: false });
      render(<PingContourDrawer value={adsr} onChange={() => {}} />);
      const attackRow = screen.getByRole('slider', { name: /attack/i }).closest('.sc-directional-panel')!;
      const decayRow = screen.getByRole('slider', { name: /decay/i }).closest('.sc-directional-panel')!;
      const sustainRow = screen.getByRole('slider', { name: /sustain/i }).closest('.sc-directional-panel')!;
      const releaseRow = screen.getByRole('slider', { name: /release/i }).closest('.sc-directional-panel')!;
      expect(attackRow).toBe(decayRow);
      expect(sustainRow).toBe(releaseRow);
      expect(attackRow).not.toBe(sustainRow);
      expect(attackRow.querySelector(':scope > .sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('row');
      expect(sustainRow.querySelector(':scope > .sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('row');
    });

    it('Attack, Decay, Sustain, and Release each get their own row on mobile/tablet', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      render(<PingContourDrawer value={adsr} onChange={() => {}} />);
      const attackRow = screen.getByRole('slider', { name: /attack/i }).closest('.sc-directional-panel')!;
      const decayRow = screen.getByRole('slider', { name: /decay/i }).closest('.sc-directional-panel')!;
      expect(attackRow).toBe(decayRow); // still the same shared sub-row panel...
      expect(attackRow.querySelector(':scope > .sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('column'); // ...just column-oriented now
    });

    it('preserves ADSR order: Attack, Decay, Sustain, Release', () => {
      render(<PingContourDrawer value={adsr} onChange={() => {}} />);
      const sliders = screen.getAllByRole('slider');
      expect(sliders.map((s) => s.getAttribute('aria-label'))).toEqual(['Attack', 'Decay', 'Sustain', 'Release']);
    });
  });

  it('disables every internal control when disabled is true', () => {
    render(<PingContourDrawer value={adsr} onChange={() => {}} disabled />);
    screen.getAllByRole('slider').forEach((slider) => {
      expect(slider.getAttribute('data-disabled')).toBe('');
    });
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<PingContourDrawer value={adsr} onChange={onChange} disabled />);
    fireEvent.keyDown(screen.getByRole('slider', { name: /attack/i }), { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  // Roadmap Phase 14 (docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.5, Task 10) — an optional
  // `style` prop forwarded to this drawer's own AccordionContainer, for trait-color scoping
  // (getTraitColorStyle('timeSpace'), applied at the RobotOptionsTab call site in Task 12).
  describe('style prop', () => {
    it('forwards a caller-supplied style to the drawer\'s own AccordionContainer root', () => {
      const { container } = render(
        <PingContourDrawer
          value={adsr}
          onChange={() => {}}
          style={{ '--color-accent-a': '#4f6d7a', '--color-accent-b': '#65617f' } as CSSProperties}
        />,
      );
      const root = container.querySelector('.sc-accordion') as HTMLElement;
      expect(root.style.getPropertyValue('--color-accent-a')).toBe('#4f6d7a');
      expect(root.style.getPropertyValue('--color-accent-b')).toBe('#65617f');
    });

    it('renders with no inline style when the prop is omitted — existing consumers unaffected', () => {
      const { container } = render(<PingContourDrawer value={adsr} onChange={() => {}} />);
      const root = container.querySelector('.sc-accordion') as HTMLElement;
      expect(root.getAttribute('style')).toBeNull();
    });
  });
});
