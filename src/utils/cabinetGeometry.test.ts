import { describe, it, expect } from 'vitest';

import { computeCabinetGeometry, CABINET_POP_DISTANCE } from './cabinetGeometry';

describe('computeCabinetGeometry', () => {
  it('t=0 (flat): front face offset is (0, 0)', () => {
    const geo = computeCabinetGeometry(100, 48, 0);
    expect(geo.frontFaceOffsetX).toBe(0);
    expect(geo.frontFaceOffsetY).toBe(0);
  });

  it('t=0 (flat): both wall polygons match the flat footprint edges exactly', () => {
    const geo = computeCabinetGeometry(100, 48, 0);
    expect(geo.topFacePoints).toBe('0,0 100,0 100,0 0,0');
    expect(geo.leftFacePoints).toBe('0,0 0,48 0,48 0,0');
  });

  it('t=1 (fully popped): front face offset is (2*CABINET_POP_DISTANCE, CABINET_POP_DISTANCE) — fixed, not scaled by height', () => {
    const geo = computeCabinetGeometry(100, 48, 1);
    expect(geo.frontFaceOffsetX).toBe(2 * CABINET_POP_DISTANCE);
    expect(geo.frontFaceOffsetY).toBe(CABINET_POP_DISTANCE);
  });

  it('t=1 offset is identical across every breakpoint\'s box height (32/40/48) — decoupled from height', () => {
    const mobile = computeCabinetGeometry(100, 32, 1);
    const tablet = computeCabinetGeometry(100, 40, 1);
    const desktop = computeCabinetGeometry(100, 48, 1);
    expect(mobile.frontFaceOffsetX).toBe(2 * CABINET_POP_DISTANCE);
    expect(mobile.frontFaceOffsetY).toBe(CABINET_POP_DISTANCE);
    expect(tablet.frontFaceOffsetX).toBe(2 * CABINET_POP_DISTANCE);
    expect(tablet.frontFaceOffsetY).toBe(CABINET_POP_DISTANCE);
    expect(desktop.frontFaceOffsetX).toBe(2 * CABINET_POP_DISTANCE);
    expect(desktop.frontFaceOffsetY).toBe(CABINET_POP_DISTANCE);
  });

  it('t=1 (fully popped): wall polygons\' 3rd/4th points match the popped offset', () => {
    const geo = computeCabinetGeometry(100, 48, 1);
    const dx = 2 * CABINET_POP_DISTANCE;
    const dy = CABINET_POP_DISTANCE;
    expect(geo.topFacePoints).toBe(`0,0 100,0 ${100 + dx},${dy} ${dx},${dy}`);
    expect(geo.leftFacePoints).toBe(`0,0 0,48 ${dx},${48 + dy} ${dx},${dy}`);
  });

  it('the flat footprint\'s own dimensions (top edge width, left edge height) still reflect the real width/height', () => {
    const geo = computeCabinetGeometry(100, 48, 1);
    // Top Face's 2nd point is the flat top-right corner: (width, 0)
    expect(geo.topFacePoints.split(' ')[1]).toBe('100,0');
    // Left Face's 2nd point is the flat bottom-left corner: (0, height)
    expect(geo.leftFacePoints.split(' ')[1]).toBe('0,48');
  });

  it('t=0.5 is the exact midpoint between t=0 and t=1', () => {
    const flat = computeCabinetGeometry(100, 48, 0);
    const full = computeCabinetGeometry(100, 48, 1);
    const mid = computeCabinetGeometry(100, 48, 0.5);
    expect(mid.frontFaceOffsetX).toBe((flat.frontFaceOffsetX + full.frontFaceOffsetX) / 2);
    expect(mid.frontFaceOffsetY).toBe((flat.frontFaceOffsetY + full.frontFaceOffsetY) / 2);
    expect(mid.frontFaceOffsetX).toBe(CABINET_POP_DISTANCE);
    expect(mid.frontFaceOffsetY).toBe(CABINET_POP_DISTANCE / 2);
  });

  it('is a pure function — identical arguments produce identical output', () => {
    const a = computeCabinetGeometry(120, 40, 0.3);
    const b = computeCabinetGeometry(120, 40, 0.3);
    expect(a).toEqual(b);
  });

  describe('popDistance override (4th param) — per-consumer pop distance, e.g. VoxelTrack.tsx passing a deeper value than Button/Toggle', () => {
    it('defaults to CABINET_POP_DISTANCE when the 4th argument is omitted', () => {
      const withDefault = computeCabinetGeometry(100, 48, 1);
      const explicit = computeCabinetGeometry(100, 48, 1, CABINET_POP_DISTANCE);
      expect(withDefault).toEqual(explicit);
    });

    it('a custom popDistance produces the same 2:1 vector at a different magnitude', () => {
      // 20 is deliberately not CABINET_POP_DISTANCE's own value (whatever it
      // currently is) — a test using the same number wouldn't be able to
      // tell "uses the 4th argument" apart from "ignores it and falls back
      // to the constant, which happens to equal this test's own number."
      const geo = computeCabinetGeometry(100, 48, 1, 20);
      expect(geo.frontFaceOffsetX).toBe(40); // 2 * 20
      expect(geo.frontFaceOffsetY).toBe(20);
    });

    it('a custom popDistance still scales linearly with t', () => {
      const geo = computeCabinetGeometry(100, 48, 0.5, 20);
      expect(geo.frontFaceOffsetX).toBe(20); // 2 * 20 * 0.5
      expect(geo.frontFaceOffsetY).toBe(10); // 20 * 0.5
    });

    it('a custom popDistance flows through to the wall polygons, not just the front-face offset', () => {
      const geo = computeCabinetGeometry(100, 48, 1, 20);
      expect(geo.topFacePoints).toBe('0,0 100,0 140,20 40,20');
      expect(geo.leftFacePoints).toBe('0,0 0,48 40,68 40,20');
    });
  });
});
