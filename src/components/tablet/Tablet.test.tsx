import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Composition-level test — mocks SleeveContainer/ScreenViewport themselves
// (each already has its own dedicated test file) rather than dragging in
// their real dependency trees (PowerRockerSwitch's power/audio/animation
// systems, ScreenViewport's TransportBar/WorldView/Console, which pull in
// real Tone.js/GSAP that throw in this jsdom environment — the same
// boundary ScreenViewport.test.tsx itself draws for its own children).
vi.mock('@/components/panels/physical/SleeveContainer', () => ({
  default: ({ hasPowerSwitch }: { hasPowerSwitch?: boolean }) => (
    <div data-testid={hasPowerSwitch ? 'sleeve-power' : 'sleeve-plain'} />
  ),
}));
vi.mock('@/components/panels/physical/ScreenViewport', () => ({
  default: () => <div data-testid="screen-viewport-stub" />,
}));
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (s: { isPoweredOn: boolean }) => unknown) => selector({ isPoweredOn: false }),
}));

import Tablet from './Tablet';

describe('Tablet', () => {
  it('renders the decorative top strip — moved here from SleeveContainer, now spans the full device width rather than being scoped to one sleeve instance', () => {
    const { container } = render(<Tablet />);
    const strip = container.querySelector('.sleeve-container__top-strip');
    expect(strip).toBeTruthy();
    expect(strip?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders both SleeveContainer instances (power + plain) and ScreenViewport', () => {
    const { getByTestId } = render(<Tablet />);
    expect(getByTestId('sleeve-power')).toBeTruthy();
    expect(getByTestId('sleeve-plain')).toBeTruthy();
    expect(getByTestId('screen-viewport-stub')).toBeTruthy();
  });

  it('applies the seed-driven console theme as inline CSS custom properties on .tablet, using real default store state', () => {
    // attenuationStyleStore/localeStore are NOT mocked here — the real
    // default AS/locale populate fine, same as the two tests above (per
    // docs/specs/CONSOLE_THEMING.md §5's Tablet.test.tsx requirement).
    const { container } = render(<Tablet />);
    const tablet = container.querySelector('.tablet') as HTMLElement | null;
    expect(tablet).toBeTruthy();

    const style = tablet!.style;
    for (const prop of ['--color-bg', '--color-surface', '--color-accent', '--color-border']) {
      const value = style.getPropertyValue(prop);
      expect(value, `${prop} on .tablet's inline style`).not.toBe('');
      expect(value, `${prop} on .tablet's inline style`).toMatch(/^hsl\(\d+ \d+% \d+%\)$/);
    }
  });
});
