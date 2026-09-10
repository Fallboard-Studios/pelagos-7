import type { CSSProperties } from 'react';
import { CabinetBox } from './CabinetBox';
import {
  computeVoxelFillBackground,
  computeVoxelStraddleSizeFraction,
  computeVoxelBoxPopDistance,
  computeVoxelBoxZIndex,
  type VoxelBoxState,
} from '@/utils/voxelTrackMath';
import './VoxelTrack.css';

interface VoxelTrackProps {
  states: VoxelBoxState[];
  boxSize: number;
  gap: number;
  axis: 'horizontal' | 'vertical';
  /** Unique per-slider-instance prefix; each box gets `${timelineKeyPrefix}-${i}`. */
  timelineKeyPrefix: string;
}

/**
 * Shared voxel-track rendering (roadmap Phase 11.1.3) — a row (or, vertical,
 * a bottom-to-top column) of uniform CabinetBox facades standing in for a
 * slider's traditional track+handle. Purely a pointer-events: none visual
 * overlay; SliderLinear.tsx (and, unchanged, SliderLog/SliderCenteredZero in
 * 11.1.4/11.1.5) keeps Radix's own Slider.Root/Track/Thumb fully in charge
 * of interaction — see docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.10.
 *
 * Every CabinetBox instance below gets skipMountAnimation (2026-09-09 fix).
 * The box at the ordinary/straddling role boundary — a plain CabinetBox vs.
 * the straddling slot's two-piece glow+flat wrapper below — changes element
 * type at the same React key every time the straddling index moves, which
 * forces a remount even though the box was already visible a frame earlier.
 * Without this flag, CabinetBox's own "animate in from the opposite state on
 * first mount" behavior (correct for Button/Toggle, where a first mount is a
 * genuinely new element) replayed a full flat↔popped tween on that remount —
 * a spurious wall flash with no real transition behind it. See
 * CabinetBox.tsx's own CabinetBoxProps.skipMountAnimation comment.
 */
export function VoxelTrack({ states, boxSize, gap, axis, timelineKeyPrefix }: VoxelTrackProps) {
  const tokens = {
    '--voxel-box-size': `${boxSize}px`,
    '--voxel-gap': `${gap}px`,
  } as CSSProperties;

  return (
    <div className="sc-voxel-track" data-axis={axis} style={tokens} aria-hidden="true">
      {states.map((state, i) => {
        // Each box's own pop distance ceiling is fixed by its row position
        // (index i of states.length total) by default, never by the
        // slider's current value — a box near the minimum end tops out
        // shallow even while it's the one currently popped. SliderCenteredZero
        // (roadmap 11.1.5) overrides this with a LOCAL index/count pair —
        // distance from its own side's zero seam, not the box's raw row
        // position — via VoxelBoxState's own optional popDistanceLocalIndex/
        // popDistanceLocalCount fields; SliderLinear/SliderLog never set
        // either, so their own falloff is unaffected. See
        // computeVoxelBoxPopDistance and docs/specs/
        // OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md §1.3.
        const popDistance = computeVoxelBoxPopDistance(
          state.popDistanceLocalIndex ?? i,
          state.popDistanceLocalCount ?? states.length,
        );
        // A box's walls bleed toward its down-right neighbor along the
        // fixed oblique vector — this slot's z-index makes sure it paints
        // over that neighbor rather than under it. See
        // computeVoxelBoxZIndex.
        const zIndex = computeVoxelBoxZIndex(i, states.length, axis);

        // The straddling box (the one representing the slider's exact
        // current value) is identified by isStraddling, never popT — every
        // filled box is ALSO popT: 1, not just the straddling one (found
        // live, 2026-09-09: branching on `popT !== 1` here previously made
        // EVERY filled box take the 2-piece straddle path below, each
        // carrying a hidden, always-0-width "flat" CabinetBox along with
        // it). Every non-straddling box renders as a single, ordinary,
        // full-size CabinetBox.
        if (!state.isStraddling) {
          return (
            <CabinetBox
              key={i}
              popped={state.popT}
              boxHeight={boxSize}
              popDistance={popDistance}
              zIndex={zIndex}
              skipMountAnimation
              timelineKey={`${timelineKeyPrefix}-${i}`}
            >
              <div
                className="sc-voxel-track__fill"
                style={{ background: computeVoxelFillBackground(state.fillPercent, axis) }}
              />
            </CabinetBox>
          );
        }

        // The straddling slot never changes its own footprint or position —
        // it's always exactly boxSize, same as every other box. Internally
        // it's two adjacent CabinetBox instances, flush against each other,
        // that always sum to exactly boxSize: a fully-popped glowing piece
        // (min side) and a fully-flat dark piece (max side), matching how a
        // normal fully-filled/fully-empty box already renders elsewhere in
        // the row — replaces the old internal fill gradient with a real
        // geometric split instead of a color transition. The glow piece's
        // own size floors above zero (computeVoxelStraddleSizeFraction) so
        // it never fully disappears at value === min; the flat piece is the
        // exact remainder (boxSize - glowSize, never independently derived)
        // so the two can never drift apart from summing to boxSize, and
        // legitimately reaches zero at value === max — a fully-popped box
        // at the maximum is correct, not a bug.
        const glowSize = boxSize * computeVoxelStraddleSizeFraction(state.fillPercent);
        const flatSize = boxSize - glowSize;
        const isHorizontal = axis === 'horizontal';

        return (
          <div key={i} className="sc-voxel-track__straddle" data-axis={axis} style={{ zIndex }}>
            <CabinetBox
              popped={1}
              boxHeight={boxSize}
              popDistance={popDistance}
              frontWidth={isHorizontal ? glowSize : undefined}
              frontHeight={isHorizontal ? undefined : glowSize}
              skipMountAnimation
              timelineKey={`${timelineKeyPrefix}-${i}-glow`}
            >
              <div
                className="sc-voxel-track__fill"
                style={{ background: computeVoxelFillBackground(100, axis) }}
              />
            </CabinetBox>
            <CabinetBox
              popped={0}
              boxHeight={boxSize}
              popDistance={popDistance}
              frontWidth={isHorizontal ? flatSize : undefined}
              frontHeight={isHorizontal ? undefined : flatSize}
              skipMountAnimation
              timelineKey={`${timelineKeyPrefix}-${i}-flat`}
            >
              <div
                className="sc-voxel-track__fill"
                style={{ background: computeVoxelFillBackground(0, axis) }}
              />
            </CabinetBox>
          </div>
        );
      })}
    </div>
  );
}
