import type { CSSProperties } from 'react';
import { CabinetBox } from './CabinetBox';
import { computeVoxelFillBackground, computeVoxelStraddleSizeFraction, type VoxelBoxState } from '@/utils/voxelTrackMath';
import { VOXEL_TRACK_POP_DISTANCE } from '@/utils/cabinetGeometry';
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
 */
export function VoxelTrack({ states, boxSize, gap, axis, timelineKeyPrefix }: VoxelTrackProps) {
  const tokens = {
    '--voxel-box-size': `${boxSize}px`,
    '--voxel-gap': `${gap}px`,
  } as CSSProperties;

  return (
    <div className="sc-voxel-track" data-axis={axis} style={tokens} aria-hidden="true">
      {states.map((state, i) => {
        // The straddling box (the one representing the slider's exact
        // current value) is the only one computeVoxelBoxStates ever assigns
        // popT: 1 to. Every other box renders as a single, ordinary,
        // full-size CabinetBox — unchanged.
        if (state.popT !== 1) {
          return (
            <CabinetBox
              key={i}
              popped={state.popT}
              boxHeight={boxSize}
              popDistance={VOXEL_TRACK_POP_DISTANCE}
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
          <div key={i} className="sc-voxel-track__straddle" data-axis={axis}>
            <CabinetBox
              popped={1}
              boxHeight={boxSize}
              popDistance={VOXEL_TRACK_POP_DISTANCE}
              frontWidth={isHorizontal ? glowSize : undefined}
              frontHeight={isHorizontal ? undefined : glowSize}
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
              popDistance={VOXEL_TRACK_POP_DISTANCE}
              frontWidth={isHorizontal ? flatSize : undefined}
              frontHeight={isHorizontal ? undefined : flatSize}
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
