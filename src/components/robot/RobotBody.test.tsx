import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import { RobotBody } from './RobotBody';
import { useUIStore } from '@/stores/uiStore';
import type { Robot } from '@/types/Robot';

// Scoped to the new `ignoreDaylight` prop only (RobotBody had no test file before this task) —
// not a retroactive full suite for its existing untested visual-mapping logic.

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'r1',
    state: 'idle',
    position: { x: 0, y: 0 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: {
      adsr: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.3 },
      filterFreq: 0,
      waveform: 'sine', // sine -> RobotSleek (ROBOT_DESIGN.md's waveform->shape mapping)
    },
    octaveRange: [3, 4],
    createdAt: Date.now(),
    masterVolume: 0.7,
    docking: 'active',
    batteryLevel: 50,
    ...overrides,
  } as Robot;
}

// RobotSleek's base-hull path is the one element whose fill comes straight from `colors.primary`
// (every other fill in that component is a static hex) — the most direct signal for "did the
// day/night lightness multiplier change the rendered color."
function primaryFill(container: HTMLElement): string | null {
  return container.querySelector('path')?.getAttribute('fill') ?? null;
}

// The Window group is wrapped in `<g opacity={dimOpacity}>` (battery-driven, independent of
// day/night) — selected via its known static ellipse fill rather than a class, since none exists.
function windowGroupOpacity(container: HTMLElement): string | null {
  return container.querySelector('ellipse[fill="#78cce2"]')?.closest('g')?.getAttribute('opacity') ?? null;
}

describe('RobotBody', () => {
  afterEach(() => {
    cleanup();
    useUIStore.getState().setActiveLocaleLocalTime(null);
  });

  it('regression guard: without ignoreDaylight, color still varies with activeLocaleLocalTime', () => {
    const robot = makeRobot();

    useUIStore.getState().setActiveLocaleLocalTime(12); // full daylight multiplier (=1)
    const { container: noon, unmount: unmountNoon } = render(<svg><RobotBody robot={robot} /></svg>);
    const noonFill = primaryFill(noon);
    unmountNoon();

    useUIStore.getState().setActiveLocaleLocalTime(0); // fully dark multiplier (=0)
    const { container: midnight } = render(<svg><RobotBody robot={robot} /></svg>);
    const midnightFill = primaryFill(midnight);

    expect(noonFill).not.toBeNull();
    expect(midnightFill).not.toBeNull();
    expect(midnightFill).not.toBe(noonFill);
  });

  it('with ignoreDaylight, color is identical regardless of activeLocaleLocalTime', () => {
    const robot = makeRobot();

    useUIStore.getState().setActiveLocaleLocalTime(12);
    const { container: noon, unmount: unmountNoon } = render(<svg><RobotBody robot={robot} ignoreDaylight /></svg>);
    const noonFill = primaryFill(noon);
    unmountNoon();

    useUIStore.getState().setActiveLocaleLocalTime(0);
    const { container: midnight } = render(<svg><RobotBody robot={robot} ignoreDaylight /></svg>);
    const midnightFill = primaryFill(midnight);

    expect(noonFill).not.toBeNull();
    expect(midnightFill).toBe(noonFill);
  });

  it('battery dim is unaffected by ignoreDaylight — a low-battery robot dims its window either way', () => {
    const lowBattery = makeRobot({ batteryLevel: 5 });
    const fullBattery = makeRobot({ batteryLevel: 100 });
    useUIStore.getState().setActiveLocaleLocalTime(12);

    const { container: lowNoDaylightBypass, unmount: u1 } = render(<svg><RobotBody robot={lowBattery} /></svg>);
    const lowOpacityNormal = windowGroupOpacity(lowNoDaylightBypass);
    u1();

    const { container: lowWithDaylightBypass, unmount: u2 } = render(<svg><RobotBody robot={lowBattery} ignoreDaylight /></svg>);
    const lowOpacityBypassed = windowGroupOpacity(lowWithDaylightBypass);
    u2();

    const { container: fullBatteryContainer } = render(<svg><RobotBody robot={fullBattery} ignoreDaylight /></svg>);
    const fullOpacity = windowGroupOpacity(fullBatteryContainer);

    expect(lowOpacityNormal).not.toBeNull();
    // ignoreDaylight (day/night bypass) does not change the battery-driven dim value.
    expect(lowOpacityBypassed).toBe(lowOpacityNormal);
    // A low-battery robot is dimmer than a full-battery robot regardless of ignoreDaylight.
    expect(Number(lowOpacityBypassed)).toBeLessThan(Number(fullOpacity));
  });
});
