import { describe, it, expect } from 'vitest';

import { computeCabinetGeometry } from './cabinetGeometry';

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

  it('t=1 (fully popped): front face offset is (2*height, height)', () => {
    const geo = computeCabinetGeometry(100, 48, 1);
    expect(geo.frontFaceOffsetX).toBe(96);
    expect(geo.frontFaceOffsetY).toBe(48);
  });

  it('t=1 (fully popped): wall polygons\' 3rd/4th points match the popped offset', () => {
    const geo = computeCabinetGeometry(100, 48, 1);
    expect(geo.topFacePoints).toBe('0,0 100,0 196,48 96,48');
    expect(geo.leftFacePoints).toBe('0,0 0,48 96,96 96,48');
  });

  it('t=0.5 is the exact midpoint between t=0 and t=1', () => {
    const flat = computeCabinetGeometry(100, 48, 0);
    const full = computeCabinetGeometry(100, 48, 1);
    const mid = computeCabinetGeometry(100, 48, 0.5);
    expect(mid.frontFaceOffsetX).toBe((flat.frontFaceOffsetX + full.frontFaceOffsetX) / 2);
    expect(mid.frontFaceOffsetY).toBe((flat.frontFaceOffsetY + full.frontFaceOffsetY) / 2);
    expect(mid.frontFaceOffsetX).toBe(48);
    expect(mid.frontFaceOffsetY).toBe(24);
  });

  it('is a pure function — identical arguments produce identical output', () => {
    const a = computeCabinetGeometry(120, 40, 0.3);
    const b = computeCabinetGeometry(120, 40, 0.3);
    expect(a).toEqual(b);
  });
});
