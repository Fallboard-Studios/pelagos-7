import { describe, it, expect } from 'vitest';

import {
  computeCabinetFrontFaceOffset,
  CABINET_POP_DISTANCE,
  CABINET_TOP_FACE_SKEW_DEG,
  CABINET_LEFT_FACE_SKEW_DEG,
} from './cabinetGeometry';

describe('computeCabinetFrontFaceOffset', () => {
  it('t=0 (flat): offset is (0, 0)', () => {
    const offset = computeCabinetFrontFaceOffset(0);
    expect(offset.frontFaceOffsetX).toBe(0);
    expect(offset.frontFaceOffsetY).toBe(0);
  });

  it('t=1 (fully popped): offset is (2*CABINET_POP_DISTANCE, CABINET_POP_DISTANCE) — fixed, not scaled by box height (there is no height parameter at all)', () => {
    const offset = computeCabinetFrontFaceOffset(1);
    expect(offset.frontFaceOffsetX).toBe(2 * CABINET_POP_DISTANCE);
    expect(offset.frontFaceOffsetY).toBe(CABINET_POP_DISTANCE);
  });

  it('t=0.5 is the exact midpoint between t=0 and t=1', () => {
    const flat = computeCabinetFrontFaceOffset(0);
    const full = computeCabinetFrontFaceOffset(1);
    const mid = computeCabinetFrontFaceOffset(0.5);
    expect(mid.frontFaceOffsetX).toBe((flat.frontFaceOffsetX + full.frontFaceOffsetX) / 2);
    expect(mid.frontFaceOffsetY).toBe((flat.frontFaceOffsetY + full.frontFaceOffsetY) / 2);
    expect(mid.frontFaceOffsetX).toBe(CABINET_POP_DISTANCE);
    expect(mid.frontFaceOffsetY).toBe(CABINET_POP_DISTANCE / 2);
  });

  it('is a pure function — identical arguments produce identical output', () => {
    const a = computeCabinetFrontFaceOffset(0.3);
    const b = computeCabinetFrontFaceOffset(0.3);
    expect(a).toEqual(b);
  });

  describe('popDistance override (2nd param) — per-consumer pop distance, e.g. VoxelTrack.tsx passing a deeper value than Button/Toggle', () => {
    it('defaults to CABINET_POP_DISTANCE when the 2nd argument is omitted', () => {
      const withDefault = computeCabinetFrontFaceOffset(1);
      const explicit = computeCabinetFrontFaceOffset(1, CABINET_POP_DISTANCE);
      expect(withDefault).toEqual(explicit);
    });

    it('a custom popDistance produces the same 2:1 vector at a different magnitude', () => {
      // 20 is deliberately not CABINET_POP_DISTANCE's own value (whatever it
      // currently is) — a test using the same number wouldn't be able to
      // tell "uses the 2nd argument" apart from "ignores it and falls back
      // to the constant, which happens to equal this test's own number."
      const offset = computeCabinetFrontFaceOffset(1, 20);
      expect(offset.frontFaceOffsetX).toBe(40); // 2 * 20
      expect(offset.frontFaceOffsetY).toBe(20);
    });

    it('a custom popDistance still scales linearly with t', () => {
      const offset = computeCabinetFrontFaceOffset(0.5, 20);
      expect(offset.frontFaceOffsetX).toBe(20); // 2 * 20 * 0.5
      expect(offset.frontFaceOffsetY).toBe(10); // 20 * 0.5
    });
  });
});

describe('CABINET_POP_DISTANCE / VOXEL_TRACK_POP_DISTANCE(_MIN_RATIO) — untouched by the wall-rendering rewrite', () => {
  it('CABINET_POP_DISTANCE is still a positive number', () => {
    expect(CABINET_POP_DISTANCE).toBeGreaterThan(0);
  });
});

describe('wall skew angles (roadmap 11.1.1 follow-up — compositor-driven wall rendering)', () => {
  it('CABINET_TOP_FACE_SKEW_DEG is atan(2) in degrees — the fixed angle that reproduces the 2:1 oblique vector on a scaleY(t)\'d rectangle', () => {
    expect(CABINET_TOP_FACE_SKEW_DEG).toBe(Math.atan(2) * (180 / Math.PI));
  });

  it('CABINET_LEFT_FACE_SKEW_DEG is atan(0.5) in degrees — the fixed angle that reproduces the 2:1 oblique vector on a scaleX(t)\'d rectangle', () => {
    expect(CABINET_LEFT_FACE_SKEW_DEG).toBe(Math.atan(0.5) * (180 / Math.PI));
  });

  it('the two skew angles are complementary (sum to 90°) — the top face\'s stationary edge (horizontal) and the left face\'s (vertical) are perpendicular, sharing one projection vector', () => {
    expect(CABINET_TOP_FACE_SKEW_DEG + CABINET_LEFT_FACE_SKEW_DEG).toBeCloseTo(90, 10);
  });

  it('both angles are independent of popDistance and t — they are constants, not functions', () => {
    // Sanity-check against the type system as much as the value: neither
    // constant takes an argument. This test exists mainly to document that
    // fact for a future reader, since computeCabinetFrontFaceOffset's own
    // signature is the only thing in this file that still takes t/popDistance.
    expect(typeof CABINET_TOP_FACE_SKEW_DEG).toBe('number');
    expect(typeof CABINET_LEFT_FACE_SKEW_DEG).toBe('number');
  });
});
