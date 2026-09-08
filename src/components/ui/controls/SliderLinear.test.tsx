import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./VoxelTrack', () => ({
  VoxelTrack: ({ states, axis }: { states: unknown; axis: string }) => (
    <div data-testid="voxel-track" data-states={JSON.stringify(states)} data-axis={axis} />
  ),
}));

import { SliderLinear } from './SliderLinear';
import { CABINET_BOX_HEIGHT, CABINET_VOXEL_GAP } from '@/utils/cabinetBreakpoints';
import {
  VOXEL_TRACK_MIN_BOX_COUNT,
  computeFittedBoxCount,
  computeVoxelTrackLength,
  computeVoxelBoxStates,
} from '@/utils/voxelTrackMath';
import type { SliderLinearSchema } from '@/types/controls';

// No window.matchMedia stub in this file — useCabinetBoxHeight/useVoxelTrackGap's
// own resolveTier() falls back to 'desktop' whenever matchMedia isn't a
// function (jsdom doesn't implement it unless polyfilled, and this file
// polyfills neither), so every test below resolves the desktop tier
// (48px box, 12px gap) unless noted. vitest.setup.ts's global ResizeObserver
// polyfill is a no-op (never fires), so useVoxelTrackBoxCount's live
// measurement never resolves past its initial 0 in these tests — landing on
// the VOXEL_TRACK_MIN_BOX_COUNT (3) floor by default, computed here from the
// real constants/functions rather than a hardcoded literal.
const DEFAULT_DESKTOP_TRACK_LENGTH = computeVoxelTrackLength(
  VOXEL_TRACK_MIN_BOX_COUNT,
  CABINET_BOX_HEIGHT.desktop,
  CABINET_VOXEL_GAP.desktop,
);

const schema: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10, humanLabel: 'Oscillation Rate', unit: 'Hz', orientation: 'horizontal' };

describe('SliderLinear', () => {
  it('renders a slider reflecting min/max/value from schema', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0.1');
    expect(thumb.getAttribute('aria-valuemax')).toBe('10');
    expect(thumb.getAttribute('aria-valuenow')).toBe('2');
  });

  it('renders {value}{unit} when schema.unit is present', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('2Hz')).toBeTruthy();
  });

  it('still renders the bare value when schema.unit is absent — a unitless param like Resonance/Q must not be left blank', () => {
    const noUnitSchema: SliderLinearSchema = { id: 'x', type: 'sliderLinear', min: 0, max: 1, orientation: 'horizontal' };
    render(<SliderLinear schema={noUnitSchema} value={0.5} onChange={() => {}} />);
    expect(screen.getByText('0.5')).toBeTruthy();
  });

  it('caps the displayed value at 3 decimal places, hiding floating-point noise — but leaves aria-valuenow at full precision', () => {
    render(<SliderLinear schema={schema} value={4.999999999999999} onChange={() => {}} />);
    expect(screen.getByText('5Hz')).toBeTruthy();
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('4.999999999999999');
  });

  it('renders its own schema labels via an internally-composed DualLabel', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('Oscillation Rate')).toBeTruthy();
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10, orientation: 'horizontal' };
    render(<SliderLinear schema={bareSchema} value={2} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'lfoRate' })).toBeTruthy();
  });

  it('is not disabled by default — no existing behavior changes', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBeNull();
    expect(thumb.getAttribute('tabindex')).toBe('0');
  });

  it('marks the thumb data-disabled and removes it from tab order when disabled is true', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} disabled />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBe('');
    expect(thumb.getAttribute('tabindex')).toBeNull();
  });

  it('does not call onChange on a disabled slider when a keyboard step is attempted', () => {
    const onChange = vi.fn();
    render(<SliderLinear schema={schema} value={2} onChange={onChange} disabled />);
    const thumb = screen.getByRole('slider');
    thumb.focus();
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('orientation', () => {
    const verticalSchema: SliderLinearSchema = { ...schema, orientation: 'vertical' };
    const autoSchema: SliderLinearSchema = { ...schema, orientation: 'auto' };

    it("'vertical': passes orientation=\"vertical\" through to the underlying Radix root", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-linear__root');
      expect(root?.getAttribute('data-orientation')).toBe('vertical');
    });

    it("'vertical': the outer wrapper carries data-orientation=\"vertical\" — CSS keys off this to go inline-flex and center its column", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear');
      expect(wrapper?.getAttribute('data-orientation')).toBe('vertical');
    });

    it("'horizontal' (default): the outer wrapper carries data-orientation=\"horizontal\", not left unset", () => {
      const { container } = render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear');
      expect(wrapper?.getAttribute('data-orientation')).toBe('horizontal');
    });

    it("'vertical': renders the value readout before the track in DOM order — a dragging thumb must never cover it", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__root'));
      expect(valueIndex).toBeGreaterThanOrEqual(0);
      expect(rootIndex).toBeGreaterThanOrEqual(0);
      expect(valueIndex).toBeLessThan(rootIndex);
    });

    it("'horizontal' (default): renders the value readout after the track, unchanged from before orientation existed", () => {
      const { container } = render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__root'));
      expect(rootIndex).toBeLessThan(valueIndex);
    });

    it("'vertical': ALWAYS sets an inline height now, even when verticalHeight is omitted — box count self-fits (roadmap 11.1.3), it doesn't fall back to the old CSS --slider-vertical-height default", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      // No ResizeObserver ever fires in this file (global no-op polyfill),
      // so box count lands on the VOXEL_TRACK_MIN_BOX_COUNT floor.
      expect(root?.style.height).toBe(`${DEFAULT_DESKTOP_TRACK_LENGTH}px`);
      expect(root?.style.height).not.toBe('');
    });

    it("'vertical': verticalHeight is a fitting BUDGET, not a literal applied value — the rendered height is the box-quantized computeVoxelTrackLength output", () => {
      // 250px fits 4 boxes at the desktop tier (48px box, 12px gap):
      // floor((250+12)/(48+12)) = floor(4.37) = 4 — deliberately not an exact
      // multiple, so the rendered height (228px) provably differs from the
      // supplied 250px, proving it's quantized rather than applied verbatim.
      const fittedCount = computeFittedBoxCount(250, CABINET_BOX_HEIGHT.desktop, CABINET_VOXEL_GAP.desktop);
      expect(fittedCount).toBe(4); // sanity-check the test's own premise
      const expectedHeight = computeVoxelTrackLength(fittedCount, CABINET_BOX_HEIGHT.desktop, CABINET_VOXEL_GAP.desktop);

      const { container } = render(
        <SliderLinear schema={verticalSchema} value={2} onChange={() => {}} verticalHeight={250} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      expect(root?.style.height).toBe(`${expectedHeight}px`);
      expect(root?.style.height).not.toBe('250px');
    });

    it("'horizontal': ignores a verticalHeight prop for height, but now sets an inline WIDTH from the same box-count-fitting mechanism", () => {
      const { container } = render(
        <SliderLinear schema={schema} value={2} onChange={() => {}} verticalHeight={300} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      expect(root?.style.height).toBe('');
      expect(root?.style.width).toBe(`${DEFAULT_DESKTOP_TRACK_LENGTH}px`);
    });

    it("'auto': renders without throwing, resolving to horizontal-looking output before any ResizeObserver measurement fires", () => {
      const { container } = render(<SliderLinear schema={autoSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-linear__root');
      expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    });
  });

  describe('voxel-track wiring (roadmap 11.1.3)', () => {
    it('renders a VoxelTrack with states matching computeVoxelBoxStates for the currently-fitted box count', () => {
      const { getByTestId } = render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
      const track = getByTestId('voxel-track');
      const renderedStates = JSON.parse(track.dataset.states ?? 'null');
      // No ResizeObserver ever fires in this file, so box count lands on the floor.
      const expectedStates = computeVoxelBoxStates(2, schema.min, schema.max, VOXEL_TRACK_MIN_BOX_COUNT);
      expect(renderedStates).toEqual(expectedStates);
      expect(track.dataset.axis).toBe('horizontal');
    });

    // Slider.Thumb's background-color: transparent (SliderLinear.css) is a
    // CSS-only rule, not asserted here — jsdom does not apply imported CSS
    // module stylesheets (no `test.css` config in this repo), so a
    // getComputedStyle assertion would be tautological (it'd pass whether
    // or not the rule actually exists). Verified by reading the shipped
    // CSS directly, per VERTICAL_SLIDERS.md's own precedent of not
    // unit-testing CSS-only rules (also DIRECTIONAL_PANEL.md §... and
    // OBLIQUE_CABINETRY_FOUNDATION.md's own .sc-cabinet-box__walls case).

    it('exactly one role="slider" element exists — the voxel boxes introduce no ARIA-role ambiguity', () => {
      render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
      expect(screen.getAllByRole('slider')).toHaveLength(1);
    });
  });
});
