import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CompanyOptionsSection } from './CompanyOptionsSection';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { AudioEngine } from '@/engine/AudioEngine';
import * as robotOptionsActions from '@/systems/robotOptionsActions';
import type { Robot } from '@/types/Robot';
import type { Locale } from '@/types/locale';

vi.mock('@/engine/lfoEngine', () => ({
  lfoEngine: {
    connectLfoTarget: vi.fn(() => true),
    disconnectLfoTarget: vi.fn(),
    setLfoRate: vi.fn(),
    setLfoDepth: vi.fn(),
    setLfoShape: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

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

    expect(screen.getByRole('radio', { name: 'Solo' }).getAttribute('data-disabled')).toBe('');
    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('data-disabled')).toBe('');
    expect(screen.getByRole('slider', { name: /attack/i }).getAttribute('data-disabled')).toBe('');
  });

  it('renders every section disabled when the selected company has zero members', () => {
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: [] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyOptionsSection />);

    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('data-disabled')).toBe('');
  });

  it('populates every section\'s value from resolveCompanyOptions(company, firstMember) when a non-empty company is selected', () => {
    const robot = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.6, rhythmicDensity: 42 });
    useLocaleStore.getState().addRobot(localeId, robot);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useUIStore.getState().selectCompany('c1');

    render(<CompanyOptionsSection />);

    expect(screen.getByRole('slider', { name: /volume/i }).getAttribute('aria-valuenow')).toBe('60');
    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('aria-valuenow')).toBe('42');
    expect(screen.getByRole('slider', { name: /density/i }).getAttribute('data-disabled')).toBeNull();
  });

  it('editing Volume calls applyVolume once per member robot, not a single bulk call', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1' });
    const r2 = makeRobot({ id: 'r2', companyId: 'c1' });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addRobot(localeId, r2);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1', 'r2'] });
    useUIStore.getState().selectCompany('c1');
    const applyVolumeSpy = vi.spyOn(robotOptionsActions, 'applyVolume').mockImplementation(() => {});
    vi.spyOn(AudioEngine, 'updateRobotMasterVolume').mockImplementation(() => {});

    render(<CompanyOptionsSection />);
    fireEvent.keyDown(screen.getByRole('slider', { name: /volume/i }), { key: 'ArrowRight' });

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
    fireEvent.keyDown(screen.getByRole('slider', { name: /volume/i }), { key: 'ArrowRight' });

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

    expect(screen.queryByRole('button', { name: 'Reset Melody' })).toBeNull();
  });

  it('re-selecting a company shows its last-edited value, not the first member\'s possibly-drifted live value', () => {
    const r1 = makeRobot({ id: 'r1', companyId: 'c1', masterVolume: 0.5 });
    const r2 = makeRobot({ id: 'r2', companyId: 'c2', masterVolume: 0.5 });
    useLocaleStore.getState().addRobot(localeId, r1);
    useLocaleStore.getState().addRobot(localeId, r2);
    useLocaleStore.getState().addCompany(localeId, { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'] });
    useLocaleStore.getState().addCompany(localeId, { id: 'c2', name: 'Null Syndicate', robotIds: ['r2'] });

    // Select c1, edit its Volume up (real robotOptionsActions this time, no mock).
    useUIStore.getState().selectCompany('c1');
    const { unmount } = render(<CompanyOptionsSection />);
    fireEvent.keyDown(screen.getByRole('slider', { name: /volume/i }), { key: 'ArrowRight' });
    unmount();
    const editedVolume = useLocaleStore.getState().getCompanyById(localeId, 'c1')?.lastEditedOptions?.masterVolume;
    expect(editedVolume).toBeDefined();

    // r1 (c1's only member) drifts independently after that edit.
    useLocaleStore.getState().updateRobot(localeId, 'r1', { masterVolume: 0.99 });

    // Switch to c2, then back to c1.
    useUIStore.getState().selectCompany('c2');
    render(<CompanyOptionsSection />);
    useUIStore.getState().selectCompany('c1');

    render(<CompanyOptionsSection />);
    const sliders = screen.getAllByRole('slider', { name: /volume/i });
    const lastSlider = sliders[sliders.length - 1];
    expect(lastSlider.getAttribute('aria-valuenow')).toBe(String(Math.round((editedVolume as number) * 100)));
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
    vi.spyOn(AudioEngine, 'updateVoiceLayerParams').mockImplementation(() => {});
    vi.spyOn(AudioEngine, 'updateVoiceEnvelope').mockImplementation(() => {});

    render(<CompanyOptionsSection />);
    const [baselineGainSlider] = screen.getAllByRole('slider', { name: /gain/i });
    fireEvent.keyDown(baselineGainSlider, { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByRole('slider', { name: /attack/i }), { key: 'ArrowRight' });

    expect(continuousSpy).toHaveBeenCalledTimes(1);
    expect(adsrSpy).toHaveBeenCalledTimes(1);
  });
});
