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
//
// Every probe button below builds its onChange payload the same way the real drawer components
// do — spreading the received `props.value` (CompanyOptionsSection's shared `resolved` baseline)
// and touching only one field — e.g. real Lfo.tsx's `onChange({ ...value, rate })`,
// PingContourDrawer's `onChange({ ...adsr, attack: v })`, SignatureArrayDrawer's
// `withUpdatedLayer`. A stub that instead fired a fully-independent hardcoded object would never
// exercise CompanyOptionsSection's diff-and-preserve broadcast logic (diffCompoundField/
// diffLayerField) — it has to look like a real single-field edit for the "other members' own
// untouched sub-fields survive" regression tests below to mean anything.
vi.mock('@/components/robot/AudioSettingSection', () => ({
  AudioSettingSection: (props: {
    value: { audioMode: string; masterVolume: number; volumeLfo: { shape: string; rate: number; depth: number; active: boolean } };
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
      <button onClick={() => props.onVolumeLfoChange({ ...props.value.volumeLfo, rate: 9 })}>probe-volume-lfo</button>
    </div>
  ),
}));
vi.mock('@/components/robot/PingControlsDrawer', () => ({
  PingControlsDrawer: (props: {
    value: {
      rhythmicDensity: number;
      rhythmicMotifLength: { active: boolean; value: number };
      noteVariance: { active: boolean; value: number };
      clickTrackActive: boolean;
    };
    onDensityChange: (v: number) => void;
    onMotifLengthChange: (v: unknown) => void;
    onNoteVarianceChange: (v: unknown) => void;
    onClickTrackActiveChange: (v: boolean) => void;
    onResetMelody?: () => void;
    disabled?: boolean;
  }) => (
    <div
      data-testid="ping-controls-drawer-stub"
      data-density={props.value.rhythmicDensity}
      data-click-track-active={String(props.value.clickTrackActive)}
      data-disabled={props.disabled ? '' : undefined}
    >
      <button onClick={() => props.onDensityChange(77)}>probe-density</button>
      <button onClick={() => props.onMotifLengthChange({ ...props.value.rhythmicMotifLength, value: 12 })}>probe-motif-length</button>
      <button onClick={() => props.onNoteVarianceChange({ ...props.value.noteVariance, active: !props.value.noteVariance.active })}>probe-note-variance</button>
      <button onClick={() => props.onClickTrackActiveChange(!props.value.clickTrackActive)}>probe-click-track</button>
      {props.onResetMelody && <button onClick={props.onResetMelody}>probe-reset-melody</button>}
    </div>
  ),
}));
vi.mock('@/components/robot/PingContourDrawer', () => ({
  PingContourDrawer: (props: {
    value: { attack: number; decay: number; sustain: number; release: number };
    onChange: (next: unknown) => void;
    disabled?: boolean;
  }) => (
    <div
      data-testid="ping-contour-drawer-stub"
      data-attack={props.value.attack}
      data-disabled={props.disabled ? '' : undefined}
    >
      <button onClick={() => props.onChange({ ...props.value, attack: 0.9 })}>probe-adsr</button>
    </div>
  ),
}));
vi.mock('@/components/robot/SignatureArrayDrawer', () => ({
  SignatureArrayDrawer: (props: {
    value: {
      layers: { type: string; gain: number; detune: number; phase: number; active: boolean }[];
      lfoSettings?: Record<string, { shape: string; rate: number; depth: number; active: boolean }>;
    };
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
      <button
        onClick={() => props.onContinuousChange(props.value.layers.map((l, i) => (i === 1 ? { ...l, gain: 0.4 } : l)))}
      >
        probe-layers-continuous
      </button>
      <button
        onClick={() => props.onStructuralChange(props.value.layers.map((l, i) => (i === 2 ? { ...l, type: 'square' } : l)))}
      >
        probe-layers-structural
      </button>
      <button
        onClick={() => {
          const current = props.value.lfoSettings?.['layer0.gain'] ?? { shape: 'sine', rate: 0.1, depth: 0, active: false };
          props.onLfoChange('layer0.gain', { ...current, rate: 9 });
        }}
      >
        probe-layer-lfo
      </button>
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

  it('editing Click Track calls applyClickTrackActive once per member robot, not a single bulk call', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1' });
    const r2 = makeRobot({ id: 'r2', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addRobot(localeId, r2);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1', 'r2'] });
    useUIStore.getState().selectCompany('c1');
    const applyClickTrackSpy = vi.spyOn(robotOptionsActions, 'applyClickTrackActive').mockImplementation(() => {});

    render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-click-track'));

    expect(applyClickTrackSpy).toHaveBeenCalledTimes(2);
    expect(applyClickTrackSpy.mock.calls.map((c) => [c[0].id, c[2]])).toEqual([
      ['r1', true],
      ['r2', true],
    ]);
  });

  it('editing Click Track patches clickTrackActive into company.lastEditedOptions', () => {
    const robot = makeRobot({ id: 'r1', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, robot);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');
    vi.spyOn(robotOptionsActions, 'applyClickTrackActive').mockImplementation(() => {});
    const updateCompanySpy = vi.spyOn(useLocaleStore.getState(), 'updateCompany');

    render(<CompanyOptionsSection />);
    fireEvent.click(screen.getByText('probe-click-track'));

    const [, , update] = updateCompanySpy.mock.calls[0];
    expect(update.lastEditedOptions).toEqual({ clickTrackActive: true });
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

    expect(lfoSpy).toHaveBeenCalledWith(r1, localeId, 'layer0.gain', { shape: 'sine', rate: 9, depth: 0, active: false });
  });

  describe('broadcast preserves each member\'s own untouched sub-fields (only the single changed attribute propagates)', () => {
    it('editing Attack broadcasts only attack — each member keeps its own Decay/Sustain/Release', () => {
      const r1 = makeRobot({
        id: 'r1', companyId: 'c1',
        audioAttributes: {
          adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
          filterFreq: 0, waveform: 'sine',
          layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }],
        },
      });
      const r2 = makeRobot({
        id: 'r2', companyId: 'c1',
        audioAttributes: {
          adsr: { attack: 0.1, decay: 0.9, sustain: 0.1, release: 0.4 },
          filterFreq: 0, waveform: 'sine',
          layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }],
        },
      });
      useLocaleStore.getState().addRobot(localeId, r1);
      useLocaleStore.getState().addRobot(localeId, r2);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1', 'r2'] });
      useUIStore.getState().selectCompany('c1');
      const adsrSpy = vi.spyOn(robotOptionsActions, 'applyAdsr').mockImplementation(() => {});

      render(<CompanyOptionsSection />);
      fireEvent.click(screen.getByText('probe-adsr')); // stub sends { ...resolved-from-r1, attack: 0.9 }

      const r1Call = adsrSpy.mock.calls.find((c) => c[0].id === 'r1');
      const r2Call = adsrSpy.mock.calls.find((c) => c[0].id === 'r2');
      expect(r1Call?.[2]).toEqual({ attack: 0.9, decay: 0.3, sustain: 0.8, release: 1.5 });
      // r2's own decay/sustain/release survive untouched — not clobbered by r1's (the resolved
      // baseline's) values, which is what a whole-object broadcast would have done.
      expect(r2Call?.[2]).toEqual({ attack: 0.9, decay: 0.9, sustain: 0.1, release: 0.4 });
    });

    it('editing one Signature Array layer\'s Gain broadcasts only that layer\'s gain — other layers and other members\' own layer values survive', () => {
      const r1 = makeRobot({
        id: 'r1', companyId: 'c1',
        audioAttributes: {
          adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 }, filterFreq: 0, waveform: 'sine',
          layers: [
            { type: 'sine', gain: 1, detune: 0, phase: 0, active: true },
            { type: 'square', gain: 0.8, detune: 5, phase: 10, active: true },
            { type: 'triangle', gain: 0.6, detune: -5, phase: 20, active: false },
          ],
        },
      });
      const r2 = makeRobot({
        id: 'r2', companyId: 'c1',
        audioAttributes: {
          adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 }, filterFreq: 0, waveform: 'sine',
          layers: [
            { type: 'pulse', gain: 0.2, detune: 40, phase: 90, active: true },
            { type: 'triangle', gain: 0.5, detune: -10, phase: 30, active: true },
            { type: 'sine', gain: 0.9, detune: 15, phase: 5, active: true },
          ],
        },
      });
      useLocaleStore.getState().addRobot(localeId, r1);
      useLocaleStore.getState().addRobot(localeId, r2);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1', 'r2'] });
      useUIStore.getState().selectCompany('c1');
      const continuousSpy = vi.spyOn(robotOptionsActions, 'applyLayersContinuous').mockImplementation(() => {});

      render(<CompanyOptionsSection />);
      fireEvent.click(screen.getByText('probe-layers-continuous')); // stub sets layer[1].gain = 0.4

      const r2Call = continuousSpy.mock.calls.find((c) => c[0].id === 'r2');
      const r2Layers = r2Call?.[2] as { type: string; gain: number; detune: number; phase: number; active: boolean }[];
      // Only layer[1]'s gain changed; r2's own layer[0] and layer[2] — and layer[1]'s own
      // type/detune/phase/active — are untouched, not overwritten with r1's (resolved's) values.
      expect(r2Layers[0]).toEqual({ type: 'pulse', gain: 0.2, detune: 40, phase: 90, active: true });
      expect(r2Layers[1]).toEqual({ type: 'triangle', gain: 0.4, detune: -10, phase: 30, active: true });
      expect(r2Layers[2]).toEqual({ type: 'sine', gain: 0.9, detune: 15, phase: 5, active: true });
    });

    it('editing the Volume LFO\'s rate broadcasts only rate — each member keeps its own shape/depth/active', () => {
      const r1 = makeRobot({ id: 'r1', companyId: 'c1', lfoSettings: { volume: { shape: 'sine', rate: 1, depth: 20, active: true } } as Robot['lfoSettings'] });
      const r2 = makeRobot({ id: 'r2', companyId: 'c1', lfoSettings: { volume: { shape: 'square', rate: 0.5, depth: 60, active: false } } as Robot['lfoSettings'] });
      useLocaleStore.getState().addRobot(localeId, r1);
      useLocaleStore.getState().addRobot(localeId, r2);
      useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1', 'r2'] });
      useUIStore.getState().selectCompany('c1');
      const volumeLfoSpy = vi.spyOn(robotOptionsActions, 'applyVolumeLfo').mockImplementation(() => {});

      render(<CompanyOptionsSection />);
      fireEvent.click(screen.getByText('probe-volume-lfo')); // stub sends { ...resolved-from-r1, rate: 9 }

      const r2Call = volumeLfoSpy.mock.calls.find((c) => c[0].id === 'r2');
      expect(r2Call?.[2]).toEqual({ shape: 'square', rate: 9, depth: 60, active: false });
    });
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
