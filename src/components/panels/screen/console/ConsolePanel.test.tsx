import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ConsolePanel } from './ConsolePanel';
import { useUIStore } from '@/stores/uiStore';

// RobotsTab/RobotEditorTab pull in real Tone.js/AudioEngine and GSAP, both of
// which throw in this jsdom test environment — the same boundary
// ScreenViewport.test.tsx draws around its Tone/GSAP-touching children. This
// test is about ConsolePanel's own grid/tile/nested-detail switch, not about
// re-testing those components.
vi.mock('./RobotsTab', () => ({
  RobotsTab: () => <div data-testid="robots-list-stub" />,
  default: () => <div data-testid="robots-list-stub" />,
}));
vi.mock('./RobotEditorTab', () => ({
  RobotEditorTab: () => <div data-testid="robot-editor-stub" />,
  default: () => <div data-testid="robot-editor-stub" />,
}));

describe('ConsolePanel', () => {
  it('renders the HubNav grid when activeHubTile is null', () => {
    render(<ConsolePanel />);
    expect(screen.getByRole('region', { name: 'Hub Navigation' })).toBeTruthy();
  });

  it('renders RobotsTab (the list) when robots is active and no robot is selected', () => {
    useUIStore.getState().setActiveHubTile('robots');
    useUIStore.getState().selectRobot(null);
    render(<ConsolePanel />);
    expect(screen.getByTestId('robots-list-stub')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('renders RobotEditorTab when robots is active and a robot is selected', () => {
    useUIStore.getState().setActiveHubTile('robots');
    useUIStore.getState().selectRobot('r1');
    render(<ConsolePanel />);
    expect(screen.getByTestId('robot-editor-stub')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('renders the carried-forward stub content for audioRig', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    render(<ConsolePanel />);
    expect(screen.getByText('Audio Rig')).toBeTruthy();
  });

  it('renders the carried-forward stub content for settings', () => {
    useUIStore.getState().setActiveHubTile('settings');
    render(<ConsolePanel />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('back from a selected robot\'s editor clears selectedRobotId but stays on the robots tile', () => {
    useUIStore.getState().setActiveHubTile('robots');
    useUIStore.getState().selectRobot('r1');
    render(<ConsolePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useUIStore.getState().selectedRobotId).toBeNull();
    expect(useUIStore.getState().activeHubTile).toBe('robots');
  });

  it('back from the robots list (no robot selected) returns to the grid', () => {
    useUIStore.getState().setActiveHubTile('robots');
    useUIStore.getState().selectRobot(null);
    render(<ConsolePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useUIStore.getState().activeHubTile).toBeNull();
  });

  it('back from another tile (audioRig) returns to the grid', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    render(<ConsolePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(useUIStore.getState().activeHubTile).toBeNull();
  });
});
