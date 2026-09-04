import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaletteSample } from './PaletteSample';

// Real attenuationStyleStore/localeStore, real render — same unmocked
// approach Tablet.test.tsx's own theme test uses; the default AS/locale
// populate fine.

describe('PaletteSample', () => {
  it('renders a swatch for each of the 4 seed-driven console theme tokens', () => {
    render(<PaletteSample />);
    expect(screen.getByTestId('palette-sample')).toBeTruthy();
    for (const key of ['bg', 'surface', 'accent', 'border']) {
      expect(screen.getByTestId(`palette-sample-${key}`)).toBeTruthy();
    }
  });

  it("each swatch's chip carries the computed color as its inline background, not a CSS variable reference", () => {
    render(<PaletteSample />);
    for (const key of ['bg', 'surface', 'accent', 'border']) {
      const chip = screen.getByTestId(`palette-sample-${key}`).querySelector('.palette-sample__chip') as HTMLElement;
      expect(chip).toBeTruthy();
      // jsdom parses the hsl(...) string fine but normalizes it to rgb(...)
      // on readback — this asserts it parsed as a real color (not '', which
      // is what an unparsed/invalid value or a var() reference would leave).
      expect(chip.style.backgroundColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    }
  });

  it('shows the raw hsl(...) value as readable text next to each chip', () => {
    render(<PaletteSample />);
    const bgValue = screen.getByTestId('palette-sample-bg').textContent ?? '';
    expect(bgValue).toMatch(/hsl\(\d+ \d+% \d+%\)/);
  });

  it('labels the panel and each swatch', () => {
    render(<PaletteSample />);
    expect(screen.getByText('Console Palette')).toBeTruthy();
    expect(screen.getByText('BG')).toBeTruthy();
    expect(screen.getByText('Surface')).toBeTruthy();
    expect(screen.getByText('Accent')).toBeTruthy();
    expect(screen.getByText('Border')).toBeTruthy();
  });
});
