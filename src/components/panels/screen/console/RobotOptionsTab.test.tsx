import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// RobotDisplaySection/PingControlsDrawer/PingContourDrawer/SignatureArrayDrawer pull in real
// Tone.js/AudioEngine and GSAP, both of which throw in this jsdom test environment — the same
// boundary ConsolePanel.test.tsx already draws around RobotsTab/RobotOptionsTab. This test is
// about RobotOptionsTab's own selected/not-selected switch and value/onChange wiring, not about
// the drawers' own rendered content (each has its own full test suite) — the mocks below render
// probe buttons that invoke the captured callback props, so wiring bugs (wrong function, wrong
// argument) still surface here even though the real drawer JSX never mounts.
vi.mock('@/components/robot/RobotDisplaySection', () => ({
  RobotDisplaySection: () => <div data-testid="robot-display-section-stub" />,
}));
vi.mock('@/components/robot/PingControlsDrawer', () => ({
  PingControlsDrawer: (props: {
    value: { rhythmicDensity: number; pitchRepeat: number; clickTrackActive: boolean };
    onDensityChange: (v: number) => void;
    onPitchRepeatChange: (v: number) => void;
    onResetMelody?: () => void;
    onClickTrackActiveChange: (v: boolean) => void;
  }) => (
    <div
      data-testid="ping-controls-drawer-stub"
      data-density={props.value.rhythmicDensity}
      data-pitch-repeat={props.value.pitchRepeat}
      data-click-track-active={String(props.value.clickTrackActive)}
    >
      <button onClick={() => props.onDensityChange(77)}>probe-density</button>
      <button onClick={() => props.onPitchRepeatChange(88)}>probe-pitch-repeat</button>
      {props.onResetMelody && <button onClick={props.onResetMelody}>probe-reset-melody</button>}
      <button onClick={() => props.onClickTrackActiveChange(true)}>probe-click-track</button>
    </div>
  ),
}));
vi.mock('@/components/robot/PingContourDrawer', () => ({
  PingContourDrawer: (props: { value: { attack: number }; onChange: (next: unknown) => void }) => (
    <div data-testid="ping-contour-drawer-stub" data-attack={props.value.attack}>
      <button onClick={() => props.onChange({ attack: 0.9, decay: 0.1, sustain: 0.5, release: 0.2 })}>probe-adsr</button>
    </div>
  ),
}));
vi.mock('@/components/robot/SignatureArrayDrawer', () => ({
  SignatureArrayDrawer: (props: { value: { layers: unknown[] }; onContinuousChange: (v: unknown) => void }) => (
    <div data-testid="signature-array-drawer-stub" data-layer-count={props.value.layers.length}>
      <button onClick={() => props.onContinuousChange([{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }])}>probe-layers</button>
    </div>
  ),
}));

import { RobotOptionsTab } from './RobotOptionsTab';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import * as robotOptionsActions from '@/systems/robotOptionsActions';
import * as regenerateMelodyModule from '@/engine/regenerateMelody';
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
    audioAttributes: {
      adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 },
      filterFreq: 0,
      waveform: 'sine',
      layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }],
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 100,
    rhythmicDensity: 42,
    pitchRepeat: 33,
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
    vi.restoreAllMocks();
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

  it('derives PingControlsDrawer\'s value from the selected robot', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    render(<RobotOptionsTab />);

    expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-density')).toBe('42');
  });

  it('derives PingControlsDrawer\'s pitchRepeat value from the selected robot', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    render(<RobotOptionsTab />);

    expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-pitch-repeat')).toBe('33');
  });

  it('wires PingControlsDrawer\'s onDensityChange to robotOptionsActions.applyDensity', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    const applySpy = vi.spyOn(robotOptionsActions, 'applyDensity').mockImplementation(() => {});
    render(<RobotOptionsTab />);

    fireEvent.click(screen.getByText('probe-density'));

    expect(applySpy).toHaveBeenCalledWith(robot, localeId, 77);
  });

  it('wires PingControlsDrawer\'s onPitchRepeatChange to robotOptionsActions.applyPitchRepeat', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    const applySpy = vi.spyOn(robotOptionsActions, 'applyPitchRepeat').mockImplementation(() => {});
    render(<RobotOptionsTab />);

    fireEvent.click(screen.getByText('probe-pitch-repeat'));

    expect(applySpy).toHaveBeenCalledWith(robot, localeId, 88);
  });

  it('wires PingControlsDrawer\'s onResetMelody to regenerateMelody directly (not a robotOptionsActions function)', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    const regenSpy = vi.spyOn(regenerateMelodyModule, 'regenerateMelody').mockImplementation(() => {});
    render(<RobotOptionsTab />);

    fireEvent.click(screen.getByText('probe-reset-melody'));

    expect(regenSpy).toHaveBeenCalledWith(robot, localeId);
  });

  it('derives PingControlsDrawer\'s clickTrackActive from the robot and wires onClickTrackActiveChange to applyClickTrackActive', () => {
    const robot = { ...makeRobot(), clickTrackActive: true };
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    const applySpy = vi.spyOn(robotOptionsActions, 'applyClickTrackActive').mockImplementation(() => {});
    render(<RobotOptionsTab />);

    expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-click-track-active')).toBe('true');

    fireEvent.click(screen.getByText('probe-click-track'));

    expect(applySpy).toHaveBeenCalledWith(robot, localeId, true);
  });

  it('derives PingContourDrawer\'s value from the robot\'s audioAttributes.adsr and wires onChange to applyAdsr', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    const applySpy = vi.spyOn(robotOptionsActions, 'applyAdsr').mockImplementation(() => {});
    render(<RobotOptionsTab />);

    expect(screen.getByTestId('ping-contour-drawer-stub').getAttribute('data-attack')).toBe('0.01');

    fireEvent.click(screen.getByText('probe-adsr'));

    expect(applySpy).toHaveBeenCalledWith(robot, localeId, { attack: 0.9, decay: 0.1, sustain: 0.5, release: 0.2 });
  });

  it('derives SignatureArrayDrawer\'s value from the robot\'s layers and wires onContinuousChange to applyLayersContinuous', () => {
    const robot = makeRobot();
    useLocaleStore.getState().addRobot(localeId, robot);
    useUIStore.getState().selectRobot(robot.id);
    const applySpy = vi.spyOn(robotOptionsActions, 'applyLayersContinuous').mockImplementation(() => {});
    render(<RobotOptionsTab />);

    expect(screen.getByTestId('signature-array-drawer-stub').getAttribute('data-layer-count')).toBe('1');

    fireEvent.click(screen.getByText('probe-layers'));

    expect(applySpy).toHaveBeenCalledWith(robot, localeId, [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }]);
  });
});
