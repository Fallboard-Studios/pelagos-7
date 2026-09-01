import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

// This test is about Robot.tsx's own click/navigation behavior (Roadmap Phase 8, Task 11), not
// about RobotBody's rendering or idleSystem's real wander behavior — same boundary
// ConsolePanel.test.tsx already draws around components that pull in real Tone.js/AudioEngine
// machinery this test doesn't need to exercise.
vi.mock('@/components/robot/RobotBody', () => ({
  RobotBody: () => <g data-testid="robot-body-stub" />,
}));
vi.mock('@/systems/idleSystem', () => ({
  handleRobotIdle: vi.fn(),
}));

import { Robot } from './Robot';
import { useUIStore } from '@/stores/uiStore';
import type { Robot as RobotType } from '@/types/Robot';

function makeRobot(overrides: Partial<RobotType> = {}): RobotType {
  return {
    id: 'r1',
    state: 'idle',
    position: { x: 10, y: 20 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: {
      adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 },
      filterFreq: 0,
      waveform: 'sine',
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 80,
    ...overrides,
  } as RobotType;
}

describe('Robot click routing (Roadmap Phase 8)', () => {
  beforeEach(() => {
    useUIStore.getState().selectRobot(null);
    useUIStore.getState().setActiveHubTile(null);
  });

  it('selects the robot and opens the robots tile when clicked from the main hub grid', () => {
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1' })} /></svg>);
    fireEvent.click(container.querySelector('.robot') as Element);

    expect(useUIStore.getState().selectedRobotId).toBe('r1');
    expect(useUIStore.getState().activeHubTile).toBe('robots');
  });

  it('selects the robot but does not change the active tile when a tile is already open', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1' })} /></svg>);
    fireEvent.click(container.querySelector('.robot') as Element);

    expect(useUIStore.getState().selectedRobotId).toBe('r1');
    expect(useUIStore.getState().activeHubTile).toBe('audioRig');
  });

  it('does not change the active tile when the robots tile (with a different robot selected) is already open', () => {
    useUIStore.getState().setActiveHubTile('robots');
    useUIStore.getState().selectRobot('some-other-robot');
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1' })} /></svg>);
    fireEvent.click(container.querySelector('.robot') as Element);

    expect(useUIStore.getState().selectedRobotId).toBe('r1');
    expect(useUIStore.getState().activeHubTile).toBe('robots');
  });
});

describe('Robot company-member glow (Roadmap Phase 10)', () => {
  beforeEach(() => {
    useUIStore.getState().selectRobot(null);
    useUIStore.getState().setActiveHubTile(null);
    useUIStore.getState().selectCompany(null);
  });

  it('applies isCompanyMember when the robot belongs to the selected company', () => {
    useUIStore.getState().selectCompany('c1');
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: 'c1' })} /></svg>);

    expect(container.querySelector('.robot.isCompanyMember')).toBeTruthy();
  });

  it('does not apply isCompanyMember when the robot belongs to a different company', () => {
    useUIStore.getState().selectCompany('c1');
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: 'c2' })} /></svg>);

    expect(container.querySelector('.robot.isCompanyMember')).toBeNull();
  });

  it('does not apply isCompanyMember when no company is selected, even for a robot with a companyId', () => {
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: 'c1' })} /></svg>);

    expect(container.querySelector('.robot.isCompanyMember')).toBeNull();
  });

  it('does not apply isCompanyMember to a Freelance robot even when some company is selected', () => {
    useUIStore.getState().selectCompany('c1');
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: undefined })} /></svg>);

    expect(container.querySelector('.robot.isCompanyMember')).toBeNull();
  });

  it('leaves isSelected (selectedRobotId-driven) completely unaffected by company selection', () => {
    useUIStore.getState().selectRobot('r1');
    useUIStore.getState().selectCompany('c1');
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: 'c2' })} /></svg>);

    const el = container.querySelector('.robot')!;
    expect(el.classList.contains('selected')).toBe(true);
    expect(el.classList.contains('isCompanyMember')).toBe(false);
  });

  it('applies both selected and isCompanyMember together when both conditions hold', () => {
    useUIStore.getState().selectRobot('r1');
    useUIStore.getState().selectCompany('c1');
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: 'c1' })} /></svg>);

    const el = container.querySelector('.robot')!;
    expect(el.classList.contains('selected')).toBe(true);
    expect(el.classList.contains('isCompanyMember')).toBe(true);
  });

  it('applies isCompanyMember to every robot when allRobotsSelected ("All") is true, regardless of its company', () => {
    useUIStore.getState().selectAllRobots();
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: 'c2' })} /></svg>);

    expect(container.querySelector('.robot.isCompanyMember')).toBeTruthy();
  });

  it('applies isCompanyMember to a Freelance robot (no companyId) too when "All" is selected', () => {
    useUIStore.getState().selectAllRobots();
    const { container } = render(<svg><Robot robot={makeRobot({ id: 'r1', companyId: undefined })} /></svg>);

    expect(container.querySelector('.robot.isCompanyMember')).toBeTruthy();
  });
});
