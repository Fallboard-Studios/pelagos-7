import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('./CabinetBox', () => ({
  CabinetBox: ({ popped, timelineKey, children }: { popped: number; timelineKey: string; children?: React.ReactNode }) => (
    <div data-testid="cabinet-box" data-popped={popped} data-popped-type={typeof popped} data-timeline-key={timelineKey}>
      {children}
    </div>
  ),
}));

vi.mock('@/utils/voxelTrackMath', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/voxelTrackMath')>();
  return { ...actual, computeVoxelFillBackground: vi.fn(actual.computeVoxelFillBackground) };
});

import { VoxelTrack } from './VoxelTrack';
import { computeVoxelFillBackground, type VoxelBoxState } from '@/utils/voxelTrackMath';

const states: VoxelBoxState[] = [
  { fillPercent: 100, popT: 0 },
  { fillPercent: 50, popT: 1 },
  { fillPercent: 0, popT: 0 },
];

describe('VoxelTrack', () => {
  it('renders exactly states.length CabinetBox instances', () => {
    const { getAllByTestId } = render(
      <VoxelTrack states={states} boxSize={32} gap={8} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    expect(getAllByTestId('cabinet-box')).toHaveLength(3);
  });

  it("each instance's popped prop equals that index's state.popT, as a number (not coerced to boolean)", () => {
    const { getAllByTestId } = render(
      <VoxelTrack states={states} boxSize={32} gap={8} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = getAllByTestId('cabinet-box');
    expect(boxes[0].dataset.poppedType).toBe('number');
    expect(boxes[0].dataset.popped).toBe('0');
    expect(boxes[1].dataset.popped).toBe('1');
    expect(boxes[2].dataset.popped).toBe('0');
  });

  it("each instance's timelineKey is `${timelineKeyPrefix}-${i}`, unique per box", () => {
    const { getAllByTestId } = render(
      <VoxelTrack states={states} boxSize={32} gap={8} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = getAllByTestId('cabinet-box');
    expect(boxes[0].dataset.timelineKey).toBe('cabinet-voxel-test-0');
    expect(boxes[1].dataset.timelineKey).toBe('cabinet-voxel-test-1');
    expect(boxes[2].dataset.timelineKey).toBe('cabinet-voxel-test-2');
  });

  it("each box's fill child background matches computeVoxelFillBackground(state.fillPercent, axis) exactly", () => {
    const { container } = render(
      <VoxelTrack states={states} boxSize={32} gap={8} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const fills = container.querySelectorAll<HTMLElement>('.sc-voxel-track__fill');
    expect(fills).toHaveLength(3);
    // computeVoxelFillBackground is pure/deterministic — calling it again
    // directly gives the real expected value, rather than re-deriving the
    // CSS string independently in this test.
    expect(fills[0].style.background).toBe(computeVoxelFillBackground(100, 'horizontal'));
    expect(fills[1].style.background).toBe(computeVoxelFillBackground(50, 'horizontal'));
    expect(fills[2].style.background).toBe(computeVoxelFillBackground(0, 'horizontal'));
    // Confirms the real function was actually called with each box's own
    // fillPercent and the track's axis — not bypassed.
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(100, 'horizontal');
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(50, 'horizontal');
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(0, 'horizontal');
  });

  it('root element carries aria-hidden="true" and data-axis matching the axis prop', () => {
    const { container } = render(
      <VoxelTrack states={states} boxSize={32} gap={8} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const root = container.querySelector('.sc-voxel-track');
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.getAttribute('data-axis')).toBe('vertical');
  });

  it('applies --voxel-box-size and --voxel-gap as inline custom properties on the root', () => {
    const { container } = render(
      <VoxelTrack states={states} boxSize={32} gap={8} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const root = container.querySelector('.sc-voxel-track') as HTMLElement;
    expect(root.style.getPropertyValue('--voxel-box-size')).toBe('32px');
    expect(root.style.getPropertyValue('--voxel-gap')).toBe('8px');
  });
});
