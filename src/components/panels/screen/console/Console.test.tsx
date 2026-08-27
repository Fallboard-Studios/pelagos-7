import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

import Console from './Console';
import { useUIStore } from '@/stores/uiStore';

// This test is about Console's own pointer-events gate (Roadmap Phase 8, Task 10), not about
// ConsolePanel's content — same boundary ConsolePanel.test.tsx already draws around
// RobotsTab/RobotOptionsTab/AudioRigDrawer/SectorSettingsDrawer. vi.mock calls are hoisted above
// imports automatically, so declaration order here doesn't affect the mock taking effect.
vi.mock('./ConsolePanel', () => ({
  ConsolePanel: () => <div data-testid="console-panel-stub" />,
  default: () => <div data-testid="console-panel-stub" />,
}));

describe('Console', () => {
  beforeEach(() => {
    useUIStore.getState().setActiveHubTile(null);
  });

  it('adds console--grid when activeHubTile is null (the hub grid state)', () => {
    const { container } = render(<Console />);
    const root = container.querySelector('.console');
    expect(root?.classList.contains('console--grid')).toBe(true);
  });

  it('does not add console--grid when a tile is active', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    const { container } = render(<Console />);
    const root = container.querySelector('.console');
    expect(root?.classList.contains('console--grid')).toBe(false);
  });

  it('does not add console--grid when the robots tile is active', () => {
    useUIStore.getState().setActiveHubTile('robots');
    const { container } = render(<Console />);
    const root = container.querySelector('.console');
    expect(root?.classList.contains('console--grid')).toBe(false);
  });
});
