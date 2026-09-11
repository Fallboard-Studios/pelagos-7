import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

import Console from './Console';
import { useUIStore } from '@/stores/uiStore';

// This test is about Console's own render-nothing-when-blank gate
// (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.7), not about ConsolePanel's
// content — same boundary ConsolePanel.test.tsx already draws around
// RobotsTab/RobotOptionsTab/AudioRigDrawer/SectorSettingsDrawer. vi.mock
// calls are hoisted above imports automatically, so declaration order here
// doesn't affect the mock taking effect.
vi.mock('./ConsolePanel', () => ({
  ConsolePanel: () => <div data-testid="console-panel-stub" />,
  default: () => <div data-testid="console-panel-stub" />,
}));

describe('Console', () => {
  beforeEach(() => {
    useUIStore.getState().setActiveHubTile(null);
  });

  it('renders nothing when activeHubTile is null — the old console--grid pointer-events mechanism is retired along with HubNav (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.7)', () => {
    const { container } = render(<Console />);
    expect(container.firstChild).toBeNull();
    expect(container.querySelector('.console')).toBeNull();
    expect(container.querySelector('.console--grid')).toBeNull();
  });

  it('renders .console wrapping ConsolePanel when a tile is active', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    const { container, getByTestId } = render(<Console />);
    const root = container.querySelector('.console');
    expect(root).toBeTruthy();
    expect(root?.classList.contains('console--grid')).toBe(false);
    expect(getByTestId('console-panel-stub')).toBeTruthy();
  });

  it('renders .console when the robots tile is active', () => {
    useUIStore.getState().setActiveHubTile('robots');
    const { container } = render(<Console />);
    expect(container.querySelector('.console')).toBeTruthy();
  });
});
