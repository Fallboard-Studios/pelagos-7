import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';

import AttenuationStyleView from './AttenuationStyleView';
import { useAttenuationStyleStore } from '@/stores/attenuationStyleStore';
import { useLocaleStore } from '@/stores/localeStore';
import { useUIStore } from '@/stores/uiStore';
import * as localeTemperature from '@/utils/localeTemperature';
import type { AttenuationStyle } from '@/types/attenuationStyle';
import type { Locale } from '@/types/locale';

// LocaleView renders the full world-view stack (robots, actors, ...) — out
// of scope for this file, which only exercises AttenuationStyleView's own
// tick/store-wiring logic (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.3).
vi.mock('./LocaleView', () => ({ default: () => null }));

const TEST_ATTENUATION_STYLE: AttenuationStyle = {
  id: 'test-attenuation-style',
  name: 'Glaxos',
  locales: ['test-locale'],
  currentLocaleId: 'test-locale',
};

const TEST_LOCALE: Locale = {
  id: 'test-locale',
  attenuationStyleId: 'test-attenuation-style',
  name: 'Test Locale',
  coordinates: { x: -17.4, y: 30.2 },
  dayStartTimestamp: Date.now() - 60_000,
  robots: [],
  actors: [],
  companies: [],
  currentMeasure: 5,
};

function setStoreFixtures() {
  useAttenuationStyleStore.setState({ attenuationStyles: [TEST_ATTENUATION_STYLE], currentAttenuationStyleId: TEST_ATTENUATION_STYLE.id });
  useLocaleStore.setState({ locales: { [TEST_LOCALE.id]: TEST_LOCALE } });
  useUIStore.setState({ activeLocaleLocalTime: null, activeLocaleTemperature: null });
}

describe('AttenuationStyleView — temperature wiring (docs/specs/HEADER_HUB_CONSOLIDATION.md §1.3)', () => {
  beforeEach(() => {
    setStoreFixtures();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sets activeLocaleTemperature on mount, matching computeLocaleTemperature for the same hour activeLocaleLocalTime received', () => {
    render(<AttenuationStyleView attenuationStyleId={TEST_ATTENUATION_STYLE.id} />);

    const hour = useUIStore.getState().activeLocaleLocalTime;
    expect(hour).not.toBeNull();
    const expected = localeTemperature.computeLocaleTemperature(
      TEST_LOCALE.id,
      TEST_LOCALE.coordinates.x,
      TEST_LOCALE.coordinates.y,
      hour!,
    );
    expect(useUIStore.getState().activeLocaleTemperature).toBe(expected);
  });

  it('calls computeLocaleTemperature with the exact same hour value setActiveLocaleLocalTime received (no drift between the two readouts)', () => {
    const spy = vi.spyOn(localeTemperature, 'computeLocaleTemperature');

    render(<AttenuationStyleView attenuationStyleId={TEST_ATTENUATION_STYLE.id} />);

    const hour = useUIStore.getState().activeLocaleLocalTime;
    expect(spy).toHaveBeenCalledWith(TEST_LOCALE.id, TEST_LOCALE.coordinates.x, TEST_LOCALE.coordinates.y, hour);
  });

  it('updates temperature again on the next 1s wall-clock tick, without a second timer', async () => {
    vi.useFakeTimers({ now: Date.now() });
    setStoreFixtures(); // re-apply under fake time, so dayStartTimestamp is relative to the faked "now"
    const spy = vi.spyOn(localeTemperature, 'computeLocaleTemperature');

    render(<AttenuationStyleView attenuationStyleId={TEST_ATTENUATION_STYLE.id} />);
    const callsAfterMount = spy.mock.calls.length;
    expect(callsAfterMount).toBe(1); // the immediate tick() call on mount

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(spy.mock.calls.length).toBe(2); // exactly one more call from the 1s interval, not a second timer firing independently
  });

  it('does not set temperature to a stale/garbage value when the locale is not found (early-return branch)', () => {
    useLocaleStore.setState({ locales: {} });

    render(<AttenuationStyleView attenuationStyleId={TEST_ATTENUATION_STYLE.id} />);

    expect(useUIStore.getState().activeLocaleTemperature).toBeNull();
    expect(useUIStore.getState().activeLocaleLocalTime).toBeNull();
  });

  it('introduces no second setInterval/timer for temperature (source-scan regression guard)', async () => {
    const { readFileSync } = await import('node:fs');
    const { dirname, join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const thisFile = fileURLToPath(import.meta.url);
    const source = readFileSync(join(dirname(thisFile), 'AttenuationStyleView.tsx'), 'utf-8');
    const intervalMatches = source.match(/setInterval\(/g) ?? [];
    expect(intervalMatches.length).toBe(1);
  });
});
