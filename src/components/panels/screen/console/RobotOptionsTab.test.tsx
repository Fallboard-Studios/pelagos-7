import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// RobotDisplaySection/PingControlsDrawer/PingContourDrawer/SignatureArrayDrawer pull in real
// Tone.js/AudioEngine and GSAP, both of which throw in this jsdom test environment — the same
// boundary ConsolePanel.test.tsx already draws around RobotsTab/RobotOptionsTab. This test is
// about RobotOptionsTab's own selected/not-selected switch, not about the drawers' own content
// (each has its own full test suite).
vi.mock('@/components/robot/RobotDisplaySection', () => ({
  RobotDisplaySection: () => <div data-testid="robot-display-section-stub" />,
}));
vi.mock('@/components/robot/PingControlsDrawer', () => ({
  PingControlsDrawer: () => <div data-testid="ping-controls-drawer-stub" />,
}));
vi.mock('@/components/robot/PingContourDrawer', () => ({
  PingContourDrawer: () => <div data-testid="ping-contour-drawer-stub" />,
}));
vi.mock('@/components/robot/SignatureArrayDrawer', () => ({
  SignatureArrayDrawer: () => <div data-testid="signature-array-drawer-stub" />,
}));

import { RobotOptionsTab } from './RobotOptionsTab';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

function makeRobot(id = 'r1'): Robot {
  return {
    id,
    name: 'Test Robot',
    state: 'idle',
    position: { x: 0, y: 0 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: { adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 }, filterFreq: 0, waveform: 'sine' },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 100,
  } as Robot;
}

describe('RobotOptionsTab', () => {
  const localeId = getActiveLocaleId();

  // beforeEach, not afterEach — runs after RTL's own afterEach cleanup has already unmounted the
  // previous test's component, so mutating the store here doesn't trigger the "update not
  // wrapped in act()" warning an afterEach-based reset would (same ordering pattern
  // ConsolePanel.test.tsx already documents and uses).
  beforeEach(() => {
    useUIStore.getState().selectRobot(null);
    useLocaleStore.getState().setLocaleData(localeId, { robots: [] } as unknown as Partial<Locale>);
  });

  it('renders the not-selected fallback when no robot is selected', () => {
    useUIStore.getState().selectRobot(null);
    render(<RobotOptionsTab />);
    expect(screen.getByText(/Select a robot from the list/i)).toBeTruthy();
    expect(screen.queryByTestId('robot-display-section-stub')).toBeNull();
  });

  it('renders RobotDisplaySection plus all 3 drawers when a robot is selected', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);

    render(<RobotOptionsTab />);

    expect(screen.getByTestId('robot-display-section-stub')).toBeTruthy();
    expect(screen.getByTestId('ping-controls-drawer-stub')).toBeTruthy();
    expect(screen.getByTestId('ping-contour-drawer-stub')).toBeTruthy();
    expect(screen.getByTestId('signature-array-drawer-stub')).toBeTruthy();
  });

  it('renders "Robot not found" when selectedRobotId points at a robot that no longer exists', () => {
    useUIStore.getState().selectRobot('does-not-exist');
    render(<RobotOptionsTab />);
    expect(screen.getByText('Robot not found')).toBeTruthy();
  });
});
