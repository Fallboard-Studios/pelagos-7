import React from 'react';
import type { ReactElement } from 'react';
import { describe, it, expect } from 'vitest';
import { deriveWindowGrid, deriveBeltCourses, renderBeltCourse, renderSquareWindows, renderPipesValvesFacade, FACADE_RENDERERS } from './facadeGreebles';
import type { GreebleRendererContext } from './greebleTypes';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EL = ReactElement<any>;

describe('deriveWindowGrid', () => {
  it('calculates square window grid correctly', () => {
    // bw=100, bh=100. unitSize = max(4, 100*0.06) = 6.
    // square: unitW=6, unitH=6.
    // gap = 6 * 0.5 = 3.
    // slot = 6 + 3 = 9.
    // cols = floor((100 - 3) / 9) = floor(97 / 9) = 10.
    // rows = floor((100 + 3) / 9) = floor(103 / 9) = 11.
    const grid = deriveWindowGrid(100, 100, 'squareWindows');
    expect(grid.cols).toBe(11);
    expect(grid.rows).toBe(11);
    expect(grid.unitW).toBe(6);
    expect(grid.unitH).toBe(6);
  });

  it('calculates wide window grid correctly', () => {
    // bw=100, bh=100. unitSize = 6.
    // wide: unitW = 6 * 2 = 12, unitH = 6 * 0.5 = 3.
    // gapX = 1 (wideWindows uses fixed gap), gapY = 3 * 0.5 = 1.5.
    // slotX = 12 + 1 = 13, slotY = 3 + 1.5 = 4.5.
    // cols = floor(101 / 13) = 7.
    // rows = floor(101.5 / 4.5) = 22.
    const grid = deriveWindowGrid(100, 100, 'wideWindows');
    expect(grid.cols).toBe(7);
    expect(grid.rows).toBe(22);
    expect(grid.unitW).toBe(12);
    expect(grid.unitH).toBe(3);
  });

  it('calculates tall window grid correctly', () => {
    // bw=100, bh=100. unitSize = 6.
    // tall: unitW = 6 * 0.5 = 3, unitH = 6 * 2 = 12.
    // gapX = 1.5, gapY = 6.
    // slotX = 4.5, slotY = 18.
    // cols = floor(101.5 / 4.5) = 22.
    // rows = floor(106 / 18) = 5.
    const grid = deriveWindowGrid(100, 100, 'tallWindows');
    expect(grid.cols).toBe(22);
    expect(grid.rows).toBe(5);
    expect(grid.unitW).toBe(3);
    expect(grid.unitH).toBe(12);
  });

  it('enforces minimum unit size of 4', () => {
    // bw=30. 30 * 0.06 = 1.8. unitSize should be 4.
    const grid = deriveWindowGrid(30, 30, 'squareWindows');
    expect(grid.unitW).toBe(4);
    expect(grid.unitH).toBe(4);
  });
});

// ========================================
// Zone-aware rendering
// ========================================

const zoneBaseCtx: GreebleRendererContext = {
  buildingWidth: 100,
  buildingHeight: 100,
  roofY: 0,
  seed: 77,
  colors: {
    body: { h: 200, s: 20, l: 25 },
    accent: { h: 180, s: 50, l: 45 },
    greeble: { h: 180, s: 30, l: 35 },
    illuminated: { h: 180, s: 60, l: 70 },
  },
  lMultiplier: 1,
};

describe('zone-aware renderSquareWindows', () => {
  it('without zoneY/zoneHeight, windows can start near y=0', () => {
    const el = renderSquareWindows(zoneBaseCtx) as EL;
    const children = React.Children.toArray(el.props.children) as EL[];
    // At least some windows should be in the upper half
    const hasUpperWindows = children.some((c) => (c.props.y as number) < 50);
    expect(hasUpperWindows).toBe(true);
  });

  it('windows respect zoneY offset — no window starts above zoneY', () => {
    const zoneY = 40;
    const ctx: GreebleRendererContext = {
      ...zoneBaseCtx,
      zoneY,
      zoneHeight: 30,
      seed: 1,  // seed that reliably generates some windows
    };
    const el = renderSquareWindows(ctx) as EL;
    const children = React.Children.toArray(el.props.children) as EL[];
    // all windows must start at or below zoneY
    for (const child of children) {
      expect(child.props.y as number).toBeGreaterThanOrEqual(zoneY);
    }
  });

  it('windows confined within zoneY + zoneHeight', () => {
    const zoneY = 20;
    const zoneHeight = 25;
    const ctx: GreebleRendererContext = {
      ...zoneBaseCtx,
      zoneY,
      zoneHeight,
      seed: 2,
    };
    // Use all-windows-spawn threshold by mocking seed to yield all prng < 0.4
    const el = renderSquareWindows(ctx) as EL;
    const children = React.Children.toArray(el.props.children) as EL[];
    for (const child of children) {
      const y = child.props.y as number;
      const h = child.props.height as number;
      expect(y + h).toBeLessThanOrEqual(zoneY + zoneHeight + 2); // +2 for unitH rounding
    }
  });

  it('zone seed offset produces different layout than full-facade seed', () => {
    const fullCtx = { ...zoneBaseCtx, seed: 999 };
    const zoneCtx: GreebleRendererContext = { ...zoneBaseCtx, seed: 999 + 1000, zoneY: 0, zoneHeight: 50 };
    const elFull = renderSquareWindows(fullCtx) as EL;
    const elZone = renderSquareWindows(zoneCtx) as EL;
    const fullCount = React.Children.count(elFull.props.children);
    const zoneCount = React.Children.count(elZone.props.children);
    // zone has fewer grid slots (smaller height) so typically fewer windows
    expect(zoneCount).toBeLessThanOrEqual(fullCount);
  });


});


const beltCtx: GreebleRendererContext = {
  buildingWidth: 100,
  buildingHeight: 270,
  roofY: 0,
  seed: 42,
  colors: {
    body: { h: 200, s: 20, l: 25 },
    accent: { h: 180, s: 50, l: 45 },
    greeble: { h: 180, s: 30, l: 35 },
    illuminated: { h: 180, s: 60, l: 70 },
  },
  lMultiplier: 0.8,
};

describe('deriveBeltCourses', () => {
  it('returns 0 for buildings shorter than threshold (80px)', () => {
    expect(deriveBeltCourses(80)).toBe(0);
  });

  it('returns 1 for a building exactly at threshold (90px)', () => {
    expect(deriveBeltCourses(90)).toBe(1);
  });

  it('returns 2 for 180px', () => {
    expect(deriveBeltCourses(180)).toBe(2);
  });

  it('returns 3 for 270px', () => {
    expect(deriveBeltCourses(270)).toBe(3);
  });

  it('increases proportionally with height', () => {
    const count1 = deriveBeltCourses(450);
    const count2 = deriveBeltCourses(900);
    expect(count2).toBe(count1 * 2);
  });
});

describe('renderBeltCourse', () => {
  it('returns null for buildings too short to have a course', () => {
    const result = renderBeltCourse({ ...beltCtx, buildingHeight: 80 });
    expect(result).toBeNull();
  });

  it('renders the correct number of course rects', () => {
    // bh=270: deriveBeltCourses(270) === 3
    const el = renderBeltCourse(beltCtx) as EL;
    expect(React.isValidElement(el)).toBe(true);
    const children = React.Children.toArray(el.props.children) as EL[];
    expect(children).toHaveLength(3);
  });

  it('each course spans the full building width', () => {
    const el = renderBeltCourse(beltCtx) as EL;
    const children = React.Children.toArray(el.props.children) as EL[];
    for (const course of children) {
      expect(course.props.width).toBe(beltCtx.buildingWidth);
    }
  });

  it('each course height is 2–3% of building height', () => {
    const el = renderBeltCourse(beltCtx) as EL;
    const children = React.Children.toArray(el.props.children) as EL[];
    for (const course of children) {
      const h: number = course.props.height;
      expect(h).toBeGreaterThanOrEqual(beltCtx.buildingHeight * 0.02);
      expect(h).toBeLessThanOrEqual(beltCtx.buildingHeight * 0.03);
    }
  });

  it('is deterministic (same seed produces same output)', () => {
    const el1 = renderBeltCourse(beltCtx) as EL;
    const el2 = renderBeltCourse(beltCtx) as EL;
    const c1 = React.Children.toArray(el1.props.children) as EL[];
    const c2 = React.Children.toArray(el2.props.children) as EL[];
    expect(c1[0].props.height).toBeCloseTo(c2[0].props.height);
    expect(c1[0].props.y).toBeCloseTo(c2[0].props.y);
  });
});

// ========================================
// pipesValvesFacade tests
// ========================================

describe('renderPipesValvesFacade', () => {
  it('registry contains pipesValves', () => {
    const keys = Object.keys(FACADE_RENDERERS);
    expect(keys).toContain('pipesValves');
  });

  it('produces elements touching roofY or edges', () => {
    const ctx: GreebleRendererContext = { ...zoneBaseCtx, zoneY: 0, zoneHeight: 100, seed: 123 };
    const el = renderPipesValvesFacade(ctx) as EL;
    const kids = React.Children.toArray(el.props.children) as EL[];
    expect(kids.length).toBeGreaterThan(0);
    const hasEdge = kids.some((c) => {
      const { x, y } = c.props;
      return x === 2 || x === ctx.buildingWidth - 4 || y === (ctx.zoneY ?? 0) + 1;
    });
    expect(hasEdge).toBe(true);
    // saturation should be 15 lower than original greeble color
    const baseSat = ctx.colors.greeble.s;
    const fills = kids.filter(c => c.props.fill).map(c => c.props.fill as string);
    fills.forEach(f => {
      const m = f.match(/hsl\([^,]+,\s*([0-9.]+)%/);
      if (m) {
        const sat = parseFloat(m[1]);
        expect(sat).toBeCloseTo(Math.max(0, baseSat - 15), 1);
      }
    });

    // when frontCornerX is specified, all vertical pipes should appear on
    // the corresponding side only; verify with a second context.
    const ctx2: GreebleRendererContext = { ...ctx, frontCornerX: 30 };
    const el2 = renderPipesValvesFacade(ctx2) as EL;
    const kids2 = React.Children.toArray(el2.props.children) as EL[];
    const sides = new Set(kids2
      .filter(c => c.type === 'rect' && c.props.height > c.props.width)
      .map(c => c.props.x === 2 ? 'left' : c.props.x === ctx2.buildingWidth - 4 ? 'right' : 'none'));
    expect(sides.size).toBeLessThanOrEqual(1);

    // ensure at least some seeds yield two-sided runs
    const twoSided = Array.from({ length: 8 }, (_, j) => {
      const e = renderPipesValvesFacade({ ...ctx2, seed: 400 + j }) as EL;
      const k = React.Children.toArray(e.props.children) as EL[];
      const set = new Set(k
        .filter(c => c.type === 'rect' && c.props.height > c.props.width)
        .map(c => (c.props.x === 2 ? 'left' : 'right')));
      return set.size === 2;
    });
    expect(twoSided.some(Boolean)).toBe(true);

    // horizontal pieces must stay within the selected facade top edge
    const horizontals = kids2.filter(c => c.type === 'rect' && c.props.width > 2);
    horizontals.forEach(h => {
      const { x, width } = h.props;
      if (ctx2.frontCornerX! < ctx2.buildingWidth / 2) {
        // left facade: x+width should not cross corner
        expect(x + width).toBeLessThanOrEqual(ctx2.frontCornerX! + 1);
      } else {
        // right facade: x should not be left of corner
        expect(x).toBeGreaterThanOrEqual(ctx2.frontCornerX! - 1);
      }
    });
  });
});
