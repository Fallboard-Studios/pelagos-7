import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

import { AccordionContainer } from './AccordionContainer';
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

  it('renders a decorative status light in the trigger, hidden from the accessibility tree', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const light = container.querySelector('.sc-accordion__light');
    expect(light).toBeTruthy();
    expect(light?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sets data-transitioning on the light as soon as the accordion is toggled', () => {
    const { container } = render(<AccordionContainer schema={schema}>Content</AccordionContainer>);
    const light = container.querySelector('.sc-accordion__light');
    expect(light?.getAttribute('data-transitioning')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(light?.getAttribute('data-transitioning')).toBe('true');
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
});
