import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./CabinetBox', () => ({
  CabinetBox: ({
    popped,
    timelineKey,
    boxHeight,
    popDistance,
    frontWidth,
    frontHeight,
    children,
  }: {
    popped: number;
    timelineKey: string;
    boxHeight: number;
    popDistance?: number;
    frontWidth?: number;
    frontHeight?: number;
    children: React.ReactNode;
  }) => (
    <div
      data-testid="cabinet-box"
      data-popped={popped}
      data-popped-type={typeof popped}
      data-timeline-key={timelineKey}
      data-box-height={boxHeight}
      data-pop-distance={popDistance}
      data-front-width={frontWidth}
      data-front-height={frontHeight}
    >
      {children}
    </div>
  ),
}));

vi.mock('@/utils/voxelTrackMath', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/voxelTrackMath')>();
  return { ...actual, computeVoxelFillBackground: vi.fn(actual.computeVoxelFillBackground) };
});

import { VoxelTrack } from './VoxelTrack';
import { computeVoxelFillBackground, computeVoxelStraddleSizeFraction, type VoxelBoxState } from '@/utils/voxelTrackMath';
import { VOXEL_TRACK_POP_DISTANCE } from '@/utils/cabinetGeometry';

const STATES: VoxelBoxState[] = [
  { fillPercent: 0, popT: 0 },
  { fillPercent: 100, popT: 0.5 },
  { fillPercent: 62, popT: 1 },
];

describe('VoxelTrack', () => {
  it('renders exactly states.length CabinetBox instances', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    expect(screen.getAllByTestId('cabinet-box')).toHaveLength(3);
  });

  it('renders zero CabinetBox instances for an empty states array, without throwing', () => {
    expect(() => {
      render(
        <VoxelTrack states={[]} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
    }).not.toThrow();
    expect(screen.queryAllByTestId('cabinet-box')).toHaveLength(0);
  });

  it("passes each box's popT as CabinetBox's popped prop, in order, as a real number (not coerced to boolean)", () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.map((box) => box.getAttribute('data-popped'))).toEqual(['0', '0.5', '1']);
    expect(boxes.every((box) => box.getAttribute('data-popped-type') === 'number')).toBe(true);
  });

  it('passes boxSize as every CabinetBox instance\'s boxHeight prop', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.every((box) => box.getAttribute('data-box-height') === '40')).toBe(true);
  });

  it('passes VOXEL_TRACK_POP_DISTANCE as every CabinetBox instance\'s popDistance prop — deeper than Button/Toggle\'s own default', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.every((box) => box.getAttribute('data-pop-distance') === String(VOXEL_TRACK_POP_DISTANCE))).toBe(true);
  });

  it('gives each CabinetBox instance a unique timelineKey of `${timelineKeyPrefix}-${i}`', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-slider1" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.map((box) => box.getAttribute('data-timeline-key'))).toEqual([
      'cabinet-voxel-slider1-0',
      'cabinet-voxel-slider1-1',
      'cabinet-voxel-slider1-2',
    ]);
  });

  it("renders each NON-straddling box's fill child with the background computeVoxelFillBackground actually returns for its own fillPercent/axis", () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const fills = container.querySelectorAll<HTMLElement>('.sc-voxel-track__fill');
    expect(fills).toHaveLength(3);
    // STATES[0] (popT: 0) and STATES[1] (popT: 0.5) are NOT the straddling
    // box (only popT === 1 is) — computeVoxelFillBackground is spied
    // (importOriginal), not hand-mocked, so calling it here re-uses the
    // real implementation to derive the expected string.
    expect(fills[0].style.background).toBe(computeVoxelFillBackground(0, 'horizontal'));
    expect(fills[1].style.background).toBe(computeVoxelFillBackground(100, 'horizontal'));
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(0, 'horizontal');
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(100, 'horizontal');
  });

  it('renders the straddling box (popT === 1) solid — computeVoxelFillBackground(100, axis) — never its own raw (fractional) fillPercent, since the box\'s own size now communicates the fill fraction instead of an internal gradient', () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const fills = container.querySelectorAll<HTMLElement>('.sc-voxel-track__fill');
    // STATES[2] is the straddling box: popT: 1, fillPercent: 62.
    expect(fills[2].style.background).toBe(computeVoxelFillBackground(100, 'horizontal'));
    expect(computeVoxelFillBackground).not.toHaveBeenCalledWith(62, 'horizontal');
  });

  it('passes the vertical axis through to computeVoxelFillBackground when axis is vertical', () => {
    render(<VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />);
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(0, 'vertical');
  });

  describe('straddling-box resize (popT === 1 — replaces the old internal fill gradient with a physically smaller box)', () => {
    it("horizontal: the straddling box's frontWidth is boxSize * computeVoxelStraddleSizeFraction(its own fillPercent); frontHeight is left at the full boxSize (unchanged, cross-axis)", () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const straddling = boxes[2]; // STATES[2]: popT: 1, fillPercent: 62
      const expectedWidth = 40 * computeVoxelStraddleSizeFraction(62);
      expect(straddling.getAttribute('data-front-width')).toBe(String(expectedWidth));
      expect(straddling.getAttribute('data-front-height')).toBeNull();
    });

    it("vertical: the straddling box's frontHeight is boxSize * computeVoxelStraddleSizeFraction(its own fillPercent); frontWidth is left at the full boxSize (unchanged, cross-axis)", () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const straddling = boxes[2];
      const expectedHeight = 40 * computeVoxelStraddleSizeFraction(62);
      expect(straddling.getAttribute('data-front-height')).toBe(String(expectedHeight));
      expect(straddling.getAttribute('data-front-width')).toBeNull();
    });

    it('every non-straddling box (popT !== 1) gets neither frontWidth nor frontHeight — full-size, exactly as before this feature', () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      expect(boxes[0].getAttribute('data-front-width')).toBeNull(); // popT: 0
      expect(boxes[1].getAttribute('data-front-width')).toBeNull(); // popT: 0.5
      expect(boxes[0].getAttribute('data-front-height')).toBeNull();
      expect(boxes[1].getAttribute('data-front-height')).toBeNull();
    });

    it('at value === min (straddling box fillPercent: 0), the straddle size fraction still floors above zero — the box never fully disappears', () => {
      const atMin: VoxelBoxState[] = [
        { fillPercent: 0, popT: 1 }, // box 0 straddles at the exact minimum
        { fillPercent: 0, popT: 0 },
        { fillPercent: 0, popT: 0 },
      ];
      render(
        <VoxelTrack states={atMin} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const expectedWidth = 40 * computeVoxelStraddleSizeFraction(0);
      expect(expectedWidth).toBeGreaterThan(0); // sanity-check the test's own premise
      expect(boxes[0].getAttribute('data-front-width')).toBe(String(expectedWidth));
    });
  });

  it('marks the root element aria-hidden and stamps data-axis matching the axis prop (horizontal)', () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const root = container.querySelector('.sc-voxel-track');
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.getAttribute('data-axis')).toBe('horizontal');
  });

  it('stamps data-axis="vertical" on the root element when axis is vertical', () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const root = container.querySelector('.sc-voxel-track');
    expect(root?.getAttribute('data-axis')).toBe('vertical');
  });

  it('applies boxSize/gap as the --voxel-box-size/--voxel-gap inline custom properties on the root element', () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={48} gap={12} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const root = container.querySelector('.sc-voxel-track') as HTMLElement;
    expect(root.style.getPropertyValue('--voxel-box-size')).toBe('48px');
    expect(root.style.getPropertyValue('--voxel-gap')).toBe('12px');
  });
});
