import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { DirectionalPanel } from './DirectionalPanel';
import type { DirectionalPanelSchema } from '@/types/controls';

/** Controllable ResizeObserver mock — same shape as useAutoPanelOrientation.test.ts's own,
 *  overriding the repo's no-op polyfill (vitest.setup.ts) for the duration of each test here. */
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  fire(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

let originalResizeObserver: typeof ResizeObserver;

describe('DirectionalPanel', () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    originalResizeObserver = globalThis.ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
  });

  afterEach(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = originalResizeObserver;
  });

  it('renders its children', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel' };
    render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
      </DirectionalPanel>,
    );
    expect(screen.getByText('Low')).toBeTruthy();
  });

  it('renders neither label when loreLabel/humanLabel are both absent', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel' };
    const { container } = render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
      </DirectionalPanel>,
    );
    expect(container.querySelector('.sc-dual-label')).toBeNull();
  });

  it('renders its own schema labels via an internally-composed DualLabel', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel', loreLabel: 'TONAL SHAPE', humanLabel: 'EQ' };
    render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
      </DirectionalPanel>,
    );
    expect(screen.getByText('TONAL SHAPE')).toBeTruthy();
    expect(screen.getByText('EQ')).toBeTruthy();
  });

  it('renders only loreLabel when humanLabel is absent', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel', loreLabel: 'TONAL SHAPE' };
    render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
      </DirectionalPanel>,
    );
    expect(screen.getByText('TONAL SHAPE')).toBeTruthy();
  });

  it('renders only humanLabel when loreLabel is absent', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel', humanLabel: 'EQ' };
    render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
      </DirectionalPanel>,
    );
    expect(screen.getByText('EQ')).toBeTruthy();
  });

  it('defaults to row orientation when schema.orientation is omitted', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel' };
    const { container } = render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
      </DirectionalPanel>,
    );
    expect(container.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('row');
  });

  it('renders data-orientation="row" when explicitly set', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel', orientation: 'row' };
    const { container } = render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
      </DirectionalPanel>,
    );
    expect(container.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('row');
  });

  it('renders data-orientation="column" when set', () => {
    const schema: DirectionalPanelSchema = { id: 'signatureArrayLayer', type: 'directionalPanel', orientation: 'column' };
    const { container } = render(
      <DirectionalPanel schema={schema}>
        <span>Layer 1</span>
      </DirectionalPanel>,
    );
    expect(container.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('column');
  });

  it('renders multiple children in the order they were passed, regardless of orientation', () => {
    const schema: DirectionalPanelSchema = { id: 'eq3Panel', type: 'directionalPanel', orientation: 'column' };
    const { container } = render(
      <DirectionalPanel schema={schema}>
        <span>Low</span>
        <span>Mid</span>
        <span>High</span>
      </DirectionalPanel>,
    );
    const content = container.querySelector('.sc-directional-panel__content');
    const texts = Array.from(content?.children ?? []).map((el) => el.textContent);
    expect(texts).toEqual(['Low', 'Mid', 'High']);
  });

  describe('orientation="auto" (docs/tasks/DIRECTIONAL_PANEL_WIRING.md follow-up: row when there\'s room)', () => {
    it('renders data-orientation="column" before any measurement — the narrower, safer fallback', () => {
      const schema: DirectionalPanelSchema = { id: 'eqFiltersRow', type: 'directionalPanel', orientation: 'auto' };
      const { container } = render(
        <DirectionalPanel schema={schema}>
          <span>Low</span>
        </DirectionalPanel>,
      );
      expect(container.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('column');
    });

    it('observes its own parent element, not its own box', () => {
      const schema: DirectionalPanelSchema = { id: 'eqFiltersRow', type: 'directionalPanel', orientation: 'auto' };
      const { container } = render(
        <div data-testid="parent">
          <DirectionalPanel schema={schema}>
            <span>Low</span>
          </DirectionalPanel>
        </div>,
      );
      expect(MockResizeObserver.instances).toHaveLength(1);
      const panelRoot = container.querySelector('.sc-directional-panel')!;
      expect(panelRoot.parentElement?.getAttribute('data-testid')).toBe('parent');
    });

    it('flips to data-orientation="row" once the measured parent is wide enough', () => {
      const schema: DirectionalPanelSchema = { id: 'eqFiltersRow', type: 'directionalPanel', orientation: 'auto' };
      const { container } = render(
        <DirectionalPanel schema={schema}>
          <span>Low</span>
        </DirectionalPanel>,
      );
      const observer = MockResizeObserver.instances[0];

      act(() => observer.fire(1000, 200));

      expect(container.querySelector('.sc-directional-panel__content')?.getAttribute('data-orientation')).toBe('row');
    });
  });
});
