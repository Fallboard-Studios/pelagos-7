import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// SleeveContainer renders the real PowerRockerSwitch (Task 7's acceptance
// criteria require it actually be there, not a stub) — so it needs the same
// dependency mocks PowerRockerSwitch.test.tsx already uses to keep it from
// touching real power/audio/animation systems.
vi.mock('@/systems/powerController', () => ({
  powerController: { start: vi.fn(), shutdown: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));
vi.mock('@/stores/uiStore', () => {
  const useUIStore = (selector: unknown) =>
    typeof selector === 'function'
      ? (selector as (s: { isPoweredOn: boolean }) => unknown)({ isPoweredOn: false })
      : { isPoweredOn: false };
  (useUIStore as unknown as { getState: () => unknown }).getState = () => ({
    setPowerOn: vi.fn(),
    setPowerOff: vi.fn(),
  });
  return { useUIStore };
});

import SleeveContainer from './SleeveContainer';

// Any element a user could interact with — used by the guardrail check below.
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"]';

describe('SleeveContainer (Task 7 — cutaway structure)', () => {
  describe('hasPowerSwitch instance', () => {
    it('renders a power corner containing PowerRockerSwitch', () => {
      const { container } = render(<SleeveContainer hasPowerSwitch />);
      const corner = container.querySelector('.sleeve-container__power-corner');
      expect(corner).toBeTruthy();
      // PowerRockerSwitch's own rocker button lives inside it.
      expect(corner?.querySelector('button')).toBeTruthy();
    });

    it('does not also render the plain sleeve-logo bar', () => {
      // Edge case: the cutaway structure replaces this instance's markup
      // entirely — it must not render both the old bar AND the new corner/strip.
      const { container } = render(<SleeveContainer hasPowerSwitch />);
      expect(container.querySelector('.sleeve-logo')).toBeNull();
    });

    it('has no interactive element other than PowerRockerSwitch’s own button (guardrail check)', () => {
      const { container } = render(<SleeveContainer hasPowerSwitch />);
      const interactive = container.querySelectorAll(INTERACTIVE_SELECTOR);
      expect(interactive.length).toBe(1);
    });

    it('carries the --cutaway modifier on its own root element', () => {
      // Correction found while starting Task 8: the plan's Architecture
      // Decision says the power instance is "taken out of flex flow" so
      // ScreenViewport can become flush with the top of .tablet — that
      // requires the <aside> ROOT to be position: absolute, not just its
      // two children. Without this modifier class, the root stays a normal
      // 64px-tall flex child and nothing is actually freed up.
      const { container } = render(<SleeveContainer hasPowerSwitch />);
      const root = container.querySelector('.sleeve-container');
      expect(root?.classList.contains('sleeve-container--cutaway')).toBe(true);
    });
  });

  describe('non-power instance', () => {
    it('renders only the sleeve-logo, unchanged', () => {
      const { container } = render(<SleeveContainer />);
      expect(container.querySelector('.sleeve-logo')).toBeTruthy();
      expect(container.textContent).toContain('PELAGOS');
    });

    it('renders none of the cutaway markup', () => {
      // Edge case: the cutaway is exclusive to the hasPowerSwitch instance —
      // the plain bottom bar must not pick up either new element.
      const { container } = render(<SleeveContainer />);
      expect(container.querySelector('.sleeve-container__power-corner')).toBeNull();
      expect(container.querySelector('.sleeve-container__top-strip')).toBeNull();
    });

    it('has no interactive elements at all', () => {
      const { container } = render(<SleeveContainer />);
      expect(container.querySelectorAll(INTERACTIVE_SELECTOR).length).toBe(0);
    });

    it('does not carry the --cutaway modifier — stays a normal flex child', () => {
      const { container } = render(<SleeveContainer />);
      const root = container.querySelector('.sleeve-container');
      expect(root?.classList.contains('sleeve-container--cutaway')).toBe(false);
    });
  });
});
