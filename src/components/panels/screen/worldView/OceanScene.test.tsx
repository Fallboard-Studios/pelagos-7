// ========================================
// MOCKS
// ========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('@/components/robot/Robot', () => ({ Robot: () => null }));
vi.mock('@/components/actors/Factory', () => ({ Factory: () => null, default: () => null }));

const initializeLocaleMock = vi.fn();
vi.mock('@/systems/worldTransition', () => ({
  initializeLocale: (localeId: string) => initializeLocaleMock(localeId),
}));

const stopSpawnSchedulerMock = vi.fn();
vi.mock('@/systems/spawnSystem', () => ({
  stopSpawnScheduler: () => stopSpawnSchedulerMock(),
}));

// ========================================
// IMPORTS
// ========================================
import { OceanScene } from './OceanScene';
import { usePlanetStore, DEFAULT_PELAGOS } from '@/stores/planetStore';
import { useLocaleStore, DEFAULT_LOCALE, DEFAULT_LOCALE_ID } from '@/stores/localeStore';

// ========================================
// TESTS
// ========================================

describe('OceanScene', () => {
  beforeEach(() => {
    usePlanetStore.setState({ planets: [{ ...DEFAULT_PELAGOS }], currentPlanetId: DEFAULT_PELAGOS.id });
    useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: { ...DEFAULT_LOCALE, robots: [], actors: [] } } });
    initializeLocaleMock.mockClear();
    stopSpawnSchedulerMock.mockClear();
  });

  it('calls initializeLocale with the active locale id on mount, exactly once', () => {
    render(<OceanScene />);
    expect(initializeLocaleMock).toHaveBeenCalledTimes(1);
    expect(initializeLocaleMock).toHaveBeenCalledWith(DEFAULT_LOCALE_ID);
    cleanup();
  });

  it('calls stopSpawnScheduler on unmount', () => {
    const { unmount } = render(<OceanScene />);
    expect(stopSpawnSchedulerMock).not.toHaveBeenCalled();
    unmount();
    expect(stopSpawnSchedulerMock).toHaveBeenCalledTimes(1);
  });

  it('does not call initializeLocale again on re-render (mount-only effect)', () => {
    const { rerender } = render(<OceanScene width={1920} />);
    rerender(<OceanScene width={1000} />);
    expect(initializeLocaleMock).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
