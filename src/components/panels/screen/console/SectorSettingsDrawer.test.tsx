// ========================================
// MOCKS
// ========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const retransmitWorldMock = vi.fn();
vi.mock('@/systems/worldTransition', () => ({
  retransmitWorld: (input: unknown) => retransmitWorldMock(input),
}));

// ========================================
// IMPORTS
// ========================================
import { SectorSettingsDrawer } from './SectorSettingsDrawer';
import { usePlanetStore, DEFAULT_PELAGOS } from '@/stores/planetStore';
import { useLocaleStore, DEFAULT_LOCALE, DEFAULT_LOCALE_ID } from '@/stores/localeStore';
import { PLANET_NAME_PRESETS, COORDINATE_PRESETS } from '@/data/sectorSettingsConfig';

// ========================================
// TESTS
// ========================================

describe('SectorSettingsDrawer', () => {
  beforeEach(() => {
    usePlanetStore.setState({
      planets: [{ ...DEFAULT_PELAGOS, name: 'Pelagos' }],
      currentPlanetId: DEFAULT_PELAGOS.id,
    });
    useLocaleStore.setState({
      locales: { [DEFAULT_LOCALE_ID]: { ...DEFAULT_LOCALE, coordinates: { x: 5, y: 9 } } },
    });
    retransmitWorldMock.mockClear();
  });

  it('pre-populates the planet name field with the current planet name', () => {
    render(<SectorSettingsDrawer />);
    const textInputs = screen.getAllByRole('textbox');
    const planetInput = textInputs.find((el) => (el as HTMLInputElement).value === 'Pelagos');
    expect(planetInput).toBeTruthy();
  });

  it('pre-populates the coordinate fields with the current locale coordinates', () => {
    render(<SectorSettingsDrawer />);
    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(spinbuttons.map((el) => el.value)).toEqual(['5', '9']);
  });

  it('renders the status header reflecting the current planet and coordinates', () => {
    render(<SectorSettingsDrawer />);
    expect(screen.getByText(/Pelagos/)).toBeTruthy();
  });

  it('clicking a promoted planet preset populates only the planet name field and calls retransmitWorld zero times', () => {
    render(<SectorSettingsDrawer />);
    const preset = PLANET_NAME_PRESETS[0];
    fireEvent.click(screen.getByText(preset.label));

    const textInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    const planetInput = textInputs.find((el) => el.value === preset.value);
    expect(planetInput).toBeTruthy();
    expect(retransmitWorldMock).not.toHaveBeenCalled();
  });

  it('clicking a promoted coordinate preset populates only the coordinate fields and calls retransmitWorld zero times', () => {
    render(<SectorSettingsDrawer />);
    const preset = COORDINATE_PRESETS[0];
    fireEvent.click(screen.getByText(preset.label));

    const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(spinbuttons.map((el) => Number(el.value))).toEqual([preset.value.x, preset.value.y]);
    expect(retransmitWorldMock).not.toHaveBeenCalled();
  });

  it('clicking Retransmit with only the planet name edited passes just planetName', () => {
    render(<SectorSettingsDrawer />);
    const textInputs = screen.getAllByRole('textbox');
    const planetInput = textInputs.find((el) => (el as HTMLInputElement).value === 'Pelagos')!;
    fireEvent.change(planetInput, { target: { value: 'Kryndara' } });

    fireEvent.click(screen.getByText('Retransmit'));

    expect(retransmitWorldMock).toHaveBeenCalledWith({ planetName: 'Kryndara' });
  });

  it('clicking Retransmit with only coordinates edited passes just coordinates', () => {
    render(<SectorSettingsDrawer />);
    const [xInput] = screen.getAllByRole('spinbutton');
    fireEvent.change(xInput, { target: { value: '42' } });

    fireEvent.click(screen.getByText('Retransmit'));

    expect(retransmitWorldMock).toHaveBeenCalledWith({ coordinates: { x: 42, y: 9 } });
  });

  it('clicking Retransmit with neither field edited passes an empty input', () => {
    render(<SectorSettingsDrawer />);
    fireEvent.click(screen.getByText('Retransmit'));
    expect(retransmitWorldMock).toHaveBeenCalledWith({});
  });
});
