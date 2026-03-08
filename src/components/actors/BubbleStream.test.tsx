/** @vitest-environment jsdom */
import React from 'react';
import ReactDOM from 'react-dom';
import { timelineMap } from '../../animation/timelineMap';
import BubbleStream from './BubbleStream';

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
    ReactDOM.render(<BubbleStream {...props} />, container);

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
    ReactDOM.render(<BubbleStream {...props} />, container);
    const key = `bubble-${props.actorId}`;
    const tl = timelineMap.get(key);
    expect(tl).toBeDefined();
    ReactDOM.render(<BubbleStream {...props} isActive={false} />, container);
    expect(tl?.paused()).toBe(true);
  });
});