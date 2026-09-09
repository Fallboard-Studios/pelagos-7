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

// STATES[2] is the straddling box (popT === 1, the only state computeVoxelBoxStates
// ever assigns that to) — a genuinely fractional fillPercent (62), not 0 or 100,
// so the glow/flat split is meaningfully exercised, not a degenerate edge case.
const STATES: VoxelBoxState[] = [
  { fillPercent: 0, popT: 0 },
  { fillPercent: 100, popT: 0.5 },
  { fillPercent: 62, popT: 1 },
];

describe('VoxelTrack', () => {
  it('renders one CabinetBox per non-straddling state, and two (glow + flat) for the one straddling state (popT === 1)', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    // 2 non-straddling states x 1 box each, + 1 straddling state x 2 boxes = 4.
    expect(screen.getAllByTestId('cabinet-box')).toHaveLength(4);
  });

  it('renders zero CabinetBox instances for an empty states array, without throwing', () => {
    expect(() => {
      render(
        <VoxelTrack states={[]} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
    }).not.toThrow();
    expect(screen.queryAllByTestId('cabinet-box')).toHaveLength(0);
  });

  it("passes each non-straddling box's popT as CabinetBox's popped prop, and (1, 0) for the straddling slot's (glow, flat) pieces — in DOM order, as real numbers (not coerced to boolean)", () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.map((box) => box.getAttribute('data-popped'))).toEqual(['0', '0.5', '1', '0']);
    expect(boxes.every((box) => box.getAttribute('data-popped-type') === 'number')).toBe(true);
  });

  it('passes boxSize as every CabinetBox instance\'s boxHeight prop — including both straddling sub-pieces', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.every((box) => box.getAttribute('data-box-height') === '40')).toBe(true);
  });

  it('passes VOXEL_TRACK_POP_DISTANCE as every CabinetBox instance\'s popDistance prop — including both straddling sub-pieces — deeper than Button/Toggle\'s own default', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.every((box) => box.getAttribute('data-pop-distance') === String(VOXEL_TRACK_POP_DISTANCE))).toBe(true);
  });

  it('gives each non-straddling box a unique `${timelineKeyPrefix}-${i}` timelineKey, and the straddling slot\'s two pieces their own distinct `-glow`/`-flat` suffixed keys', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-slider1" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    const keys = boxes.map((box) => box.getAttribute('data-timeline-key'));
    expect(keys).toEqual([
      'cabinet-voxel-slider1-0',
      'cabinet-voxel-slider1-1',
      'cabinet-voxel-slider1-2-glow',
      'cabinet-voxel-slider1-2-flat',
    ]);
    expect(new Set(keys).size).toBe(keys.length); // all unique
  });

  it("renders each non-straddling box's fill child with the background computeVoxelFillBackground actually returns for its own fillPercent/axis", () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const fills = container.querySelectorAll<HTMLElement>('.sc-voxel-track__fill');
    expect(fills).toHaveLength(4);
    // computeVoxelFillBackground is spied (importOriginal), not hand-mocked —
    // calling it here re-uses the real implementation to derive the expected
    // string, rather than re-deriving it independently.
    expect(fills[0].style.background).toBe(computeVoxelFillBackground(0, 'horizontal'));
    expect(fills[1].style.background).toBe(computeVoxelFillBackground(100, 'horizontal'));
  });

  it("renders the straddling slot's glow piece fully solid-accent and its flat piece fully solid-surface — never a gradient, and never either piece's own (there is no 'own') fractional fillPercent", () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const fills = container.querySelectorAll<HTMLElement>('.sc-voxel-track__fill');
    // fills[2] = glow piece, fills[3] = flat piece (DOM order matches the
    // CabinetBox order asserted above).
    expect(fills[2].style.background).toBe(computeVoxelFillBackground(100, 'horizontal'));
    expect(fills[3].style.background).toBe(computeVoxelFillBackground(0, 'horizontal'));
    expect(computeVoxelFillBackground).not.toHaveBeenCalledWith(62, 'horizontal');
  });

  it('passes the vertical axis through to computeVoxelFillBackground when axis is vertical', () => {
    render(<VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />);
    expect(computeVoxelFillBackground).toHaveBeenCalledWith(0, 'vertical');
  });

  describe('straddling slot — two adjacent full-size-summing pieces (glow + flat), replacing the old internal fill gradient', () => {
    it("horizontal: glow piece's frontWidth is boxSize * computeVoxelStraddleSizeFraction(fillPercent); flat piece's frontWidth is the exact remainder — the two always sum to exactly boxSize", () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const [glow, flat] = boxes.slice(2, 4); // the straddling slot's two pieces
      const expectedGlowWidth = 40 * computeVoxelStraddleSizeFraction(62);
      expect(glow.getAttribute('data-front-width')).toBe(String(expectedGlowWidth));
      expect(flat.getAttribute('data-front-width')).toBe(String(40 - expectedGlowWidth));
      const sum = Number(glow.getAttribute('data-front-width')) + Number(flat.getAttribute('data-front-width'));
      expect(sum).toBe(40); // the box's own boxSize — never anything else
    });

    it('horizontal: neither piece overrides frontHeight — the cross-axis stays the full boxSize via CSS, for both pieces', () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const [glow, flat] = boxes.slice(2, 4);
      expect(glow.getAttribute('data-front-height')).toBeNull();
      expect(flat.getAttribute('data-front-height')).toBeNull();
    });

    it("vertical: glow piece's frontHeight is boxSize * computeVoxelStraddleSizeFraction(fillPercent); flat piece's frontHeight is the exact remainder — the two always sum to exactly boxSize", () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const [glow, flat] = boxes.slice(2, 4);
      const expectedGlowHeight = 40 * computeVoxelStraddleSizeFraction(62);
      expect(glow.getAttribute('data-front-height')).toBe(String(expectedGlowHeight));
      expect(flat.getAttribute('data-front-height')).toBe(String(40 - expectedGlowHeight));
    });

    it('vertical: neither piece overrides frontWidth — the cross-axis stays the full boxSize via CSS, for both pieces', () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const [glow, flat] = boxes.slice(2, 4);
      expect(glow.getAttribute('data-front-width')).toBeNull();
      expect(flat.getAttribute('data-front-width')).toBeNull();
    });

    it('the glow piece is fully popped (popped: 1) and the flat piece fully flat (popped: 0) — matching how a normal fully-filled/fully-empty box already renders elsewhere in the row', () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const [glow, flat] = boxes.slice(2, 4);
      expect(glow.getAttribute('data-popped')).toBe('1');
      expect(flat.getAttribute('data-popped')).toBe('0');
    });

    it('every non-straddling box (popT !== 1) gets neither frontWidth nor frontHeight — full-size, exactly as every box rendered before this feature existed', () => {
      render(
        <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      expect(boxes[0].getAttribute('data-front-width')).toBeNull(); // popT: 0
      expect(boxes[1].getAttribute('data-front-width')).toBeNull(); // popT: 0.5
      expect(boxes[0].getAttribute('data-front-height')).toBeNull();
      expect(boxes[1].getAttribute('data-front-height')).toBeNull();
    });

    it('at value === min (straddling fillPercent: 0), the glow piece still floors above zero width — the two pieces still sum to exactly boxSize, the flat piece simply takes up the rest', () => {
      const atMin: VoxelBoxState[] = [
        { fillPercent: 0, popT: 1 }, // box 0 straddles at the exact minimum
        { fillPercent: 0, popT: 0 },
        { fillPercent: 0, popT: 0 },
      ];
      render(
        <VoxelTrack states={atMin} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const [glow, flat] = boxes.slice(0, 2); // this fixture's straddling slot is index 0
      const expectedGlowWidth = 40 * computeVoxelStraddleSizeFraction(0);
      expect(expectedGlowWidth).toBeGreaterThan(0); // sanity-check the test's own premise (the floor)
      expect(glow.getAttribute('data-front-width')).toBe(String(expectedGlowWidth));
      expect(Number(glow.getAttribute('data-front-width')) + Number(flat.getAttribute('data-front-width'))).toBe(40);
    });

    it('at value === max (straddling fillPercent: 100), the flat piece legitimately goes to exactly zero width — no floor on that side, since a fully-popped box at the maximum is the correct look, not a broken one', () => {
      const atMax: VoxelBoxState[] = [
        { fillPercent: 100, popT: 0 },
        { fillPercent: 100, popT: 0 },
        { fillPercent: 100, popT: 1 }, // straddles at the exact maximum
      ];
      render(
        <VoxelTrack states={atMax} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
      );
      const boxes = screen.getAllByTestId('cabinet-box');
      const [glow, flat] = boxes.slice(2, 4);
      expect(glow.getAttribute('data-front-width')).toBe('40');
      expect(flat.getAttribute('data-front-width')).toBe('0');
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
