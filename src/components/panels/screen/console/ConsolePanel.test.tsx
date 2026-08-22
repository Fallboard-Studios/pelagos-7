import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ConsolePanel } from './ConsolePanel';
import { useUIStore } from '@/stores/uiStore';

// RobotOptionsTab/RobotEditorTab pull in real Tone.js/AudioEngine and GSAP,
// both of which throw in this jsdom test environment — the same boundary
// ScreenViewport.test.tsx draws around its Tone/GSAP-touching children. This
// test is about ConsolePanel's own grid/tile switch, not about re-testing
// those components.
vi.mock('./RobotOptionsTab', () => ({
  RobotOptionsTab: () => <div data-testid="robot-options-stub" />,
  default: () => <div data-testid="robot-options-stub" />,
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

  it('renders RobotOptionsTab and a back button when robotOptions is active', () => {
    useUIStore.getState().setActiveHubTile('robotOptions');
    render(<ConsolePanel />);
    expect(screen.getByTestId('robot-options-stub')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });

  it('renders RobotEditorTab and a back button when robotEditor is active', () => {
    useUIStore.getState().setActiveHubTile('robotEditor');
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

  it('clicking the back button returns activeHubTile to null', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    render(<ConsolePanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(useUIStore.getState().activeHubTile).toBeNull();
  });
});
