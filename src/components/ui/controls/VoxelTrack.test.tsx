import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./CabinetBox', () => ({
  CabinetBox: ({
    popped,
    timelineKey,
    boxHeight,
    popDistance,
    zIndex,
    frontWidth,
    frontHeight,
    skipMountAnimation,
    children,
  }: {
    popped: number;
    timelineKey: string;
    boxHeight: number;
    popDistance?: number;
    zIndex?: number;
    frontWidth?: number;
    frontHeight?: number;
    skipMountAnimation?: boolean;
    children: React.ReactNode;
  }) => (
    <div
      data-testid="cabinet-box"
      data-popped={popped}
      data-popped-type={typeof popped}
      data-timeline-key={timelineKey}
      data-box-height={boxHeight}
      data-pop-distance={popDistance}
      data-z-index={zIndex}
      data-front-width={frontWidth}
      data-front-height={frontHeight}
      data-skip-mount-animation={skipMountAnimation}
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
import {
  computeVoxelFillBackground,
  computeVoxelStraddleSizeFraction,
  computeVoxelBoxPopDistance,
  computeVoxelBoxZIndex,
  type VoxelBoxState,
} from '@/utils/voxelTrackMath';

// STATES[2] is the straddling box (isStraddling: true — NOT identifiable via
// popT alone: an ordinary fully-filled box is ALSO popT: 1, found live
// 2026-09-09; see VoxelBoxState's own isStraddling comment) — a genuinely
// fractional fillPercent (62), not 0 or 100, so the glow/flat split is
// meaningfully exercised, not a degenerate edge case.
const STATES: VoxelBoxState[] = [
  { fillPercent: 0, popT: 0, isStraddling: false },
  { fillPercent: 100, popT: 0.5, isStraddling: false },
  { fillPercent: 62, popT: 1, isStraddling: true },
];

describe('VoxelTrack', () => {
  it('renders one CabinetBox per non-straddling state, and two (glow + flat) for the one straddling state (isStraddling: true)', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    // 2 non-straddling states x 1 box each, + 1 straddling state x 2 boxes = 4.
    expect(screen.getAllByTestId('cabinet-box')).toHaveLength(4);
  });

  it('renders exactly ONE straddling slot even when multiple boxes are fully filled (popT: 1) — popT alone is not unique, isStraddling is what VoxelTrack must branch on (found live, 2026-09-09: every filled box was previously ALSO taking the 2-piece straddle path, not just the true straddling one)', () => {
    // A realistic computeVoxelBoxStates(62.5, 0, 100, 4) output: boxes 0-1 are
    // ordinary fully-filled (popT: 1, isStraddling: false), box 2 is the real
    // straddling box (also popT: 1, isStraddling: true), box 3 is unfilled.
    const multiFilled: VoxelBoxState[] = [
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 50, popT: 1, isStraddling: true },
      { fillPercent: 0, popT: 0, isStraddling: false },
    ];
    const { container } = render(
      <VoxelTrack states={multiFilled} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    // 3 ordinary boxes (0, 1, 3) x 1 CabinetBox each + 1 straddling slot (2) x 2 = 5.
    expect(screen.getAllByTestId('cabinet-box')).toHaveLength(5);
    expect(container.querySelectorAll('.sc-voxel-track__straddle')).toHaveLength(1);
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

  it("passes each box's own row-position pop distance (computeVoxelBoxPopDistance(i, states.length)) as its popDistance prop — the straddling slot's two sub-pieces share the straddling box's own index", () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    // STATES has 3 entries; box 2 (the straddling one) renders as two pieces
    // (glow, flat), both at index 2's own pop distance.
    const expected = [
      computeVoxelBoxPopDistance(0, 3),
      computeVoxelBoxPopDistance(1, 3),
      computeVoxelBoxPopDistance(2, 3),
      computeVoxelBoxPopDistance(2, 3),
    ];
    expect(boxes.map((box) => box.getAttribute('data-pop-distance'))).toEqual(expected.map(String));
    // Row position, not proximity to the straddling box, drives the value —
    // the last box in the row is deepest regardless of which box straddles.
    expect(computeVoxelBoxPopDistance(2, 3)).toBeGreaterThan(computeVoxelBoxPopDistance(0, 3));
  });

  it("passes each box's own row-position z-index (computeVoxelBoxZIndex(i, states.length, axis)) as its zIndex prop, on the CabinetBox instance for non-straddling boxes and as an inline style on the straddling slot's own wrapper — its two glow/flat sub-pieces stay unset, keeping their existing internal ordering", () => {
    const { container } = render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    // Non-straddling boxes (0, 1) get their own index's z-index directly.
    expect(boxes[0].getAttribute('data-z-index')).toBe(String(computeVoxelBoxZIndex(0, 3, 'horizontal')));
    expect(boxes[1].getAttribute('data-z-index')).toBe(String(computeVoxelBoxZIndex(1, 3, 'horizontal')));
    // The straddling slot's two sub-pieces (glow, flat) receive no zIndex
    // prop of their own — the wrapper carries it instead (asserted below).
    expect(boxes[2].getAttribute('data-z-index')).toBeNull();
    expect(boxes[3].getAttribute('data-z-index')).toBeNull();

    const straddle = container.querySelector('.sc-voxel-track__straddle') as HTMLElement;
    expect(straddle.style.zIndex).toBe(String(computeVoxelBoxZIndex(2, 3, 'horizontal')));

    // Left outranks right — box 0's z-index is the highest in this row.
    expect(computeVoxelBoxZIndex(0, 3, 'horizontal')).toBeGreaterThan(computeVoxelBoxZIndex(1, 3, 'horizontal'));
    expect(computeVoxelBoxZIndex(1, 3, 'horizontal')).toBeGreaterThan(computeVoxelBoxZIndex(2, 3, 'horizontal'));
  });

  it('vertical: the last (topmost, per column-reverse) box outranks every box below it — z-index ascends with index, the opposite direction from horizontal', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="vertical" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes[0].getAttribute('data-z-index')).toBe(String(computeVoxelBoxZIndex(0, 3, 'vertical')));
    expect(boxes[1].getAttribute('data-z-index')).toBe(String(computeVoxelBoxZIndex(1, 3, 'vertical')));
    expect(computeVoxelBoxZIndex(1, 3, 'vertical')).toBeGreaterThan(computeVoxelBoxZIndex(0, 3, 'vertical'));
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
        { fillPercent: 0, popT: 1, isStraddling: true }, // box 0 straddles at the exact minimum
        { fillPercent: 0, popT: 0, isStraddling: false },
        { fillPercent: 0, popT: 0, isStraddling: false },
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
        { fillPercent: 100, popT: 0, isStraddling: false },
        { fillPercent: 100, popT: 0, isStraddling: false },
        { fillPercent: 100, popT: 1, isStraddling: true }, // straddles at the exact maximum
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

  it("passes skipMountAnimation on every CabinetBox it renders — including both straddling sub-pieces — since a box's 'first mount' here is frequently a React remount at the ordinary/straddling role boundary, not a genuinely new box appearing (roadmap 11.1.3 follow-up)", () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    expect(boxes.every((box) => box.getAttribute('data-skip-mount-animation') === 'true')).toBe(true);
  });

  it("when a state carries popDistanceLocalIndex/popDistanceLocalCount, computeVoxelBoxPopDistance is called with THOSE values instead of the box's row index/states.length — while its z-index still uses the real row index/length, unaffected (roadmap 11.1.5)", () => {
    const withOverride: VoxelBoxState[] = [
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 100, popT: 1, isStraddling: false },
      // Row position 2 of 3, but its local index/count claim it's box 0 of 2
      // — a value that would produce a different result than (2, 3).
      { fillPercent: 50, popT: 1, isStraddling: true, popDistanceLocalIndex: 0, popDistanceLocalCount: 2 },
    ];
    const { container } = render(
      <VoxelTrack states={withOverride} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const boxes = screen.getAllByTestId('cabinet-box');
    // The straddling slot (index 2) renders as 2 pieces (glow, flat) — both
    // must use the override, not the real (2, 3) row position.
    const overriddenDistance = computeVoxelBoxPopDistance(0, 2);
    expect(overriddenDistance).not.toBe(computeVoxelBoxPopDistance(2, 3));
    expect(boxes[2].getAttribute('data-pop-distance')).toBe(String(overriddenDistance));
    expect(boxes[3].getAttribute('data-pop-distance')).toBe(String(overriddenDistance));

    // z-index is NOT affected by the override — still the box's real global
    // index (2) and the real row length (3).
    const straddle = container.querySelector('.sc-voxel-track__straddle') as HTMLElement;
    expect(straddle.style.zIndex).toBe(String(computeVoxelBoxZIndex(2, 3, 'horizontal')));
  });

  it("stamps data-flip=\"true\" on the straddling slot's wrapper when the straddling state carries flipStraddleFill: true — CSS keys off this to visually swap which side the glow (filled) piece renders on, for SliderCenteredZero's negative side (roadmap 11.1.5 bugfix: the fill direction read backwards — left-to-right instead of right-to-left — for a negative value)", () => {
    const flippedStates: VoxelBoxState[] = [
      { fillPercent: 0, popT: 0, isStraddling: false },
      { fillPercent: 20, popT: 1, isStraddling: true, flipStraddleFill: true },
    ];
    const { container } = render(
      <VoxelTrack states={flippedStates} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const straddle = container.querySelector('.sc-voxel-track__straddle') as HTMLElement;
    expect(straddle.getAttribute('data-flip')).toBe('true');
  });

  it('does not stamp data-flip when the straddling state omits flipStraddleFill (SliderLinear/SliderLog\'s own computeVoxelBoxStates output never sets it) — default rendering is unaffected', () => {
    render(
      <VoxelTrack states={STATES} boxSize={40} gap={10} axis="horizontal" timelineKeyPrefix="cabinet-voxel-test" />,
    );
    const straddle = document.querySelector('.sc-voxel-track__straddle') as HTMLElement;
    expect(straddle.getAttribute('data-flip')).toBeNull();
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
