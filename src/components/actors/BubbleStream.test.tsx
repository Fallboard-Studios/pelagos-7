import React from 'react';
// stub gsap timeline for tests to avoid DOM dependency
vi.mock('gsap', () => ({
  timeline: () => {
    const tl: any = {
      fromTo: () => tl,
      play: () => tl,
      pause: () => tl,
      repeat: () => -1,
      kill: () => {},
      paused: () => false,
    };
    return tl;
  },
}));

import * as ReactDOM from 'react-dom/client';

import { timelineMap } from '../../animation/timelineMap';
import BubbleStream from './BubbleStream';
import { describe, it, expect, afterEach } from 'vitest';

describe('BubbleStream', () => {
  afterEach(() => {
    timelineMap.clear();
  });

  it('renders a circle and registers a timeline in timelineMap', () => {
    const props = {
      actorId: 'actor-1',
      ventX: 100,
      ventY: 200,
      seed: 42,
      isActive: true,
    };
    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);
    root.render(<BubbleStream {...props} />);

    const circle = container.querySelector('circle');
    expect(circle).not.toBeNull();
    expect(circle?.getAttribute('cx')).toBe('100');
    expect(circle?.getAttribute('cy')).toBe('200');

    const key = `bubble-${props.actorId}`;
    expect(timelineMap.has(key)).toBe(true);
    const tl = timelineMap.get(key);
    expect(tl).toBeDefined();
    expect((tl as any).repeat()).toBe(-1);
  });

  it('pauses timeline when isActive becomes false', () => {
    const props = {
      actorId: 'actor-2',
      ventX: 50,
      ventY: 50,
      seed: 7,
      isActive: true,
    };
    const container = document.createElement('div');
    const root = ReactDOM.createRoot(container);
    root.render(<BubbleStream {...props} />);
    const key = `bubble-${props.actorId}`;
    const tl = timelineMap.get(key);
    expect(tl).toBeDefined();
    ReactDOM.render(<BubbleStream {...props} isActive={false} />, container);
    expect(tl?.paused()).toBe(true);
  });
});