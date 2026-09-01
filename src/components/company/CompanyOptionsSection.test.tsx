import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// AudioSettingSection/PingControlsDrawer/PingContourDrawer/SignatureArrayDrawer pull in real
// Tone.js/AudioEngine machinery, and CompanyOptionsSection mounts all four of them at once —
// under the full test suite's parallel load that made this file intermittently exceed its 5s
// timeout (it passed reliably in isolation; this was a resource-contention flake, not a logic
// bug). Mocked here the same way RobotOptionsTab.test.tsx already mocks the same four components
// for the same reason: this test is about CompanyOptionsSection's own value-derivation and
// broadcast wiring, not about the sections' own rendered content (each has its own full test
// suite) — the mocks render probe buttons that invoke the captured callback props, so wiring bugs
// (wrong function, wrong argument, wrong per-member count) still surface here even though the
// real section JSX never mounts.
vi.mock('@/components/robot/AudioSettingSection', () => ({
  AudioSettingSection: (props: {
    value: { audioMode: string; masterVolume: number };
    onAudioModeChange: (mode: string) => void;
    onVolumeChange: (pct: number) => void;
    onVolumeLfoChange: (value: unknown) => void;
    disabled?: boolean;
  }) => (
    <div
      data-testid="audio-setting-section-stub"
      data-audio-mode={props.value.audioMode}
      data-volume={props.value.masterVolume}
      data-disabled={props.disabled ? '' : undefined}
    >
      <button onClick={() => props.onAudioModeChange('solo')}>probe-audio-mode</button>
      <button onClick={() => props.onVolumeChange(77)}>probe-volume</button>
      <button onClick={() => props.onVolumeLfoChange({ shape: 'sine', rate: 1, depth: 20, active: true })}>probe-volume-lfo</button>
    </div>
  ),
}));
vi.mock('@/components/robot/PingControlsDrawer', () => ({
  PingControlsDrawer: (props: {
    value: { rhythmicDensity: number };
    onDensityChange: (v: number) => void;
    onResetMelody?: () => void;
    disabled?: boolean;
  }) => (
    <div
      data-testid="ping-controls-drawer-stub"
      data-density={props.value.rhythmicDensity}
      data-disabled={props.disabled ? '' : undefined}
    >
      <button onClick={() => props.onDensityChange(77)}>probe-density</button>
      {props.onResetMelody && <button onClick={props.onResetMelody}>probe-reset-melody</button>}
    </div>
  ),
}));
vi.mock('@/components/robot/PingContourDrawer', () => ({
  PingContourDrawer: (props: { value: { attack: number }; onChange: (next: unknown) => void; disabled?: boolean }) => (
    <div
      data-testid="ping-contour-drawer-stub"
      data-attack={props.value.attack}
      data-disabled={props.disabled ? '' : undefined}
    >
      <button onClick={() => props.onChange({ attack: 0.9, decay: 0.1, sustain: 0.5, release: 0.2 })}>probe-adsr</button>
    </div>
  ),
}));
vi.mock('@/components/robot/SignatureArrayDrawer', () => ({
  SignatureArrayDrawer: (props: {
    value: { layers: unknown[] };
    onContinuousChange: (v: unknown) => void;
    onStructuralChange: (v: unknown) => void;
    onLfoChange: (target: string, value: unknown) => void;
    disabled?: boolean;
  }) => (
    <div
      data-testid="signature-array-drawer-stub"
      data-layer-count={props.value.layers.length}
      data-disabled={props.disabled ? '' : undefined}
    >
      <button onClick={() => props.onContinuousChange([{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }])}>probe-layers-continuous</button>
      <button onClick={() => props.onStructuralChange([{ type: 'square', gain: 1, detune: 0, phase: 0, active: true }])}>probe-layers-structural</button>
      <button onClick={() => props.onLfoChange('layer0.gain', { shape: 'sine', rate: 1, depth: 20, active: true })}>probe-layer-lfo</button>
    </div>
  ),
}));

import { CompanyOptionsSection } from './CompanyOptionsSection';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import * as robotOptionsActions from '@/systems/robotOptionsActions';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'r1',
    name: 'Test Robot',
    state: 'idle',
    position: { x: 0, y: 0 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: {
      adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
      filterFreq: 0,
      waveform: 'sine',
      layers: [
        { type: 'sine', gain: 1, detune: 0, phase: 0, active: true },
        { type: 'square', gain: 0.8, detune: 5, phase: 10, active: true },
        { type: 'triangle', gain: 0.6, detune: -5, phase: 20, active: false },
      ],
    },
    octaveRange: [3, 5],
    createdAt: Date.now(),
    masterVolume: 0.6,
    docking: 'active',
    batteryLevel: 100,
    rhythmicDensity: 42,
    audioMode: 'none',
    ...overrides,
  } as Robot;
}

describe('CompanyOptionsSection', () => {
  const localeId = getActiveLocaleId();

  afterEach(() => {
    vi.restoreAllMocks();
    useLocaleStore.getState().setLocaleData(localeId, { robots: [], companies: [] } as unknown as Partial<Locale>);
    useUIStore.getState().selectCompany(null);
  });

  it('renders every section disabled with no company selected', () => {
    render(<CompanyOptionsSection />);

    expect(screen.getByTestId('audio-setting-section-stub').getAttribute('data-disabled')).toBe('');
    expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-disabled')).toBe('');
    expect(screen.getByTestId('ping-contour-drawer-stub').getAttribute('data-disabled')).toBe('');
    expect(screen.getByTestId('signature-array-drawer-stub').getAttribute('data-disabled')).toBe('');
  });

  it('renders every section disabled when the selected company has zero members', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyOptionsSection />);

    expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-disabled')).toBe('');
  });

  it('populates every section\'s value from resolveCompanyOptions(company, firstMember) when a non-empty company is selected', () => {
    const robot = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.6, rhythmicDensity: 42 });
    useLocaleStore.getState().addRobot(localeId, robot);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyOptionsSection />);

    expect(screen.getByTestId('audio-setting-section-stub').getAttribute('data-volume')).toBe('0.6');
    expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-density')).toBe('42');
    expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-disabled')).toBeNull();
  });

  it('editing Volume calls applyVolume once per member robot, not a single bulk call', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1' });
    const r2 = makeRobot({ id: 'r2', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addRobot(localeId, r2);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1', 'r2'] });
    useUIStore.getState().selectCompany('c1');
    const applyVolumeSpy = vi.spyOn(robotOptionsActions, 'applyVolume').mockImplementation(() => {});

    render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-volume'));

    expect(applyVolumeSpy).toHaveBeenCalledTimes(2);
    expect(applyVolumeSpy.mock.calls.map((c) => c[0].id).sort()).toEqual(['r1', 'r2']);
  });

  it('editing one field patches only that field into company.lastEditedOptions', () => {
    const robot = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.6 });
    useLocaleStore.getState().addRobot(localeId, robot);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');
    vi.spyOn(robotOptionsActions, 'applyVolume').mockImplementation(() => {});
    const updateCompanySpy = vi.spyOn(useLocaleStore.getState(), 'updateCompany');

    render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-volume'));

    expect(updateCompanySpy).toHaveBeenCalledTimes(1);
    const [, , update] = updateCompanySpy.mock.calls[0];
    expect(Object.keys(update.lastEditedOptions ?? {})).toEqual(['masterVolume']);
  });

  it('omits Reset Melody entirely in company mode', () => {
    const robot = makeRobot({ id: 'r1', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, robot);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyOptionsSection />);

    expect(screen.queryByText('probe-reset-melody')).toBeNull();
  });

  it('re-selecting a company shows its last-edited value, not the first member\'s possibly-drifted live value', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.5 });
    const r2 = makeRobot({ id: 'r2', companyId: 'c2', masterVolume: 0.5 });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addRobot(localeId, r2);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', robotIds: ['r2'] });
    vi.spyOn(robotOptionsActions, 'applyVolume').mockImplementation(() => {});

    // Select c1, edit its Volume (the probe button always fires with a fixed 77%).
    useUIStore.getState().selectCompany('c1');
    const { unmount } = render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-volume'));
    unmount();
    const editedVolume = useLocaleStore.getState().getCompanyById(localeId, 'c1')?.lastEditedOptions?.masterVolume;
    expect(editedVolume).toBeCloseTo(0.77, 5);

    // r1 (c1's only member) drifts independently after that edit.
    useLocaleStore.getState().updateRobot(localeId, 'r1', { masterVolume: 0.99 });

    // Switch to c2, then back to c1.
    useUIStore.getState().selectCompany('c2');
    render(<CompanyOptionsSection />);
    useUIStore.getState().selectCompany('c1');

    render(<CompanyOptionsSection />);
    const stubs = screen.getAllByTestId('audio-setting-section-stub');
    const lastStub = stubs[stubs.length - 1];
    expect(lastStub.getAttribute('data-volume')).toBe(String(editedVolume));
  });

  it('editing an individual member robot directly does not change the company\'s lastEditedOptions', () => {
    const robot = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.5 });
    useLocaleStore.getState().addRobot(localeId, robot);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });

    robotOptionsActions.applyVolume(robot, localeId, 77);

    expect(useLocaleStore.getState().getCompanyById(localeId, 'c1')?.lastEditedOptions).toBeUndefined();
  });

  it('a Signature Array edit calls applyLayersContinuous once per member, and Ping Contour a separate applyAdsr call', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');
    const continuousSpy = vi.spyOn(robotOptionsActions, 'applyLayersContinuous').mockImplementation(() => {});
    const adsrSpy = vi.spyOn(robotOptionsActions, 'applyAdsr').mockImplementation(() => {});

    render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-layers-continuous'));
    fireEvent.click(screen.getByText('probe-adsr'));

    expect(continuousSpy).toHaveBeenCalledTimes(1);
    expect(adsrSpy).toHaveBeenCalledTimes(1);
  });

  it('a structural Signature Array edit (Type/Active) calls applyLayersStructural, not applyLayersContinuous', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');
    const structuralSpy = vi.spyOn(robotOptionsActions, 'applyLayersStructural').mockImplementation(() => {});
    const continuousSpy = vi.spyOn(robotOptionsActions, 'applyLayersContinuous').mockImplementation(() => {});

    render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-layers-structural'));

    expect(structuralSpy).toHaveBeenCalledTimes(1);
    expect(continuousSpy).not.toHaveBeenCalled();
  });

  it('a per-layer LFO edit calls applyLayerLfo with the right target', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');
    const lfoSpy = vi.spyOn(robotOptionsActions, 'applyLayerLfo').mockImplementation(() => {});

    render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-layer-lfo'));

    expect(lfoSpy).toHaveBeenCalledWith(r1, localeId, 'layer0.gain', { shape: 'sine', rate: 1, depth: 20, active: true });
  });

  describe('"All" selection (CompanyButtonRow\'s All button)', () => {
    it('renders every section disabled when All is selected but the locale has zero robots', () => {
      useUIStore.getState().selectAllRobots();

      render(<CompanyOptionsSection />);

      expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-disabled')).toBe('');
    });

    it('populates every section\'s value from the first robot in the locale, across companies and Freelance alike', () => {
      const r1 = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.6, rhythmicDensity: 42 });
      const r2 = makeRobot({ id: 'r2', companyId: undefined }); // Freelance
      useLocaleStore.getState().addRobot(localeId, r1);
      useLocaleStore.getState().addRobot(localeId, r2);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
      useUIStore.getState().selectAllRobots();

      render(<CompanyOptionsSection />);

      expect(screen.getByTestId('audio-setting-section-stub').getAttribute('data-volume')).toBe('0.6');
      expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-density')).toBe('42');
      expect(screen.getByTestId('ping-controls-drawer-stub').getAttribute('data-disabled')).toBeNull();
    });

    it('editing Volume while All is selected calls applyVolume once per robot in the locale, regardless of company', () => {
      const r1 = makeRobot({ id: 'r1', companyId: 'c1' });
      const r2 = makeRobot({ id: 'r2', companyId: 'c2' });
      const r3 = makeRobot({ id: 'r3', companyId: undefined }); // Freelance
      useLocaleStore.getState().addRobot(localeId, r1);
      useLocaleStore.getState().addRobot(localeId, r2);
      useLocaleStore.getState().addRobot(localeId, r3);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
      useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', robotIds: ['r2'] });
      useUIStore.getState().selectAllRobots();
      const applyVolumeSpy = vi.spyOn(robotOptionsActions, 'applyVolume').mockImplementation(() => {});

      render(<CompanyOptionsSection />);
      fireEvent.click(screen.getByText('probe-volume'));

      expect(applyVolumeSpy).toHaveBeenCalledTimes(3);
      expect(applyVolumeSpy.mock.calls.map((c) => c[0].id).sort()).toEqual(['r1', 'r2', 'r3']);
    });

    it('editing one field while All is selected patches locale.allRobotsLastEditedOptions, not any company\'s lastEditedOptions', () => {
      const r1 = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.6 });
      useLocaleStore.getState().addRobot(localeId, r1);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
      useUIStore.getState().selectAllRobots();
      vi.spyOn(robotOptionsActions, 'applyVolume').mockImplementation(() => {});
      const updateCompanySpy = vi.spyOn(useLocaleStore.getState(), 'updateCompany');

      render(<CompanyOptionsSection />);
      fireEvent.click(screen.getByText('probe-volume'));

      expect(updateCompanySpy).not.toHaveBeenCalled();
      const editedVolume = useLocaleStore.getState().getLocaleById(localeId)?.allRobotsLastEditedOptions?.masterVolume;
      expect(editedVolume).toBeCloseTo(0.77, 5);
      expect(useLocaleStore.getState().getCompanyById(localeId, 'c1')?.lastEditedOptions).toBeUndefined();
    });

    it('All\'s last-edited value is independent of any company\'s — switching between them shows each one\'s own snapshot', () => {
      const r1 = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.5 });
      useLocaleStore.getState().addRobot(localeId, r1);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
      vi.spyOn(robotOptionsActions, 'applyVolume').mockImplementation(() => {});

      // Edit while "All" is selected (probe fires a fixed 77%).
      useUIStore.getState().selectAllRobots();
      const { unmount: unmount1 } = render(<CompanyOptionsSection />);
      fireEvent.click(screen.getByText('probe-volume'));
      unmount1();

      // Switch to the company and confirm ITS resolved value still reflects the robot's own live
      // value (0.5), not All's edited 77% — the two snapshots never cross-contaminate.
      useUIStore.getState().selectCompany('c1');
      render(<CompanyOptionsSection />);
      expect(screen.getByTestId('audio-setting-section-stub').getAttribute('data-volume')).toBe('0.5');
    });
  });
});
