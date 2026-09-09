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
        // current value) is the only one that ever pops fully — see
        // computeVoxelBoxStates, which never assigns popT: 1 to any other
        // box. It renders physically smaller (along the value axis only)
        // instead of full-size with an internal fill gradient — see
        // computeVoxelStraddleSizeFraction's own derivation.
        const isStraddling = state.popT === 1;
        const straddleSize = isStraddling ? boxSize * computeVoxelStraddleSizeFraction(state.fillPercent) : undefined;
        const fillPercentForBackground = isStraddling ? 100 : state.fillPercent;

        return (
          <CabinetBox
            key={i}
            popped={state.popT}
            boxHeight={boxSize}
            popDistance={VOXEL_TRACK_POP_DISTANCE}
            frontWidth={axis === 'horizontal' ? straddleSize : undefined}
            frontHeight={axis === 'vertical' ? straddleSize : undefined}
            timelineKey={`${timelineKeyPrefix}-${i}`}
          >
            <div
              className="sc-voxel-track__fill"
              style={{ background: computeVoxelFillBackground(fillPercentForBackground, axis) }}
            />
          </CabinetBox>
        );
      })}
    </div>
  );
}
