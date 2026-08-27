import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AudioStatusBadge } from './AudioStatusBadge';
import { getStatusLightColor } from '@/utils/statusLightColors';
import { AUDIO_STATUS_COLOR_MAP, AUDIO_MODE_LABELS } from '@/data/robotSelectionConfig';
import type { Robot } from '@/types/Robot';

type AudioMode = NonNullable<Robot['audioMode']>;
const AUDIO_MODES: AudioMode[] = ['none', 'mute', 'solo', 'highlight'];

// jsdom's CSSOM normalizes `hsl(...)` inline-style values to `rgb(...)` on read — round-tripping
// the expected value through the same normalization keeps the assertion about "is it the
// statusLightColors color", not about jsdom's serialization format.
function normalizeColor(color: string): string {
  const probe = document.createElement('span');
  probe.style.color = color;
  return probe.style.color;
}

describe('AudioStatusBadge', () => {
  it.each(AUDIO_MODES)('colors the dot per AUDIO_STATUS_COLOR_MAP for audioMode "%s"', (mode) => {
    const { container } = render(<AudioStatusBadge audioMode={mode} />);
    const dot = container.querySelector('.audio-status-badge') as HTMLElement;
    const expected = getStatusLightColor(AUDIO_STATUS_COLOR_MAP[mode]);
    expect(dot.style.color).toBe(normalizeColor(expected.color));
  });

  it.each(AUDIO_MODES)('has a distinct box-shadow glow for audioMode "%s"', (mode) => {
    const { container } = render(<AudioStatusBadge audioMode={mode} />);
    const dot = container.querySelector('.audio-status-badge') as HTMLElement;
    expect(dot.style.boxShadow).not.toBe('');
  });

  it.each(AUDIO_MODES)('accessible name includes the human and lore label for audioMode "%s"', (mode) => {
    render(<AudioStatusBadge audioMode={mode} />);
    const label = AUDIO_MODE_LABELS[mode];
    const badge = screen.getByRole('status', { name: new RegExp(`${label.humanLabel}.*${label.loreLabel}`) });
    expect(badge).toBeTruthy();
  });

  it('renders exactly one dot element per instance', () => {
    const { container } = render(<AudioStatusBadge audioMode="solo" />);
    expect(container.querySelectorAll('.audio-status-badge')).toHaveLength(1);
  });
});
