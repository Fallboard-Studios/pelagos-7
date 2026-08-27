import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ConsolePanel } from './ConsolePanel';
import { useUIStore } from '@/stores/uiStore';

// RobotsTab/RobotOptionsTab pull in real Tone.js/AudioEngine and GSAP, both of
// which throw in this jsdom test environment — the same boundary
// ScreenViewport.test.tsx draws around its Tone/GSAP-touching children. This
// test is about ConsolePanel's own grid/tile/nested-detail switch, not about
// re-testing those components.
vi.mock('./RobotsTab', () => ({
  RobotsTab: () => <div data-testid="robots-list-stub" />,
  default: () => <div data-testid="robots-list-stub" />,
}));
vi.mock('./RobotOptionsTab', () => ({
  RobotOptionsTab: () => <div data-testid="robot-options-stub" />,
  default: () => <div data-testid="robot-options-stub" />,
}));
// AudioRigDrawer has its own full test suite (AudioRigDrawer.test.tsx) — this
// file is about ConsolePanel's own tile switch, not re-testing its content.
vi.mock('./AudioRigDrawer', () => ({
  AudioRigDrawer: () => <div data-testid="audio-rig-drawer-stub" />,
  default: () => <div data-testid="audio-rig-drawer-stub" />,
}));
// SectorSettingsDrawer has its own full test suite
// (SectorSettingsDrawer.test.tsx) — this file is about ConsolePanel's own
// tile switch, not re-testing its content.
vi.mock('./SectorSettingsDrawer', () => ({
  SectorSettingsDrawer: () => <div data-testid="sector-settings-drawer-stub" />,
  default: () => <div data-testid="sector-settings-drawer-stub" />,
}));

describe('ConsolePanel', () => {
  // Explicit reset before each test, not relying on declaration order — runs
  // after RTL's own afterEach cleanup has already unmounted the previous
  // test's component, so mutating the store here doesn't trigger the
  // "update not wrapped in act()" warning an afterEach-based reset would
  // (that ordering bit us once already; see HubNav.test.tsx's history).
  beforeEach(() => {
    useUIStore.getState().setActiveHubTile(null);
    useUIStore.getState().selectRobot(null);
  });

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

  it('renders RobotOptionsTab when robots is active and a robot is selected', () => {
    useUIStore.getState().setActiveHubTile('robots');
    useUIStore.getState().selectRobot('r1');
    render(<ConsolePanel />);
    expect(screen.getByTestId('robot-options-stub')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('renders AudioRigDrawer when audioRig is active', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    render(<ConsolePanel />);
    expect(screen.getByTestId('audio-rig-drawer-stub')).toBeTruthy();
  });

  it('renders SectorSettingsDrawer when settings is active', () => {
    useUIStore.getState().setActiveHubTile('settings');
    render(<ConsolePanel />);
    expect(screen.getByTestId('sector-settings-drawer-stub')).toBeTruthy();
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
