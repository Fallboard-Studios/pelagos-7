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
import { useAttenuationStyleStore, DEFAULT_PELAGOS } from '@/stores/attenuationStyleStore';
import { useLocaleStore, DEFAULT_LOCALE, DEFAULT_LOCALE_ID } from '@/stores/localeStore';
import { retransmitWorld } from '@/systems/worldTransition';
import { stopRobotLifecycle } from '@/systems/robotSystems';

// ========================================
// TESTS
// ========================================

describe('WorldView — survives retransmitting to a new Attenuation Style', () => {
  beforeEach(() => {
    useAttenuationStyleStore.setState({ attenuationStyles: [{ ...DEFAULT_PELAGOS }], currentAttenuationStyleId: DEFAULT_PELAGOS.id });
    useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: { ...DEFAULT_LOCALE, robots: [], actors: [] } } });
  });

  afterEach(() => {
    stopRobotLifecycle();
  });

  it('still renders an attenuation-style-view after retransmitting a brand-new Attenuation Style name', () => {
    render(<WorldView />);
    expect(document.querySelector('.attenuation-style-view')).toBeTruthy();

    act(() => {
      retransmitWorld({ attenuationStyleName: 'Kryndara' });
    });

    expect(document.querySelector('.attenuation-style-view')).toBeTruthy();
    expect(document.querySelector('.locale-view')).toBeTruthy();
  });
});
