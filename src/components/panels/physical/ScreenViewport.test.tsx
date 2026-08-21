import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScreenViewport from './ScreenViewport';

// Child components pull in real Tone.js/AudioEngine and GSAP, both of which
// throw in this jsdom test environment (no real AudioContext, and the
// project's GSAP mock in vitest.setup.ts doesn't cover every method other
// components call). Stubbing them is the sane boundary here — this test is
// about ScreenViewport's own composition logic (what it renders, and when),
// not about re-testing TransportBar/WorldView/RobotList/Console themselves.
vi.mock('@/components/panels/screen/TransportBar', () => ({
  default: () => <div data-testid="transport-bar-stub" />,
}));
vi.mock('@/components/panels/screen/worldView/WorldView', () => ({
  default: () => <div data-testid="world-view-stub" />,
}));
vi.mock('@/components/panels/screen/RobotList', () => ({
  default: () => <div data-testid="robot-list-stub" />,
}));
vi.mock('@/components/panels/screen/console/Console', () => ({
  default: () => <div data-testid="console-stub" />,
}));

describe('ScreenViewport (Task 5 — RobotList removal)', () => {
  it('does not render RobotList when powered on', () => {
    render(<ScreenViewport isPoweredOn={true} />);
    expect(screen.queryByTestId('robot-list-stub')).toBeNull();
  });

  it('still renders TransportBar, WorldView, and Console when powered on', () => {
    // Edge case: removing RobotList must not accidentally take its siblings
    // down with it.
    render(<ScreenViewport isPoweredOn={true} />);
    expect(screen.getByTestId('transport-bar-stub')).toBeTruthy();
    expect(screen.getByTestId('world-view-stub')).toBeTruthy();
    expect(screen.getByTestId('console-stub')).toBeTruthy();
  });

  it('renders none of the four when powered off', () => {
    // Edge case: confirms the isPoweredOn gating itself still works after
    // dropping one of the four conditional renders.
    render(<ScreenViewport isPoweredOn={false} />);
    expect(screen.queryByTestId('transport-bar-stub')).toBeNull();
    expect(screen.queryByTestId('world-view-stub')).toBeNull();
    expect(screen.queryByTestId('robot-list-stub')).toBeNull();
    expect(screen.queryByTestId('console-stub')).toBeNull();
  });
});
