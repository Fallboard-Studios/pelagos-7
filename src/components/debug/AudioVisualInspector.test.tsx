import { describe, it, expect } from 'vitest';
import AudioVisualInspector from './AudioVisualInspector';

describe('AudioVisualInspector', () => {
  it('exports a component function', () => {
    expect(typeof AudioVisualInspector).toBe('function');
  });
});
