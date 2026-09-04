import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DirectionalPanel } from './DirectionalPanel';
import type { DirectionalPanelSchema } from '@/types/controls';

describe('DirectionalPanel', () => {
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
});
