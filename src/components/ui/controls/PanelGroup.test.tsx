import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { PanelGroup } from './PanelGroup';
import { DirectionalPanel } from './DirectionalPanel';
import type { DirectionalPanelSchema } from '@/types/controls';

vi.mock('./CabinetBox', () => ({
  CabinetBox: ({ timelineKey, children }: { timelineKey: string; children?: React.ReactNode }) => (
    <div data-testid="cabinet-box" data-timeline-key={timelineKey}>{children}</div>
  ),
}));

/**
 * Stubs window.matchMedia so the mobile (max-width: 640px) and tablet
 * (max-width: 1024px) queries can be controlled and their 'change'
 * listeners fired manually — same shape as
 * useResponsivePanelOrientation.test.ts's own stubMatchMedia, since
 * orientation="responsive" resolves through that same hook, which
 * subscribes once via addEventListener rather than re-querying
 * matchMedia on every render.
 */
function stubMatchMedia(initial: { mobile: boolean; tablet: boolean }) {
  const state = { ...initial };
  const listeners = new Map<string, Set<(e: { matches: boolean }) => void>>();

  function queryKind(query: string): 'mobile' | 'tablet' {
    return query.includes('640px') ? 'mobile' : 'tablet';
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const kind = queryKind(query);
      if (!listeners.has(query)) listeners.set(query, new Set());
      return {
        get matches() {
          return state[kind];
        },
        media: query,
        addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
          listeners.get(query)!.add(cb);
        },
        removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
          listeners.get(query)!.delete(cb);
        },
      };
    }),
  });

  return {
    fireChange(kind: 'mobile' | 'tablet', matches: boolean) {
      state[kind] = matches;
      for (const [query, cbs] of listeners) {
        if (queryKind(query) === kind) {
          cbs.forEach((cb) => cb({ matches }));
        }
      }
    },
  };
}

describe('PanelGroup', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders its children', () => {
    render(
      <PanelGroup orientation="column">
        <span>Low</span>
      </PanelGroup>,
    );
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('renders data-orientation="row" for a fixed row orientation', () => {
    const { container } = render(
      <PanelGroup orientation="row">
        <span>Low</span>
      </PanelGroup>,
    );
    expect(container.firstElementChild?.getAttribute('data-orientation')).toBe('row');
  });

  it('renders data-orientation="column" for a fixed column orientation', () => {
    const { container } = render(
      <PanelGroup orientation="column">
        <span>Low</span>
      </PanelGroup>,
    );
    expect(container.firstElementChild?.getAttribute('data-orientation')).toBe('column');
  });

  it('orientation="responsive" resolves "column" on mobile/tablet, "row" on desktop', () => {
    const { fireChange } = stubMatchMedia({ mobile: true, tablet: true });
    const { container } = render(
      <PanelGroup orientation="responsive">
        <span>Low</span>
      </PanelGroup>,
    );
    expect(container.firstElementChild?.getAttribute('data-orientation')).toBe('column');

    act(() => {
      fireChange('mobile', false);
      fireChange('tablet', false);
    });
    expect(container.firstElementChild?.getAttribute('data-orientation')).toBe('row');
  });

  it("gives itself a bigger gap than DirectionalPanel's own 8px default — the whole point of this component is visible breathing room between independently-faceted panels", () => {
    const { container } = render(
      <PanelGroup orientation="column">
        <span>Low</span>
      </PanelGroup>,
    );
    expect((container.firstElementChild as HTMLElement)?.style.gap).toBe('0.75rem');
  });

  it('does NOT provide its own DirectionalPanelNestingContext value — a DirectionalPanel child stays top-level (own facade), unlike nesting inside another DirectionalPanel', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3', type: 'directionalPanel' };
    const { container } = render(
      <PanelGroup orientation="row">
        <DirectionalPanel schema={schema}>
          <span>Low</span>
        </DirectionalPanel>
      </PanelGroup>,
    );
    // A top-level DirectionalPanel renders through the (mocked) CabinetBox facade.
    expect(container.querySelector('[data-testid="cabinet-box"]')).toBeTruthy();
  });

  it('multiple DirectionalPanel children each get their own independent facade — not one shared facade', () => {
    const schemaA: DirectionalPanelSchema = { id: 'a', type: 'directionalPanel' };
    const schemaB: DirectionalPanelSchema = { id: 'b', type: 'directionalPanel' };
    const { container } = render(
      <PanelGroup orientation="row">
        <DirectionalPanel schema={schemaA}>
          <span>A</span>
        </DirectionalPanel>
        <DirectionalPanel schema={schemaB}>
          <span>B</span>
        </DirectionalPanel>
      </PanelGroup>,
    );
    const boxes = container.querySelectorAll('[data-testid="cabinet-box"]');
    expect(boxes).toHaveLength(2);
  });
});
