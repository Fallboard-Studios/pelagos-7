import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./CabinetBox', () => ({
  CabinetBox: ({
    popped,
    timelineKey,
    boxHeight,
    children,
  }: {
    popped: number;
    timelineKey: string;
    boxHeight: number;
    children: React.ReactNode;
  }) => (
    <div
      data-testid="cabinet-box"
      data-popped={popped}
      data-popped-type={typeof popped}
      data-timeline-key={timelineKey}
      data-box-height={boxHeight}
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
import { computeVoxelFillBackground, type VoxelBoxState } from '@/utils/voxelTrackMath';

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

  it("renders each box's fill child with the background computeVoxelFillBackground actually returns for its fillPercent/axis", () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const fills = container.querySelectorAll<HTMLElement>('.sc-voxel-track__fill');
    expect(fills).toHaveLength(3);
    STATES.forEach((state, i) => {
      // computeVoxelFillBackground is spied (importOriginal), not
      // hand-mocked — calling it here re-uses the real implementation to
      // derive the expected string, rather than re-deriving it independently.
      expect(fills[i].style.background).toBe(computeVoxelFillBackground(state.fillPercent, 'horizontal'));
    });
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(0, 'horizontal');
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(100, 'horizontal');
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(62, 'horizontal');
  });

  it('passes the vertical axis through to computeVoxelFillBackground when axis is vertical', () => {
    render(<VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />);
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(0, 'vertical');
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
