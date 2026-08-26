// ========================================
// MOCKS
// ========================================
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@/components/robot/Robot', () => ({ Robot: () => null }));
vi.mock('@/components/actors/Factory', () => ({ Factory: () => null, default: () => null }));

// ========================================
// IMPORTS
// ========================================
import WorldView from './WorldView';
import { usePlanetStore, DEFAULT_PELAGOS } from '@/stores/planetStore';
import { useLocaleStore, DEFAULT_LOCALE, DEFAULT_LOCALE_ID } from '@/stores/localeStore';
import { retransmitWorld } from '@/systems/worldTransition';
import { stopSpawnScheduler } from '@/systems/spawnSystem';

// ========================================
// TESTS
// ========================================

describe('WorldView — survives retransmitting to a new planet', () => {
  beforeEach(() => {
    usePlanetStore.setState({ planets: [{ ...DEFAULT_PELAGOS }], currentPlanetId: DEFAULT_PELAGOS.id });
    useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: { ...DEFAULT_LOCALE, robots: [], actors: [] } } });
  });

  afterEach(() => {
    stopSpawnScheduler();
  });

  it('still renders a planet-view after retransmitting a brand-new planet name', () => {
    render(<WorldView />);
    expect(document.querySelector('.planet-view')).toBeTruthy();

    act(() => {
      retransmitWorld({ planetName: 'Kryndara' });
    });

    expect(document.querySelector('.planet-view')).toBeTruthy();
    expect(document.querySelector('.locale-view')).toBeTruthy();
  });
});
