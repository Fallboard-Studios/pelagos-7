import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

// Mocked the same way Button.test.tsx/Toggle.test.tsx/RadioButton.test.tsx mock
// CabinetBox — keeps this file's assertions about AccordionContainer's own
// wiring (which box gets which popped/boxHeight/timelineKey/skipMountAnimation)
// isolated from CabinetBox's already-proven internals (11.1.1). None of the
// existing tests below depend on CabinetBox's real rendering (title/indicator
// text, aria-expanded, the content-height tween all live outside it or pass
// through via `children`), so the mock is safe for the whole file.
vi.mock('./CabinetBox', () => ({
  CabinetBox: ({ popped, timelineKey, boxHeight, skipMountAnimation, children }: {
    popped: boolean | number; timelineKey: string; boxHeight?: number; skipMountAnimation?: boolean;
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="cabinet-box"
      data-timeline-key={timelineKey}
      data-popped={String(popped)}
      data-box-height={boxHeight}
      data-skip-mount-animation={String(!!skipMountAnimation)}
    >
      {children}
    </div>
  ),
}));

import { AccordionContainer, CABINET_ACCORDION_TRIGGER_HEIGHT } from './AccordionContainer';
import { CABINET_TOGGLE_BOX_SIZE } from './Toggle';
import { getAccordionDuration, ACCORDION_DURATION } from './accordionAnimation';
import { setTimeline, killTimeline } from '@/animation/timelineMap';
import type { AccordionSchema } from '@/types/controls';

const schema: AccordionSchema = { id: 'pingControls', type: 'accordion', humanLabel: 'Ping Controls' };

function stubMatchMedia(prefersReducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') && prefersReducedMotion,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('getAccordionDuration', () => {
  it('returns 0 when prefers-reduced-motion is set', () => {
    expect(getAccordionDuration(true)).toBe(0);
  });

  it('returns the animated duration otherwise', () => {
    expect(getAccordionDuration(false)).toBe(ACCORDION_DURATION);
    expect(getAccordionDuration(false)).toBeGreaterThan(0);
  });
});

describe('AccordionContainer', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders its own schema title via DualLabel in the trigger', () => {
    render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    expect(screen.getByText('Ping Controls')).toBeTruthy();
  });

  it('toggles aria-expanded on its trigger when clicked', () => {
    render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const trigger = screen.getByRole('button');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('registers a GSAP timeline via setTimeline on expand', () => {
    render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    fireEvent.click(screen.getByRole('button'));
    expect(setTimeline).toHaveBeenCalled();
  });

  it('calls killTimeline on unmount', () => {
    const { unmount } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    unmount();
    expect(killTimeline).toHaveBeenCalled();
  });

  it('still opens/closes under prefers-reduced-motion, snapping instead of animating', () => {
    stubMatchMedia(true);
    render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    // Still opens (aria-expanded flips) even though the transition snaps.
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(setTimeline).toHaveBeenCalled();
  });

  it('renders a decorative +/- open-state indicator to the left of the label, showing + when closed', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const indicator = container.querySelector('.sc-accordion__indicator');
    expect(indicator).toBeTruthy();
    expect(indicator?.getAttribute('aria-hidden')).toBe('true');
    expect(indicator?.textContent).toBe('+');
  });

  it('flips the open-state indicator to − when expanded', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    fireEvent.click(screen.getByRole('button'));
    const indicator = container.querySelector('.sc-accordion__indicator');
    expect(indicator?.textContent).toBe('−');
  });

  // Roadmap 11.1.7 — the trigger's only direct child is now the outer facade
  // CabinetBox, not the indicator/label directly; the same left-to-right
  // ordering guarantee holds one level deeper, inside .sc-accordion__row. See
  // docs/specs/OBLIQUE_CABINETRY_ACCORDION_CONTAINER.md §1.1/§5.
  it('places the indicator (toggle box) before the label within the trigger row, not after', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const row = container.querySelector('.sc-accordion__row');
    const children = Array.from(row?.children ?? []);
    const toggleBoxIndex = children.findIndex((el) => el.querySelector('.sc-accordion__indicator'));
    const labelIndex = children.findIndex((el) => el.classList.contains('sc-dual-label'));
    expect(toggleBoxIndex).toBeGreaterThanOrEqual(0);
    expect(toggleBoxIndex).toBeLessThan(labelIndex);
  });

  it('renders no status light in the trigger — removed, no longer useful once every caller\'s own domain concept went away', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    expect(container.querySelector('.sc-accordion__light')).toBeNull();
  });

  it('sets the content height to auto on mount when defaultOpen is true, so it is not visually collapsed despite aria-expanded="true"', () => {
    const { container } = render(<AccordionContainer schema={schema} defaultOpen>Content</AccordionContainer>);
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true');
    const content = container.querySelector('.sc-accordion__content') as HTMLElement;
    expect(content.style.height).toBe('auto');
  });

  it('leaves the content height unset on mount when defaultOpen is false (the default)', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const content = container.querySelector('.sc-accordion__content') as HTMLElement;
    expect(content.style.height).toBe('');
  });

  // Roadmap 11.1.7 — two nested CabinetBoxes: a permanently-popped facade
  // wrapping the whole row, and a small state-keyed toggle box in place of the
  // old plain +/- glyph. See docs/specs/OBLIQUE_CABINETRY_ACCORDION_CONTAINER.md §1.

  function facadeBox(container: HTMLElement) {
    return container.querySelector(`[data-timeline-key="cabinet-accordion-facade-${schema.id}"]`);
  }

  function toggleBox(container: HTMLElement) {
    return container.querySelector(`[data-timeline-key="cabinet-accordion-toggle-${schema.id}"]`);
  }

  it('renders exactly 2 CabinetBox instances — a facade and a toggle box, with distinct timelineKeys', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    expect(screen.getAllByTestId('cabinet-box')).toHaveLength(2);
    expect(facadeBox(container)).toBeTruthy();
    expect(toggleBox(container)).toBeTruthy();
  });

  it('keeps the facade permanently popped, before and after opening the section', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    expect(facadeBox(container)?.getAttribute('data-popped')).toBe('true');
    fireEvent.click(screen.getByRole('button'));
    expect(facadeBox(container)?.getAttribute('data-popped')).toBe('true');
    fireEvent.click(screen.getByRole('button'));
    expect(facadeBox(container)?.getAttribute('data-popped')).toBe('true');
  });

  it('passes skipMountAnimation and CABINET_ACCORDION_TRIGGER_HEIGHT to the facade, never to the toggle box', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    expect(facadeBox(container)?.getAttribute('data-skip-mount-animation')).toBe('true');
    expect(facadeBox(container)?.getAttribute('data-box-height')).toBe(String(CABINET_ACCORDION_TRIGGER_HEIGHT));
    expect(toggleBox(container)?.getAttribute('data-skip-mount-animation')).toBe('false');
  });

  it('mirrors open state on the toggle box\'s popped prop, exactly as the old plain indicator glyph did', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    expect(toggleBox(container)?.getAttribute('data-popped')).toBe('false');
    fireEvent.click(screen.getByRole('button'));
    expect(toggleBox(container)?.getAttribute('data-popped')).toBe('true');
  });

  it('sizes the toggle box with Toggle\'s own exported CABINET_TOGGLE_BOX_SIZE constant, not a redeclared number', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    expect(toggleBox(container)?.getAttribute('data-box-height')).toBe(String(CABINET_TOGGLE_BOX_SIZE));
  });

  it('renders the +/- glyph inside the toggle box specifically, not directly inside the facade', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const indicator = container.querySelector('.sc-accordion__indicator');
    // The toggle box is itself nested inside the facade (§1.1), so the
    // facade's own subtree *does* contain the indicator too — the
    // meaningful check is which cabinet-box the indicator's nearest
    // ancestor is, not merely "is it somewhere under the facade."
    expect(indicator?.closest('[data-testid="cabinet-box"]')).toBe(toggleBox(container));
  });
});
