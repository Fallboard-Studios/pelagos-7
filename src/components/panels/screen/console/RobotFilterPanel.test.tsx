import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));

// Lightweight stand-in for CompanyManager (the real thing renders a whole RadioButton row plus
// TextInputs — irrelevant to this panel's own responsive-shell logic; same "mock a real, heavy
// child" precedent AccordionContainer.test.tsx uses for CabinetBox).
vi.mock('@/components/company/CompanyManager', () => ({
  CompanyManager: () => <div data-testid="company-manager-mock" />,
}));

import { RobotFilterPanel } from './RobotFilterPanel';
import { setTimeline } from '@/animation/timelineMap';
import { useUIStore } from '@/stores/uiStore';

/** Same shape as useResponsivePanelOrientation.test.ts's own stubMatchMedia — this component
 *  reads the same useCabinetTier() tier detection (mobile: max-width 640px, tablet: max-width
 *  1024px, desktop: neither). */
function stubMatchMedia(initial: { mobile: boolean; tablet: boolean }) {
  const state = { ...initial };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        if (query.includes('prefers-reduced-motion')) return false;
        return query.includes('640px') ? state.mobile : state.tablet;
      },
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe('RobotFilterPanel', () => {
  beforeEach(() => {
    stubMatchMedia({ mobile: false, tablet: false }); // desktop by default
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    useUIStore.getState().selectCompany(null);
  });

  it("renders CompanyManager's own content regardless of tier", () => {
    render(<RobotFilterPanel />);
    expect(screen.getByTestId('company-manager-mock')).toBeTruthy();
  });

  describe('desktop tier', () => {
    it('renders no toggle button', () => {
      render(<RobotFilterPanel />);
      expect(screen.queryByRole('button', { name: /filters/i })).toBeNull();
    });

    it("carries data-tier='desktop' on its own root", () => {
      const { container } = render(<RobotFilterPanel />);
      expect(container.querySelector('.robot-filter-panel')?.getAttribute('data-tier')).toBe('desktop');
    });
  });

  describe('mobile/tablet tiers', () => {
    it('renders a toggle button at mobile tier', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      render(<RobotFilterPanel />);
      expect(screen.getByRole('button', { name: /filters/i })).toBeTruthy();
    });

    it('renders a toggle button at tablet tier', () => {
      stubMatchMedia({ mobile: false, tablet: true });
      render(<RobotFilterPanel />);
      expect(screen.getByRole('button', { name: /filters/i })).toBeTruthy();
    });

    it("carries data-tier='mobile'/'tablet' on its own root, matching the stubbed query", () => {
      stubMatchMedia({ mobile: true, tablet: true });
      const { container } = render(<RobotFilterPanel />);
      expect(container.querySelector('.robot-filter-panel')?.getAttribute('data-tier')).toBe('mobile');
    });

    it('starts closed — no isActive class on the panel root', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      const { container } = render(<RobotFilterPanel />);
      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(false);
    });

    it('adds the isActive class when the toggle is clicked, and removes it on a second click', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      const { container } = render(<RobotFilterPanel />);
      const toggle = screen.getByRole('button', { name: /filters/i });

      fireEvent.click(toggle);
      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(true);

      fireEvent.click(toggle);
      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(false);
    });

    it('registers a GSAP timeline (under its own dedicated key) via setTimeline when the toggle opens the panel', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      render(<RobotFilterPanel />);
      fireEvent.click(screen.getByRole('button', { name: /filters/i }));
      // setTimeline is also called by Button's own internal CabinetBox (an unrelated pop
      // animation) — filter to this panel's own key so the assertion is specific to its slide.
      expect(setTimeline).toHaveBeenCalledWith('robot-filter-panel', expect.anything());
    });

    it('does not auto-close (or touch its own GSAP timeline) purely from mounting with a pre-existing selection', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      useUIStore.getState().selectCompany('c1');

      render(<RobotFilterPanel />);

      expect(setTimeline).not.toHaveBeenCalledWith('robot-filter-panel', expect.anything());
    });

    it('auto-closes when a company is selected while the panel is open', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      const { container } = render(<RobotFilterPanel />);
      fireEvent.click(screen.getByRole('button', { name: /filters/i })); // open
      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(true);

      act(() => { useUIStore.getState().selectCompany('c1'); });

      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(false);
    });

    it('auto-closes when "All" (selectAllRobots) is chosen while the panel is open', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      const { container } = render(<RobotFilterPanel />);
      fireEvent.click(screen.getByRole('button', { name: /filters/i })); // open
      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(true);

      act(() => { useUIStore.getState().selectAllRobots(); });

      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(false);
    });

    it('does not auto-close if the panel is already closed when the selection changes', () => {
      stubMatchMedia({ mobile: true, tablet: true });
      const { container } = render(<RobotFilterPanel />);
      // Never opened.
      act(() => { useUIStore.getState().selectCompany('c1'); });
      expect(container.querySelector('.robot-filter-panel')?.classList.contains('isActive')).toBe(false);
    });
  });

  it('kills its GSAP timeline on unmount', async () => {
    const { killTimeline } = await import('@/animation/timelineMap');
    stubMatchMedia({ mobile: true, tablet: true });
    const { unmount } = render(<RobotFilterPanel />);
    unmount();
    expect(killTimeline).toHaveBeenCalled();
  });

  // Bugfix, found live (docs/todo/backlog.md #27 follow-up) — same class as CompanyManager's own
  // documented fix: RobotsTab re-renders on every audio-swell tick (~8-9x/sec), and this panel
  // takes zero props, so a memo boundary is correct and sufficient (an empty prop list can never
  // differ) — it still re-renders normally when its own selectedCompanyId/allRobotsSelected
  // subscriptions actually change.
  it('is a React.memo-wrapped component', () => {
    expect((RobotFilterPanel as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});
