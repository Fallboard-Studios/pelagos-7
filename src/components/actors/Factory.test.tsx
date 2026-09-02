import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// BubbleStream drives its bubble-burst timing off GSAP timelines (real GSAP is
// mocked globally in vitest.setup.ts, but useGSAP's own internals are not —
// see BubbleStream.test.tsx, which avoids rendering it for the same reason).
// Stubbing it here isolates what this file actually verifies: which bpm value
// Factory computes and threads through, not how BubbleStream animates with it.
vi.mock('./BubbleStream', () => ({
  __esModule: true,
  default: (props: { bpm: number }) => <div data-testid="bubble-stream-stub" data-bpm={props.bpm} />,
}));

import { Factory } from './Factory';
import { useAttenuationStyleStore } from '../../stores/attenuationStyleStore';
import { useLocaleStore } from '../../stores/localeStore';
import { useAudioStore } from '../../stores/audioStore';
import { ActorType } from '../../types/Actor';
import type { Actor } from '../../types/Actor';
import type { AttenuationStyle } from '../../types/attenuationStyle';
import type { Locale } from '../../types/locale';

// A "heavyIndustry" purpose is one of Factory's BUBBLE_PURPOSES — required for
// the BubbleStream stub to render at all.
const BUBBLE_ACTOR: Actor = {
  id: 'factory-under-test',
  type: ActorType.FACTORY,
  position: { x: 100, y: 900 },
  isActive: true,
  cooldownRemaining: 0,
  config: { purpose: 'heavyIndustry' },
};

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
  coordinates: { x: -17, y: 30 },
  dayStartTimestamp: 0,
  robots: [],
  actors: [],
  companies: [],
  currentMeasure: 0,
};

function setStoreFixtures() {
  useAttenuationStyleStore.setState({ attenuationStyles: [TEST_ATTENUATION_STYLE], currentAttenuationStyleId: TEST_ATTENUATION_STYLE.id });
  useLocaleStore.setState({ locales: { [TEST_LOCALE.id]: TEST_LOCALE } });
}

function bubbleStreamBpm(): string | null {
  return screen.getByTestId('bubble-stream-stub').getAttribute('data-bpm');
}

describe('Factory — BubbleStream bpm wiring', () => {
  beforeEach(() => {
    setStoreFixtures();
  });

  it('passes the live audioStore.bpm to BubbleStream, not a hardcoded fallback', () => {
    // 84 matches neither the old `?? 120` fallback nor the default seeded bpm
    // (60) — any of those leaking through fails this assertion.
    useAudioStore.setState({ bpm: 84 });
    render(<Factory actor={BUBBLE_ACTOR} />);
    expect(bubbleStreamBpm()).toBe('84');
  });

  it('updates BubbleStream when audioStore.bpm changes after mount (Tempo slider)', () => {
    useAudioStore.setState({ bpm: 70 });
    render(<Factory actor={BUBBLE_ACTOR} />);
    expect(bubbleStreamBpm()).toBe('70');

    act(() => {
      useAudioStore.setState({ bpm: 95 });
    });
    expect(bubbleStreamBpm()).toBe('95');
  });

  it('still reflects audioStore.bpm when no locale is selected', () => {
    // bpm is a global transport value, not locale-scoped — it must not
    // depend on a locale record existing at all.
    useAttenuationStyleStore.setState({ attenuationStyles: [{ ...TEST_ATTENUATION_STYLE, currentLocaleId: undefined }] });
    useAudioStore.setState({ bpm: 55 });
    render(<Factory actor={BUBBLE_ACTOR} />);
    expect(bubbleStreamBpm()).toBe('55');
  });
});
