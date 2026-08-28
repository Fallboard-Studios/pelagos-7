import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

const INITIAL_STATE = useUIStore.getState();

describe('uiStore — activeHubTile', () => {
  beforeEach(() => {
    useUIStore.setState(INITIAL_STATE, true);
  });

  it('defaults to null (grid view), not a pre-selected tile', () => {
    expect(useUIStore.getState().activeHubTile).toBeNull();
  });

  it('setActiveHubTile sets one of the three surviving hub tiles', () => {
    useUIStore.getState().setActiveHubTile('robots');
    expect(useUIStore.getState().activeHubTile).toBe('robots');
  });

  it('setActiveHubTile(null) returns to the grid', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    useUIStore.getState().setActiveHubTile(null);
    expect(useUIStore.getState().activeHubTile).toBeNull();
  });
});

describe('uiStore — selectedCompanyId (Roadmap Phase 10)', () => {
  beforeEach(() => {
    useUIStore.setState(INITIAL_STATE, true);
  });

  it('defaults to null — the "None" button, not a pre-selected company', () => {
    expect(useUIStore.getState().selectedCompanyId).toBeNull();
  });

  it('selectCompany sets selectedCompanyId', () => {
    useUIStore.getState().selectCompany('company-0-abc');
    expect(useUIStore.getState().selectedCompanyId).toBe('company-0-abc');
  });

  it('selectCompany(null) returns to "None"', () => {
    useUIStore.getState().selectCompany('company-0-abc');
    useUIStore.getState().selectCompany(null);
    expect(useUIStore.getState().selectedCompanyId).toBeNull();
  });

  it('is independent of selectedRobotId — selecting a company never touches robot selection', () => {
    useUIStore.getState().selectRobot('robot-0-xyz');
    useUIStore.getState().selectCompany('company-0-abc');
    expect(useUIStore.getState().selectedRobotId).toBe('robot-0-xyz');
  });

  it('is independent of selectedRobotId — selecting a robot never touches company selection', () => {
    useUIStore.getState().selectCompany('company-0-abc');
    useUIStore.getState().selectRobot('robot-0-xyz');
    expect(useUIStore.getState().selectedCompanyId).toBe('company-0-abc');
  });
});
